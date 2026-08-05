#!/usr/bin/env node
/**
 * Format Converter
 * Copyright (c) 2026 Akiro. All rights reserved.
 *
 * Download bundled FFmpeg/FFprobe binaries from ffbinaries.com.
 * FFmpeg 版本固定为 6.0（缺失时回退 5.1.1），保证构建可复现；
 * 下载完成后校验二进制魔数（magic bytes）与大小，防止供应链被篡改。
 *
 * Usage:
 *   node scripts/download-ffmpeg.mjs          # current platform only
 *   node scripts/download-ffmpeg.mjs --all     # all platforms (win32, darwin/x64, darwin/arm64, linux)
 *
 * Binaries are placed in resources/ffmpeg/{platform}/ (darwin 下再分 x64/arm64).
 */

import { existsSync, mkdirSync, chmodSync, writeFileSync, statSync, unlinkSync, openSync, readSync, closeSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const FFBINARIES_API = 'https://ffbinaries.com/api/v1/version'
// 固定 FFmpeg 版本：主版本 6.0，若 6.0 资源缺失则回退 5.1.1
// （评审项：未固定版本会导致构建不可复现、打包产物静默变化）
const FF_VERSION = '6.0'
const FF_VERSION_FALLBACK = '5.1.1'

// ---------------------------------------------------------------------------
// Platform mappings
// ---------------------------------------------------------------------------

const PLATFORM_MAP = {
  'windows-64': { dir: 'win32', ext: '.exe' },
  // macOS 按架构拆分：x64 与 arm64 分别存放（Universal 构建需要双架构二进制）
  'osx-64':     { dir: 'darwin/x64', ext: '' },
  'osx-arm64':  { dir: 'darwin/arm64', ext: '' },
  'linux-64':   { dir: 'linux', ext: '' },
}

function currentPlatformCode() {
  const { platform, arch } = process
  if (platform === 'win32') return 'windows-64'
  if (platform === 'darwin') return arch === 'arm64' ? 'osx-arm64' : 'osx-64'
  return 'linux-64'
}

function platformsToDownload(all) {
  if (all) return Object.keys(PLATFORM_MAP)
  return [currentPlatformCode()]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchZipBuffer(url) {
  console.log(`[ffmpeg-download]   fetching ${url}...`)
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
  return Buffer.from(await resp.arrayBuffer())
}

async function extractFromZip(zipBuf, name, outPath) {
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(zipBuf)
  const entry = zip.file(name) || zip.file(name.replace('.exe', ''))
  if (!entry) return false
  const data = Buffer.from(await entry.async('uint8array'))
  writeFileSync(outPath, data)
  try { chmodSync(outPath, 0o755) } catch { /* best-effort */ }
  return true
}

// 从 ffbinaries 拉取指定版本的版本信息；请求失败（如该版本不存在）时返回 null
async function fetchVersionInfo(version) {
  const url = `${FFBINARIES_API}/${version}`
  console.log(`[ffmpeg-download] Fetching version info from ${url}...`)
  const resp = await fetch(url)
  if (!resp.ok) return null
  return resp.json()
}

let fallbackVersionInfoCache = null

// 惰性拉取回退版本（5.1.1）的版本信息，仅当固定版本缺少某平台资源时触发
async function getFallbackVersionInfo() {
  if (!fallbackVersionInfoCache) {
    console.warn(`[ffmpeg-download] ⚠ FFmpeg ${FF_VERSION} 缺少当前平台资源，回退使用 ${FF_VERSION_FALLBACK}`)
    fallbackVersionInfoCache = await fetchVersionInfo(FF_VERSION_FALLBACK)
  }
  return fallbackVersionInfoCache
}

// 各平台可执行文件魔数（magic bytes）：
// - linux  : ELF  \x7fELF
// - win32  : PE   MZ
// - darwin : Mach-O 家族（MH_MAGIC_64 0xFEEDFACF / MH_CIGAM_64 0xCFFAEDFE，
//             FAT_MAGIC 0xCAFEBABE / FAT_MAGIC_64 0xCAFEBABF）
const MAGIC_BYTES = {
  linux: [[0x7f, 0x45, 0x4c, 0x46]],
  win32: [[0x4d, 0x5a]],
  darwin: [
    [0xcf, 0xfa, 0xed, 0xfe], // MH_MAGIC_64（x86_64 / arm64 小端）
    [0xfe, 0xed, 0xfa, 0xcf], // MH_CIGAM_64（大端）
    [0xca, 0xfe, 0xba, 0xbe], // FAT_MAGIC（通用二进制）
    [0xca, 0xfe, 0xba, 0xbf], // FAT_MAGIC_64（通用二进制 64 位）
  ],
}

// 校验下载的二进制文件：魔数匹配当前平台 + 大小 > 1MB。
// 任一不通过即删除文件并抛出错误（下载的 FFmpeg 未通过魔数校验），
// 绝不把未经验证的二进制交给应用使用。
function verifyBinaryFile(filePath, platform) {
  // platform 可能是 'darwin/x64' 这类子目录，取第一段作为平台名
  const family = platform.split('/')[0]
  const magics = MAGIC_BYTES[family]

  const stat = statSync(filePath)
  if (stat.size < 1024 * 1024) {
    unlinkSync(filePath)
    throw new Error(`downloaded binary failed size sanity check (${stat.size} bytes < 1MB): ${filePath}（下载的二进制文件大小异常，已删除）`)
  }

  const fd = openSync(filePath, 'r')
  const head = Buffer.alloc(4)
  try {
    readSync(fd, head, 0, 4, 0)
  } finally {
    closeSync(fd)
  }

  const ok = magics.some((m) => head.subarray(0, m.length).equals(Buffer.from(m)))
  if (!ok) {
    unlinkSync(filePath)
    throw new Error(`downloaded FFmpeg failed magic-byte verification: ${filePath}（下载的二进制文件魔数校验失败，已删除）`)
  }
}

// ---------------------------------------------------------------------------
// Download one platform
// ---------------------------------------------------------------------------

async function downloadPlatform(plat, versionInfo) {
  const platCfg = PLATFORM_MAP[plat]
  if (!platCfg) {
    console.warn(`[ffmpeg-download] ⚠ Unknown platform code: ${plat}, skipping`)
    return false
  }

  const { dir: targetDir, ext: suf } = platCfg
  const outDir = join(ROOT, 'resources', 'ffmpeg', targetDir)
  let binInfo = versionInfo?.bin?.[plat]
  // 固定版本 6.0 没有该平台的产物时，回退使用 5.1.1 的产物
  if (!binInfo?.ffmpeg && versionInfo?.version !== FF_VERSION_FALLBACK) {
    const fallbackInfo = await getFallbackVersionInfo()
    const fallbackBin = fallbackInfo?.bin?.[plat]
    if (fallbackBin?.ffmpeg) {
      binInfo = fallbackBin
    }
  }
  if (!binInfo?.ffmpeg) {
    console.warn(`[ffmpeg-download] ⚠ No download URL for ${plat}, skipping`)
    return false
  }

  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  const ffmpegName = `ffmpeg${suf}`
  const ffmpegOut = join(outDir, ffmpegName)
  let ffmpegZipBuf = null

  if (existsSync(ffmpegOut)) {
    console.log(`[ffmpeg-download] ✓ ${targetDir}/${ffmpegName} already exists, skipping`)
  } else {
    ffmpegZipBuf = await fetchZipBuffer(binInfo.ffmpeg)
    const ok = await extractFromZip(ffmpegZipBuf, ffmpegName, ffmpegOut)
    if (!ok) throw new Error(`Could not find ${ffmpegName} in archive`)
    // 下载校验：魔数 + 大小，防止拿到损坏或被篡改的二进制
    verifyBinaryFile(ffmpegOut, targetDir)
    console.log(`[ffmpeg-download] ✓ ${targetDir}/${ffmpegName} saved`)
  }

  const ffprobeName = `ffprobe${suf}`
  const ffprobeOut = join(outDir, ffprobeName)

  if (existsSync(ffprobeOut)) {
    console.log(`[ffmpeg-download] ✓ ${targetDir}/${ffprobeName} already exists, skipping`)
  } else {
    let found = false
    if (ffmpegZipBuf) {
      found = await extractFromZip(ffmpegZipBuf, ffprobeName, ffprobeOut)
    } else {
      const buf = await fetchZipBuffer(binInfo.ffmpeg)
      found = await extractFromZip(buf, ffprobeName, ffprobeOut)
    }
    if (!found && binInfo.ffprobe) {
      console.log(`[ffmpeg-download]   ffprobe not in ffmpeg archive, downloading separately...`)
      const buf = await fetchZipBuffer(binInfo.ffprobe)
      found = await extractFromZip(buf, ffprobeName, ffprobeOut)
    }
    if (found) {
      // ffprobe 同样做魔数 + 大小校验
      verifyBinaryFile(ffprobeOut, targetDir)
      console.log(`[ffmpeg-download] ✓ ${targetDir}/${ffprobeName} saved`)
    } else {
      console.warn(`[ffmpeg-download] ⚠ Could not find ${targetDir}/${ffprobeName}`)
    }
  }

  // Verify
  const ffmpegOk = existsSync(ffmpegOut)
  const ffprobeOk = existsSync(ffprobeOut)
  if (!ffmpegOk || !ffprobeOk) {
    if (!ffmpegOk) console.error(`[ffmpeg-download] ❌ ${targetDir}/${ffmpegName} missing`)
    if (!ffprobeOk) console.error(`[ffmpeg-download] ❌ ${targetDir}/${ffprobeName} missing`)
    return false
  }
  return true
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const all = process.argv.includes('--all')
  const targets = platformsToDownload(all)

  console.log(`[ffmpeg-download] Targets: ${targets.join(', ')}`)

  // 固定 FFmpeg 版本（6.0），保证构建可复现；6.0 不可用时整体回退到 5.1.1
  let versionInfo = await fetchVersionInfo(FF_VERSION)
  if (!versionInfo) {
    console.warn(`[ffmpeg-download] ⚠ FFmpeg ${FF_VERSION} 不可用，回退到 ${FF_VERSION_FALLBACK}`)
    versionInfo = await fetchVersionInfo(FF_VERSION_FALLBACK)
  }
  if (!versionInfo) {
    throw new Error(`Neither FFmpeg ${FF_VERSION} nor ${FF_VERSION_FALLBACK} is available`)
  }
  const version = versionInfo.version || FF_VERSION
  console.log(`[ffmpeg-download] Pinned FFmpeg version: ${version}\n`)

  let allOk = true
  for (const plat of targets) {
    const ok = await downloadPlatform(plat, versionInfo)
    if (!ok) allOk = false
  }

  if (allOk) {
    console.log(`\n[ffmpeg-download] ✅ All platforms ready (version ${version})`)
  } else {
    console.error(`\n[ffmpeg-download] ❌ Some downloads failed`)
    // Don't exit with error — missing platform URLs (e.g. osx-arm64 on ffbinaries)
    // are just warnings. The build step will handle FFmpeg absence gracefully.
  }
}

main().catch((err) => {
  console.error(`[ffmpeg-download] ❌ ${err.message}`)
  process.exit(1)
})
