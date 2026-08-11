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

/**
 * Convert a local file path to a file:// URL usable as an Audio src.
 * encodeURI leaves `#` and `?` unescaped, which would truncate the URL
 * (fragment/query), so they are encoded manually. The `C:` drive colon
 * is preserved.
 * @example toFileUrl('C:\\Music\\song#1?.flac') → 'file:///C:/Music/song%231%3F.flac'
 */
export function toFileUrl(filePath: string): string {
  return (
    'file:///' +
    encodeURI(filePath.replace(/\\/g, '/')).replace(/#/g, '%23').replace(/\?/g, '%3F')
  )
}
