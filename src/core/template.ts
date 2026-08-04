/**
 * Format Converter
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * Output filename template helpers.
 * Extracted from convert.ts IPC handler for testability.
 */

export function sanitizeFileName(s: string): string {
  return s.replace(/[<>:"/\\|?*]/g, '_')
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

  return result
}
