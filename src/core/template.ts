/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * Output filename template helpers.
 * Extracted from convert.ts IPC handler for testability.
 */

export function sanitizeFileName(s: string): string {
  // 非法字符替换为 `_`；结尾的 `.` 和空格是 Windows 禁止的，一并去掉
  return s.replace(/[<>:"/\\|?*]/g, '_').replace(/[. ]+$/, '')
}

/**
 * Windows 保留设备名判断：CON/PRN/AUX/NUL/COM1-9/LPT1-9，大小写不敏感。
 * 匹配最后一个点之前的 stem（如 'con.mp3' 的 stem 是 'con'），无扩展名时匹配整个名称。
 */
export function isWindowsReservedName(stem: string): boolean {
  const dot = stem.lastIndexOf('.')
  const base = (dot === -1 ? stem : stem.slice(0, dot)).toUpperCase()
  return /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/.test(base)
}

export interface TemplateVars {
  artist: string
  title: string
  album: string
}

/**
 * Derive fallback artist/title from a source filename that follows the
 * common "Artist - Title" naming convention.
 *
 * Encrypted cache formats (KGM, KWM, QMC, and NCM files with an empty or
 * corrupt metadata block) often carry no embedded tags, which would
 * otherwise produce "Unknown - Unknown" output names. Returns `null` when
 * the filename contains no " - " separator (or only a partial one), so the
 * caller can fall back to the raw filename itself.
 */
export function deriveMetadataFromFilename(
  fileName: string
): { artist: string; title: string } | null {
  const sep = fileName.indexOf(' - ')
  if (sep <= 0) return null
  const artist = fileName.slice(0, sep).trim()
  const title = fileName.slice(sep + 3).trim()
  if (!artist || !title) return null
  return { artist, title }
}

/** Default fallback template when none is configured. */
export const DEFAULT_TEMPLATE = '{artist} - {title}'

/**
 * Render a filename template with the given variables.
 *
 * Supported placeholders: {artist}, {title}, {album}
 * Invalid chars are replaced with underscores.
 */
export function renderFilenameTemplate(
  template: string,
  vars: TemplateVars
): string {
  const safe = {
    artist: sanitizeFileName(vars.artist || 'Unknown Artist'),
    title: sanitizeFileName(vars.title || 'Unknown Title'),
    album: sanitizeFileName(vars.album || 'Unknown Album')
  }

  let result = template
    .replace(/\{artist\}/g, safe.artist)
    .replace(/\{title\}/g, safe.title)
    .replace(/\{album\}/g, safe.album)

  if (!result || result.trim() === '') {
    result = `${safe.artist} - ${safe.title}`
  }

  // 最终结果尾部同样不能以 Windows 禁止的 `.` 或空格结尾
  result = result.replace(/[. ]+$/, '')

  // Windows 保留名（净化后）前缀 `_`，如 'CON' → '_CON'、'con.mp3' → '_con.mp3'
  if (isWindowsReservedName(result)) {
    const dot = result.lastIndexOf('.')
    const stem = dot === -1 ? result : result.slice(0, dot)
    const ext = dot === -1 ? '' : result.slice(dot)
    result = `_${stem}${ext}`
  }

  return result
}
