/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 *
 * Player utility functions.
 */

/**
 * Format seconds to mm:ss display string.
 * @example formatTime(65) → "1:05"
 */
export function formatTime(seconds: number): string {
  const clamped = Math.max(0, seconds)
  const mins = Math.floor(clamped / 60)
  const secs = Math.floor(clamped % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Format volume (0-1) to percentage display string.
 * @example formatVolume(0.7) → "70%"
 */
export function formatVolume(volume: number): string {
  return `${Math.round(volume * 100)}%`
}
