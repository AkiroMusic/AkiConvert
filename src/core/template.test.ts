/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * Tests for output filename template rendering.
 */

import { describe, it, expect } from 'vitest'
import { renderFilenameTemplate, sanitizeFileName, isWindowsReservedName, DEFAULT_TEMPLATE, deriveMetadataFromFilename } from './template'

describe('sanitizeFileName', () => {
  it('should replace illegal Windows chars with underscores', () => {
    expect(sanitizeFileName('a<b>c:d"e/f\\g|h?i*j')).toBe('a_b_c_d_e_f_g_h_i_j')
  })

  it('should keep valid characters unchanged', () => {
    expect(sanitizeFileName('Hello World - 2024')).toBe('Hello World - 2024')
  })

  it('should handle unicode characters', () => {
    expect(sanitizeFileName('歌手名')).toBe('歌手名')
  })

  it('should handle empty string', () => {
    expect(sanitizeFileName('')).toBe('')
  })

  it('should trim trailing dot', () => {
    expect(sanitizeFileName('My Song.')).toBe('My Song')
  })

  it('should trim trailing dot and spaces', () => {
    expect(sanitizeFileName('My Song. ')).toBe('My Song')
  })
})

describe('renderFilenameTemplate', () => {
  const vars = {
    artist: 'Test Artist',
    title: 'Test Song',
    album: 'Test Album'
  }

  it('should render {artist} - {title} template', () => {
    const result = renderFilenameTemplate('{artist} - {title}', vars)
    expect(result).toBe('Test Artist - Test Song')
  })

  it('should render {title} template only', () => {
    const result = renderFilenameTemplate('{title}', vars)
    expect(result).toBe('Test Song')
  })

  it('should render with album', () => {
    const result = renderFilenameTemplate('{album}/{artist} - {title}', vars)
    expect(result).toBe('Test Album/Test Artist - Test Song')
  })

  it('should sanitize illegal characters', () => {
    const bad = { artist: 'A/B:C', title: 'D<E', album: 'F?G' }
    const result = renderFilenameTemplate('{artist} - {title}', bad)
    expect(result).toBe('A_B_C - D_E')
  })

  it('should fall back to default when template is empty', () => {
    const result = renderFilenameTemplate('', vars)
    expect(result).toBe('Test Artist - Test Song')
  })

  it('should fall back to default when template is whitespace', () => {
    const result = renderFilenameTemplate('   ', vars)
    expect(result).toBe('Test Artist - Test Song')
  })

  it('should handle missing optional vars gracefully', () => {
    const minimal = { artist: '', title: '', album: '' }
    const result = renderFilenameTemplate('{artist} - {title}', minimal)
    expect(result).toBe('Unknown Artist - Unknown Title')
  })

  it('should keep literal text without placeholders', () => {
    const result = renderFilenameTemplate('my-filename', vars)
    expect(result).toBe('my-filename')
  })

  it('should prefix Windows reserved name with underscore', () => {
    expect(renderFilenameTemplate('CON', vars)).toBe('_CON')
    expect(renderFilenameTemplate('{title}', { ...vars, title: 'nul' })).toBe('_nul')
    expect(renderFilenameTemplate('COM1', vars)).toBe('_COM1')
  })

  it('should prefix reserved name stem while keeping extension', () => {
    expect(renderFilenameTemplate('{title}', { ...vars, title: 'con.mp3' })).toBe('_con.mp3')
  })

  it('should trim trailing dot from rendered name', () => {
    expect(renderFilenameTemplate('My Song.', vars)).toBe('My Song')
    expect(renderFilenameTemplate('My Song. ', vars)).toBe('My Song')
  })

  it('should leave ordinary names unchanged', () => {
    expect(renderFilenameTemplate('AC_DC - Highway to Hell', vars)).toBe('AC_DC - Highway to Hell')
  })

  it('should use DEFAULT_TEMPLATE', () => {
    expect(DEFAULT_TEMPLATE).toBe('{artist} - {title}')
  })
})

describe('deriveMetadataFromFilename', () => {
  it('should split "Artist - Title" convention', () => {
    expect(deriveMetadataFromFilename('周杰伦 - 晴天')).toEqual({ artist: '周杰伦', title: '晴天' })
  })

  it('should split and trim surrounding whitespace', () => {
    expect(deriveMetadataFromFilename('  Artist  -  Title  ')).toEqual({ artist: 'Artist', title: 'Title' })
  })

  it('should return null when no separator present', () => {
    expect(deriveMetadataFromFilename('just_a_title')).toBeNull()
  })

  it('should return null for an empty artist part', () => {
    expect(deriveMetadataFromFilename(' - Title')).toBeNull()
  })

  it('should return null for an empty title part', () => {
    expect(deriveMetadataFromFilename('Artist - ')).toBeNull()
  })

  it('should return null for an empty string', () => {
    expect(deriveMetadataFromFilename('')).toBeNull()
  })
})

describe('isWindowsReservedName', () => {
  it('should detect reserved device names case-insensitively', () => {
    expect(isWindowsReservedName('CON')).toBe(true)
    expect(isWindowsReservedName('com3')).toBe(true)
  })

  it('should match the stem before the last dot', () => {
    expect(isWindowsReservedName('nul.mp3')).toBe(true)
  })

  it('should not flag ordinary names', () => {
    expect(isWindowsReservedName('Console')).toBe(false)
    expect(isWindowsReservedName('')).toBe(false)
  })
})
