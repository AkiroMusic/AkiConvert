/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 *
 * Cross-platform bundled FFmpeg binary path resolver.
 * Binaries are stored in resources/ffmpeg/{platform}/ and copied
 * into the app resources during build (electron-builder extraResources).
 * macOS 在 {platform} 下再按架构拆分：darwin/x64 与 darwin/arm64。
 *
 * Packaged:  {process.resourcesPath}/ffmpeg/{platform}/
 * Dev/test:  {projectRoot}/resources/ffmpeg/{platform}/
 */

import { existsSync } from 'fs'
import { join } from 'path'

export interface ResolveOptions {
  platform: NodeJS.Platform
  customFfmpegPath?: string
  customFfprobePath?: string
}

// ---------------------------------------------------------------------------
// Detect packaged mode safely across Electron / test / script environments
// ---------------------------------------------------------------------------

function isPackaged(): boolean {
  try {
    // In vitest / plain Node: require('electron') throws -> caught -> false
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { app } = require('electron')
    return app?.isPackaged === true
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// Platform helpers
// ---------------------------------------------------------------------------

// darwin 需要区分 x64 / arm64（Universal 构建同时打包两种架构的二进制）
function platformDir(platform: NodeJS.Platform, arch: string): string {
  if (platform === 'win32') return 'win32'
  if (platform === 'darwin') return arch === 'arm64' ? 'darwin/arm64' : 'darwin/x64'
  return 'linux'
}

function binExt(platform: NodeJS.Platform): string {
  return platform === 'win32' ? '.exe' : ''
}

// ---------------------------------------------------------------------------
// Resolve bundled directory
// ---------------------------------------------------------------------------

function bundledDir(): string {
  // macOS 按运行架构选择 darwin/x64 或 darwin/arm64
  const pDir = platformDir(process.platform, process.arch)

  if (isPackaged()) {
    // Packaged: binaries live inside the app's resources
    return join(process.resourcesPath!, 'ffmpeg', pDir)
  }

  // Dev / test: project root relative to compiled output (out/main/ -> ../../)
  return join(__dirname, '..', '..', 'resources', 'ffmpeg', pDir)
}

// ---------------------------------------------------------------------------
// Public resolvers
// ---------------------------------------------------------------------------

function resolveBinary(
  name: 'ffmpeg' | 'ffprobe',
  opts: ResolveOptions
): string {
  const ext = binExt(opts.platform)
  const binName = `${name}${ext}`

  // 1) Custom path override
  if (opts.customFfmpegPath && name === 'ffmpeg') return opts.customFfmpegPath
  if (opts.customFfprobePath && name === 'ffprobe') return opts.customFfprobePath

  // 2) Bundled path
  const bundle = join(bundledDir(), binName)
  if (existsSync(bundle)) return bundle

  // 3) Fallback — bare command name (will work if on PATH)
  return binName
}

export function resolveFfmpegPath(opts: ResolveOptions): string {
  return resolveBinary('ffmpeg', opts)
}

export function resolveFfprobePath(opts: ResolveOptions): string {
  return resolveBinary('ffprobe', opts)
}
