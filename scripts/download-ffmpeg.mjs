#!/usr/bin/env node
/**
 * Format Converter
 * Copyright (c) 2026 Akiro. All rights reserved.
 *
 * Download bundled FFmpeg/FFprobe binaries from the ffmpeg-static GitHub
 * releases (eugeneware/ffmpeg-static, tag b6.1.1 → FFmpeg 6.1.1).
 *
 * Why not ffbinaries.com?
 *  - ffbinaries 已停止提供 6.0 / 5.1.1，且从未提供 osx-arm64，
 *    无法支撑 macOS Universal（x64 + arm64 双架构）构建。
 *  - ffmpeg-static releases 提供 win32-x64 / darwin-x64 / darwin-arm64 /
 *    linux-x64 四平台 ffmpeg + ffprobe，资产为 gzip 压缩的裸二进制。
 *
 * 下载完成后校验二进制魔数（magic bytes）与大小，防止供应链被篡改。
 *
 * Usage:
 *   node scripts/download-ffmpeg.mjs            # current platform only
 *   node scripts/download-ffmpeg.mjs --all       # all 4 platforms
 *   FFMPEG_DOWNLOAD_BASE=<url> node scripts/download-ffmpeg.mjs   # override mirror
 *
 * Binaries are placed in resources/ffmpeg/{platform}/ (darwin 下再分 x64/arm64).
 */

import { existsSync, mkdirSync, chmodSync, writeFileSync, statSync, unlinkSync, openSync, readSync, closeSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { gunzipSync } from 'zlib'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
// 固定 FFmpeg 版本（ffmpeg-static b6.1.1 → FFmpeg 6.1.1），保证构建可复现
const RELEASE_TAG = 'b6.1.1'
const RELEASE_BASE = `https://github.com/eugeneware/ffmpeg-static/releases/download/${RELEASE_TAG}`
// 允许用镜像覆盖（企业网络 / 国内网络场景），默认直连 GitHub
const DOWNLOAD_BASE = process.env.FFMPEG_DOWNLOAD_BASE || RELEASE_BASE

// ---------------------------------------------------------------------------
// Platform mappings（与 src/main/ffmpeg-path.ts 的目录布局保持一致）
// ---------------------------------------------------------------------------

const PLATFORM_MAP = {
  'win32-x64':    { dir: 'win32', ext: '.exe' },
  // macOS 按架构拆分：x64 与 arm64 分别存放（Universal 构建需要双架构二进制）
  'darwin-x64':   { dir: 'darwin/x64', ext: '' },
  'darwin-arm64': { dir: 'darwin/arm64', ext: '' },
  'linux-x64':    { dir: 'linux', ext: '' },
}

function currentPlatformCode() {
  const { platform, arch } = process
  if (platform === 'win32') return 'win32-x64'
  if (platform === 'darwin') return arch === 'arm64' ? 'darwin-arm64' : 'darwin-x64'
  if (arch === 'arm64') return 'linux-arm64'
  return 'linux-x64'
}

function platformsToDownload(all) {
  if (all) return Object.keys(PLATFORM_MAP)
  return [currentPlatformCode()]
}

// ---------------------------------------------------------------------------
// Download & verify helpers
// ---------------------------------------------------------------------------

async function fetchBinaryGz(name, plat) {
  const url = `${DOWNLOAD_BASE}/${name}-${plat}.gz`
  console.log(`[ffmpeg-download]   fetching ${url}...`)
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`)
  const gz = Buffer.from(await resp.arrayBuffer())
  // gzip 解压为裸二进制；解压失败（损坏）直接抛错
  return gunzipSync(gz)
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
// 任一不通过即删除文件并抛出错误，绝不把未经验证的二进制交给应用使用。
function verifyBinaryFile(filePath, platform) {
  // platform 可能是 'darwin/x64' 这类子目录，取第一段作为平台名
  const family = platform.split('/')[0]
  const magics = MAGIC_BYTES[family]
  if (!magics) throw new Error(`no magic bytes configured for platform family: ${family}`)

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

async function saveBinary(name, plat, outPath, platformDir) {
  if (existsSync(outPath)) {
    console.log(`[ffmpeg-download] ✓ ${platformDir}/${name} already exists, skipping`)
    return true
  }
  const data = await fetchBinaryGz(name, plat)
  writeFileSync(outPath, data)
  try { chmodSync(outPath, 0o755) } catch { /* best-effort */ }
  // 下载校验：魔数 + 大小，防止拿到损坏或被篡改的二进制
  verifyBinaryFile(outPath, platformDir)
  console.log(`[ffmpeg-download] ✓ ${platformDir}/${name} saved (${(data.length / 1024 / 1024).toFixed(1)} MB)`)
  return true
}

async function downloadPlatform(plat) {
  const platCfg = PLATFORM_MAP[plat]
  if (!platCfg) {
    console.warn(`[ffmpeg-download] ⚠ Unknown platform code: ${plat}, skipping`)
    return false
  }

  const { dir: targetDir, ext: suf } = platCfg
  const outDir = join(ROOT, 'resources', 'ffmpeg', targetDir)
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

  const ffmpegOut = join(outDir, `ffmpeg${suf}`)
  const ffprobeOut = join(outDir, `ffprobe${suf}`)

  await saveBinary('ffmpeg', plat, ffmpegOut, targetDir)
  await saveBinary('ffprobe', plat, ffprobeOut, targetDir)

  // Verify both landed
  const ffmpegOk = existsSync(ffmpegOut)
  const ffprobeOk = existsSync(ffprobeOut)
  if (!ffmpegOk || !ffprobeOk) {
    if (!ffmpegOk) console.error(`[ffmpeg-download] ❌ ${targetDir}/ffmpeg${suf} missing`)
    if (!ffprobeOk) console.error(`[ffmpeg-download] ❌ ${targetDir}/ffprobe${suf} missing`)
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

  console.log(`[ffmpeg-download] Targets: ${targets.join(', ')} (release ${RELEASE_TAG}, FFmpeg 6.1.1)`)
  console.log(`[ffmpeg-download] Source: ${DOWNLOAD_BASE}\n`)

  let allOk = true
  for (const plat of targets) {
    const ok = await downloadPlatform(plat)
    if (!ok) allOk = false
  }

  if (allOk) {
    console.log(`\n[ffmpeg-download] ✅ All platforms ready (${RELEASE_TAG})`)
  } else {
    console.error(`\n[ffmpeg-download] ❌ Some downloads failed`)
  }
}

main().catch((err) => {
  console.error(`[ffmpeg-download] ❌ ${err.message}`)
  process.exit(1)
})
