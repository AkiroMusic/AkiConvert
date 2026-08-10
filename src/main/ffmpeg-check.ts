/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 *
 * FFmpeg bundled binary check.
 * Simply verifies that the bundled ffmpeg/ffprobe exist and are runnable.
 * No auto-detect, no PATH scan, no download — just bundled + optional custom path.
 */

import { execFile } from 'child_process'
import { existsSync } from 'fs'
import { join } from 'path'
import { binExt, bundledDir } from './ffmpeg-path'

export interface FfmpegStatus {
  available: boolean
  ffmpegPath: string | null
  ffprobePath: string | null
  reason?: string
}

// ---------------------------------------------------------------------------
// Probe
// ---------------------------------------------------------------------------

export function probeBinary(binPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(binPath, ['-version'], { timeout: 8000 }, (err) => {
      resolve(!err)
    })
  })
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check if FFmpeg is available (bundled or custom path).
 */
export async function ensureFfmpeg(customFfmpegPath?: string | null): Promise<FfmpegStatus> {
  const ext = binExt(process.platform)
  const ffmpegName = `ffmpeg${ext}`
  const ffprobeName = `ffprobe${ext}`

  let ffmpegPath: string | null = null
  let ffprobePath: string | null = null

  // Try custom path first
  if (customFfmpegPath) {
    if (existsSync(customFfmpegPath) && (await probeBinary(customFfmpegPath))) {
      ffmpegPath = customFfmpegPath
      const probeCandidate = join(customFfmpegPath, '..', ffprobeName)
      if (existsSync(probeCandidate) && (await probeBinary(probeCandidate))) {
        ffprobePath = probeCandidate
      }
    }
  }

  // Fall back to bundled
  if (!ffmpegPath) {
    const bundle = join(bundledDir(), ffmpegName)
    if (existsSync(bundle) && (await probeBinary(bundle))) {
      ffmpegPath = bundle
      const probeCandidate = join(bundledDir(), ffprobeName)
      if (existsSync(probeCandidate) && (await probeBinary(probeCandidate))) {
        ffprobePath = probeCandidate
      }
    }
  }

  if (ffmpegPath && ffprobePath) {
    return { available: true, ffmpegPath, ffprobePath }
  }

  const missing: string[] = []
  if (!ffmpegPath) missing.push(ffmpegName)
  if (!ffprobePath) missing.push(ffprobeName)
  const reason = `${missing.join(' and ')} not found in bundled directory (${bundledDir()})`
  return { available: false, ffmpegPath: null, ffprobePath: null, reason }
}
