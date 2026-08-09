/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 *
 * Multi-format conversion IPC handler.
 */

import { ipcMain, BrowserWindow, app } from "electron"
import { readFile, writeFile, rm } from "fs/promises"
import { join, dirname, extname, basename, resolve, relative, isAbsolute, sep } from "path"
import { existsSync, mkdirSync, mkdtempSync, statSync } from "fs"
import { createHash, randomUUID } from "crypto"
import { tmpdir } from "os"
import * as ncm from "../../core/ncmDecrypt"
import * as decoders from "../../core/decoders"
import { writeID3Tags } from "../../core/id3Writer"
import { renderFilenameTemplate, deriveMetadataFromFilename } from "../../core/template"
import { run, runFfmpeg, FfmpegOptions, extractLyrics } from "../ffmpeg"
import { HistoryStore } from "../history"
import { settingsStore } from "./settings"
import { isEncryptedExt, isPlainAudioExt, OUTPUT_FORMATS } from '../../core/supportedFormats'
import { loadKeysMap } from '../kggKeys'
import { memoryKeyProvider } from '../../core/decoders/kgg'

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

interface PendingConversion {
  controller: AbortController
  filePath: string
}

// 以转换任务 ID（uuid）为 key：同一路径并发/重复转换时各自持有独立的
// AbortController，取消一个不会误杀另一个（L1）。
const pendingConversions = new Map<string, PendingConversion>()
const historyStore = new HistoryStore(app.getPath("userData"))

// 输出格式白名单：与 ffmpeg.ts 的 FfmpegOptions["format"] 保持一致，
// 并收敛到 supportedFormats.ts 的 OUTPUT_FORMATS（单一事实源）。
// 渲染进程传入的 outputFormat 在运行时必须落在白名单内，防止通过
// 格式字符串（如 `../x`、`/tmp/x`）构成路径穿越。`source` 表示保持
// 源格式，会被替换为源格式后再次校验。
const ALLOWED_OUTPUT_FORMATS = new Set<string>(["source", ...OUTPUT_FORMATS])

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function registerConvertHandlers(getMainWindow: () => BrowserWindow | null): void {
  // ---- lyrics:extract ----
  ipcMain.handle("lyrics:extract", async (_event, filePath: string): Promise<string | null> => {
    return extractLyrics(filePath)
  })

  // ---- convert:cancelAll ----
  ipcMain.handle("convert:cancelAll", async (): Promise<void> => {
    for (const { controller } of pendingConversions.values()) {
      controller.abort()
    }
    pendingConversions.clear()
  })

  // ---- convert:cancel ----
  ipcMain.handle("convert:cancel", async (_event, filePath: string): Promise<void> => {
    for (const [taskId, entry] of pendingConversions) {
      if (entry.filePath === filePath) {
        entry.controller.abort()
        pendingConversions.delete(taskId)
      }
    }
  })

  // ---- convert:file ----
  ipcMain.handle(
    "convert:file",
    async (
      _event,
      payload: {
        filePath: string
        outputDir: string
        filenameTemplate: string
        outputFormat: string
        duplicateAction: string
        // Quality settings (optional, from AppSettings)
        bitrate?: string
        vbrEnabled?: boolean
        vbrQuality?: number
        compressionLevel?: number
        sampleRate?: string
        bitDepth?: string
        // 手动指定的歌词文件路径（可选，来自渲染进程 FileEntry.lyricsPath）
        lyricsPath?: string
      }
    ): Promise<{
      success: boolean
      outputPath?: string
      format?: string
      songName?: string
      artist?: string
      album?: string
      coverImageBase64?: string
      encrypted?: boolean
      verified?: boolean
      errorMessage?: string
    }> => {
      const startTime = Date.now()
      const controller = new AbortController()
      const { filePath } = payload
      const taskId = randomUUID()
      let tempDir: string | null = null
      // Hoisted so the catch block can enrich error messages with decrypt context
      let isEncrypted = false
      let decryptionVerified = true

      pendingConversions.set(taskId, { controller, filePath })

      try {
        const {
          outputDir,
          filenameTemplate,
          outputFormat = "source",
          duplicateAction = "rename",
          bitrate = settingsStore.store.bitrate,
          vbrEnabled = settingsStore.store.vbrEnabled,
          vbrQuality = settingsStore.store.vbrQuality,
          compressionLevel = settingsStore.store.compressionLevel,
          sampleRate = settingsStore.store.sampleRate,
          bitDepth = settingsStore.store.bitDepth
        } = payload

        const win = getMainWindow()

        const sendProgress = (progress: number): void => {
          if (win && !win.isDestroyed()) {
            win.webContents.send("convert:progress", { filePath, progress })
          }
        }

        /**
         * Write cover image to a temp file and return its path, or null.
         */
        async function writeCoverTemp(image: Uint8Array, targetDir: string): Promise<string | null> {
          if (!image || image.length === 0) return null
          const ext = detectImageMime(image) === "image/png" ? "png" : "jpg"
          const coverPath = join(targetDir, `cover.${ext}`)
          await writeFile(coverPath, Buffer.from(image))
          return coverPath
        }

        sendProgress(0.05)

        const ext = extname(filePath).toLowerCase()
        isEncrypted = isEncryptedExt(ext)
        const isPlainAudio = isPlainAudioExt(ext)

        if (!isEncrypted && !isPlainAudio) {
          return { success: false, errorMessage: `Unsupported file format: ${ext}` }
        }

        const fileBuffer = await readFile(filePath)
        sendProgress(0.1)

        const data = new Uint8Array(fileBuffer.buffer)

        let audio: Uint8Array
        let sourceFormat: string
        let songName = "Unknown"
        let artist = "Unknown"
        let album = "Unknown"
        let coverImage: Uint8Array | null = null

        // --- Decryption path (encrypted formats) ---
        if (isEncrypted) {
          if (ext === ".ncm") {
            const result = await ncm.parseNCM(fileBuffer.buffer, {
              onProgress: (p) => sendProgress(0.1 + p * 0.5)
            })
            audio = result.audioData
            sourceFormat = result.format.ext
            songName = result.songName
            artist = result.artist
            album = result.album
            coverImage = result.image
          } else {
            // KGG 解密需要 keyProvider：每次转换时从 userData 下的 kgg.keys
            // 重新加载密钥（用户可能通过设置面板导入/扫描更新密钥）。
            // 仅当源文件是 KGG 时才加载，避免无关格式的多余磁盘 I/O。
            const kggKeysPath = join(app.getPath("userData"), "kgg.keys")
            const keyMap = existsSync(kggKeysPath) ? loadKeysMap(kggKeysPath) : new Map<string, string>()
            const result = decoders.decryptBuffer(ext, data, {
              ekey: settingsStore.store.qmcEkey,
              keyProvider: memoryKeyProvider(keyMap)
            })
            audio = result.audio
            sourceFormat = result.format
            if (result.songName) songName = result.songName
            if (result.artist) artist = result.artist
            if (result.album) album = result.album
            if (result.imageData) coverImage = result.imageData
          }
        } else {
          // --- Plain audio path ---
          sourceFormat = ext.slice(1) // remove leading "."
          audio = data
          // Use filename as fallback title when no metadata is available
          songName = basename(filePath, ext)
        }

        // --- Fallback: encrypted cache formats (KGM/KWM/QMC/NCM with empty
        // metadata) often carry no embedded tags → derive artist/title from
        // the source filename so outputs aren't "Unknown - Unknown".
        if (!songName || songName === "Unknown") {
          const stem = basename(filePath, ext)
          const derived = deriveMetadataFromFilename(stem)
          if (derived) {
            artist = derived.artist
            songName = derived.title
          } else {
            songName = stem
          }
        }

        // Verify decrypted audio header integrity
        decryptionVerified = verifyAudioHeader(audio, sourceFormat)
        // Compute integrity hash of decrypted audio data
        const audioHash = createHash('md5').update(Buffer.from(audio)).digest('hex')

        sendProgress(0.6)

        // --- Determine effective output format ---
        const effectiveFormat = outputFormat === "source" ? sourceFormat : outputFormat

        // 安全加固：输出格式运行时白名单校验。outputFormat 来自渲染进程
        // （可被恶意 settings.json 注入），必须确认其落在合法格式集合内，
        // 防止 `../x`、`/tmp/x` 等含路径分隔符的字符串越界写出。
        if (!ALLOWED_OUTPUT_FORMATS.has(effectiveFormat)) {
          return { success: false, errorMessage: `Unsupported output format: ${outputFormat}` }
        }

        // --- Generate output filename ---
        const outputFileName = renderFilenameTemplate(filenameTemplate, {
          artist,
          title: songName,
          album
        })
        const outputFileNameWithExt = outputFileName + "." + effectiveFormat
        let outputPath = join(outputDir, outputFileNameWithExt)

        // 安全加固：输出路径必须位于 outputDir 之内（防御性兜底）。
        // 即使模板净化被绕过，join 后的路径一旦 resolve 到 outputDir 之外
        // 也直接拒绝，杜绝任意文件写入。用 path.relative 判定而非
        // startsWith(dir + sep)：后者在 outputDir 为盘符根目录（如 `D:\`）
        // 时会因拼接出 `D:\\` 而误拒 `D:\file.flac` 这类合法路径。
        const resolvedOutputDir = resolve(outputDir)
        const resolvedOutputPath = resolve(outputPath)
        const rel = relative(resolvedOutputDir, resolvedOutputPath)
        if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
          return { success: false, errorMessage: "Output path escapes the output directory" }
        }

        const outputDirPath = dirname(outputPath)
        if (!existsSync(outputDirPath)) {
          mkdirSync(outputDirPath, { recursive: true })
        }

        // Handle duplicate files
        const extWithDot = "." + effectiveFormat
        const basePath = outputPath.slice(0, -extWithDot.length)
        if (duplicateAction === "skip" && existsSync(outputPath)) {
          historyStore.append({
            ts: Date.now(),
            inputPath: filePath,
            inputName: basename(filePath),
            targetFormat: effectiveFormat,
            status: "failed",
            outputName: null,
            outputPath: null,
            durationMs: Date.now() - startTime,
            error: "File already exists"
          })
          return { success: false, errorMessage: "File already exists" }
        } else if (duplicateAction === "rename") {
          let counter = 1
          while (existsSync(outputPath)) {
            outputPath = basePath + " (" + counter + ")" + extWithDot
            counter++
          }
        }

        sendProgress(0.65)

        // --- Detect lyrics to embed ---
        // 优先级：用户手动指定的歌词文件（payload.lyricsPath，不依赖
        // embedCompanionLyrics 开关）> 同目录同名 .lrc/.txt 自动匹配。
        // 未指定且开关关闭时保持原行为（不嵌入歌词）。
        let companionLyrics: string | null = null
        if (payload.lyricsPath && payload.lyricsPath.length > 0) {
          if (existsSync(payload.lyricsPath)) {
            companionLyrics = sanitizeLyrics(await readFile(payload.lyricsPath, 'utf-8'))
          }
        } else if (settingsStore.store.embedCompanionLyrics) {
          const basePath = filePath.replace(/\.[^.]+$/, '')
          const lrcPath = basePath + '.lrc'
          const txtPath = basePath + '.txt'
          if (existsSync(lrcPath)) {
            companionLyrics = sanitizeLyrics(await readFile(lrcPath, 'utf-8'))
          } else if (existsSync(txtPath)) {
            companionLyrics = sanitizeLyrics(await readFile(txtPath, 'utf-8'))
          }
        }

        // --- Build metadata for FFmpeg ---
        const ffmpegMetadata: Record<string, string> = {}
        if (songName && songName !== "Unknown") ffmpegMetadata.title = songName
        if (artist && artist !== "Unknown") ffmpegMetadata.artist = artist
        if (album && album !== "Unknown") ffmpegMetadata.album = album

        // --- Transcode via FFmpeg if target format differs from source ---
        if (effectiveFormat !== sourceFormat) {
          tempDir = mkdtempSync(join(tmpdir(), "fc-convert-"))
          const tempInputPath = join(tempDir, "input." + sourceFormat)
          await writeFile(tempInputPath, Buffer.from(audio))

          // Write cover image to temp file if available
          let coverPath: string | null = null
          if (coverImage) {
            try { coverPath = await writeCoverTemp(coverImage, tempDir) } catch { /* non-fatal */ }
          }

          const ffmpegOpts: FfmpegOptions = {
            format: effectiveFormat as FfmpegOptions["format"],
            onProgress: (p: number): void => {
              sendProgress(0.65 + p * 0.33)
            },
            signal: controller.signal,
            metadata: Object.keys(ffmpegMetadata).length > 0 ? ffmpegMetadata : undefined,
            coverImagePath: coverPath ?? undefined,
            lyrics: companionLyrics ?? undefined,
            loudnormEnabled: settingsStore.store.loudnormEnabled,
            loudnormTarget: settingsStore.store.loudnormTarget
          }

          if (bitrate) ffmpegOpts.bitrate = bitrate
          if (vbrEnabled != null) {
            if (effectiveFormat === "opus") {
              ffmpegOpts.vbr = vbrEnabled ? 1 : 0
            } else {
              ffmpegOpts.vbr = vbrEnabled ? (vbrQuality ?? 0) : null
            }
          }
          if (compressionLevel != null) ffmpegOpts.compressionLevel = compressionLevel
          if (sampleRate && sampleRate !== "original") ffmpegOpts.sampleRate = parseInt(sampleRate, 10)
          if (bitDepth && bitDepth !== "original") ffmpegOpts.bitDepth = parseInt(bitDepth, 10)

          await run(tempInputPath, outputPath, ffmpegOpts)
        } else {
          // --- Direct copy (same format, no transcoding) ---
          if (sourceFormat === "mp3" && !companionLyrics) {
            // For MP3 without lyrics: use the fast manual ID3 tag writer (prepends tags to raw data)
            // writeID3Tags does not support lyrics embedding, so when companionLyrics
            // is present we fall through to the FFmpeg remux path below.
            const audioWithTags = writeID3Tags(
              {
                title: songName,
                artist,
                album,
                image: coverImage
                  ? { imageBuffer: coverImage, mime: detectImageMime(coverImage) }
                  : undefined
              },
              audio
            )
            await writeFile(outputPath, Buffer.from(audioWithTags))
          } else if (coverImage || Object.keys(ffmpegMetadata).length > 0 || companionLyrics) {
            // For non-MP3 formats (FLAC, OGG, etc.) with metadata: use FFmpeg to remux
            // with metadata without re-encoding (-c copy).
            tempDir = mkdtempSync(join(tmpdir(), "fc-convert-"))
            const tempInputPath = join(tempDir, "input." + sourceFormat)
            await writeFile(tempInputPath, Buffer.from(audio))

            let coverPath: string | null = null
            if (coverImage) {
              try { coverPath = await writeCoverTemp(coverImage, tempDir) } catch { /* non-fatal */ }
            }

            const args: string[] = ['-y', '-i', tempInputPath]

            if (coverPath) {
              // Cover image as second input stream
              args.push('-i', coverPath)
              // Explicit stream mapping: audio from first input, cover from second
              args.push('-map', '0:a', '-map', '1:0', '-disposition:v', 'attached_pic')
            } else {
              args.push('-map', '0:a')
            }
            args.push('-map_metadata', '-1')

            if (sourceFormat === "mp3" || sourceFormat === "m4a" || sourceFormat === "aac") {
              args.push('-write_id3v2', '1')
            }

            for (const [key, value] of Object.entries(ffmpegMetadata)) {
              if (value) args.push('-metadata', `${key}=${value}`)
            }

            if (companionLyrics) {
              args.push('-metadata', `lyrics=${companionLyrics}`)
            }

            args.push('-c', 'copy', outputPath)

            await runFfmpeg(args, { signal: controller.signal })
          } else {
            // No metadata to write — just dump the raw audio
            await writeFile(outputPath, Buffer.from(audio))
          }
        }

        sendProgress(1.0)

        // Verify output file integrity
        const outputVerified = existsSync(outputPath) && statSync(outputPath).size > 0

        let coverImageBase64: string | undefined
        if (coverImage) {
          coverImageBase64 = Buffer.from(coverImage).toString("base64")
        }

        // Record success to history
        historyStore.append({
          ts: Date.now(),
          inputPath: filePath,
          inputName: basename(filePath),
          targetFormat: effectiveFormat,
          status: "success",
          outputName: outputFileNameWithExt,
          outputPath,
          durationMs: Date.now() - startTime,
          error: null
        })

        return {
          success: true,
          outputPath,
          format: effectiveFormat,
          songName,
          artist,
          album,
          coverImageBase64,
          encrypted: isEncrypted,
          verified: decryptionVerified && outputVerified
        }
      } catch (error) {
        let message = error instanceof Error ? error.message : "Unknown error"

        // For encrypted formats that produced an invalid audio header, the
        // failure is almost always a corrupt/truncated source file or a
        // wrong decryption key — append a human-readable hint to the raw
        // error so users aren't left staring at cryptic ffmpeg output.
        if (isEncrypted && !decryptionVerified) {
          message += " The source file appears to be corrupt or may require a decryption key."
        }

        // Record failure to history
        historyStore.append({
          ts: Date.now(),
          inputPath: filePath,
          inputName: basename(filePath),
          targetFormat: "unknown",
          status: "failed",
          outputName: null,
          outputPath: null,
          durationMs: Date.now() - startTime,
          error: message
        })

        return {
          success: false,
          verified: false,
          errorMessage: message
        }
      } finally {
        pendingConversions.delete(taskId)
        // Clean up temp directory if one was created
        if (tempDir) {
          try {
            await rm(tempDir, { recursive: true, force: true })
          } catch {
            // Temp cleanup failure is non-fatal
          }
        }
      }
    }
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function detectImageMime(image: Uint8Array): string {
  if (image.length < 2) return "image/jpeg"
  if (image[0] === 0xff && image[1] === 0xd8) return "image/jpeg"
  if (image[0] === 0x89 && image[1] === 0x50) return "image/png"
  return "image/jpeg"
}

/**
 * Sanitize lyrics text before embedding into metadata tags.
 * Strips control characters (except \n and \t) that would pollute
 * ID3/Vorbis tags, and normalizes \r\n → \n.
 */
function sanitizeLyrics(lyrics: string): string {
  return lyrics
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
}

/**
 * Verify decrypted audio header integrity by checking magic bytes
 * for common audio formats. Returns true if header looks valid.
 */
function verifyAudioHeader(audio: Uint8Array, format: string): boolean {
  if (audio.length < 16) return false
  switch (format) {
    case 'flac':
      // FLAC magic: fLaC at offset 0
      return audio[0] === 0x66 && audio[1] === 0x4c && audio[2] === 0x61 && audio[3] === 0x43
    case 'mp3':
      // MP3 sync word: 0xFF 0xFB or 0xFF 0xFx or 0xFF 0xEx
      return audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0
    case 'ogg':
    case 'opus':
      // OGG magic: OggS at offset 0
      return audio[0] === 0x4f && audio[1] === 0x67 && audio[2] === 0x67 && audio[3] === 0x53
    case 'wav':
      // WAV/RIFF: RIFFxxxxWAVE
      return audio[0] === 0x52 && audio[1] === 0x49 && audio[2] === 0x46 && audio[3] === 0x46
    case 'aiff':
      // AIFF: FORM
      return audio[0] === 0x46 && audio[1] === 0x4f && audio[2] === 0x52 && audio[3] === 0x4d
    case 'm4a':
    case 'aac':
    case 'alac':
      // MP4/ISO base: ftyp box at offset 4, or AAC ADTS header
      if (audio[4] === 0x66 && audio[5] === 0x74 && audio[6] === 0x79 && audio[7] === 0x70) return true
      // AAC ADTS: 0xFF 0xFx
      if (audio[0] === 0xff && (audio[1] & 0xf0) === 0xf0) return true
      return false
    default:
      // Unknown format - assume valid
      return true
  }
}


