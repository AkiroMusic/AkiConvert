/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * 单一格式事实源（supportedFormats）模块的单元测试。
 */

import { describe, it, expect } from 'vitest'
import {
  ENCRYPTED_EXTS,
  PLAIN_AUDIO_EXTS,
  OUTPUT_FORMATS,
  getAllSupportedExts,
  isEncryptedExt,
  isPlainAudioExt,
  isSupportedExt,
} from './supportedFormats'

describe('ENCRYPTED_EXTS', () => {
  it('should contain exactly the 18 known encrypted extensions', () => {
    expect(ENCRYPTED_EXTS).toEqual([
      '.ncm', '.kwm', '.kgm', '.kgma',
      '.vpr', '.qmc0', '.qmc3', '.qmcflac',
      '.qmcogg', '.qmc1', '.qmc2', '.tkm',
      '.mflac', '.mflac0', '.mgg', '.bkc',
      '.kgg', '.kgg.flac',
    ])
  })

  it('should include .kgg (decoder + key import pipeline exist)', () => {
    expect(ENCRYPTED_EXTS).toContain('.kgg')
    expect(isEncryptedExt('.kgg')).toBe(true)
    expect(isEncryptedExt('KGG')).toBe(true)
    expect(isSupportedExt('.kgg')).toBe(true)
  })
})

describe('PLAIN_AUDIO_EXTS', () => {
  it('should contain exactly the 11 known plain audio extensions', () => {
    expect(PLAIN_AUDIO_EXTS).toEqual([
      '.mp3', '.flac', '.wav', '.m4a',
      '.aac', '.ogg', '.opus', '.aiff',
      '.alac', '.wma', '.ape',
    ])
  })

  it('should be disjoint from encrypted extensions', () => {
    for (const ext of ENCRYPTED_EXTS) {
      expect(PLAIN_AUDIO_EXTS).not.toContain(ext)
    }
  })
})

describe('OUTPUT_FORMATS', () => {
  it('should contain exactly the 9 output formats', () => {
    expect(OUTPUT_FORMATS).toEqual([
      'mp3', 'flac', 'wav', 'm4a',
      'aac', 'ogg', 'opus', 'aiff', 'alac',
    ])
  })

  it('should have no duplicates', () => {
    expect(new Set(OUTPUT_FORMATS).size).toBe(OUTPUT_FORMATS.length)
  })

  it('should not contain path separators or dots (prevents traversal via format string)', () => {
    for (const f of OUTPUT_FORMATS) {
      expect(f).not.toMatch(/[\\/]/)
      expect(f).not.toContain('.')
    }
  })

  it('should not include the "source" sentinel', () => {
    expect(OUTPUT_FORMATS).not.toContain('source')
  })
})

describe('getAllSupportedExts', () => {
  it('should merge encrypted and plain extensions without duplicates', () => {
    const all = getAllSupportedExts()
    expect(all).toHaveLength(29)
    expect(new Set(all).size).toBe(all.length)
    for (const ext of [...ENCRYPTED_EXTS, ...PLAIN_AUDIO_EXTS]) {
      expect(all).toContain(ext)
    }
  })

  it('should be sorted alphabetically', () => {
    const all = getAllSupportedExts()
    const sorted = [...all].sort()
    expect(all).toEqual(sorted)
  })
})

describe('isEncryptedExt', () => {
  it('should return true for an encrypted extension with dot', () => {
    expect(isEncryptedExt('.ncm')).toBe(true)
  })

  it('should return true for an encrypted extension without dot', () => {
    expect(isEncryptedExt('ncm')).toBe(true)
  })

  it('should be case-insensitive', () => {
    expect(isEncryptedExt('.NCM')).toBe(true)
    expect(isEncryptedExt('Kgm')).toBe(true)
  })

  it('should return false for plain audio extensions', () => {
    expect(isEncryptedExt('.mp3')).toBe(false)
    expect(isEncryptedExt('flac')).toBe(false)
  })

  it('should return false for unknown extensions', () => {
    expect(isEncryptedExt('.exe')).toBe(false)
    expect(isEncryptedExt('')).toBe(false)
  })
})

describe('isPlainAudioExt', () => {
  it('should return true for a plain audio extension with dot', () => {
    expect(isPlainAudioExt('.mp3')).toBe(true)
  })

  it('should return true for a plain audio extension without dot', () => {
    expect(isPlainAudioExt('opus')).toBe(true)
  })

  it('should be case-insensitive', () => {
    expect(isPlainAudioExt('.FLAC')).toBe(true)
    expect(isPlainAudioExt('Wav')).toBe(true)
  })

  it('should return false for encrypted extensions', () => {
    expect(isPlainAudioExt('.ncm')).toBe(false)
    expect(isPlainAudioExt('qmcflac')).toBe(false)
  })
})

describe('isSupportedExt', () => {
  it('should return true for every encrypted extension', () => {
    for (const ext of ENCRYPTED_EXTS) {
      expect(isSupportedExt(ext)).toBe(true)
    }
  })

  it('should return true for every plain audio extension', () => {
    for (const ext of PLAIN_AUDIO_EXTS) {
      expect(isSupportedExt(ext)).toBe(true)
    }
  })

  it('should accept extensions without a leading dot', () => {
    expect(isSupportedExt('mp3')).toBe(true)
    expect(isSupportedExt('ncm')).toBe(true)
  })

  it('should be case-insensitive', () => {
    expect(isSupportedExt('.MP3')).toBe(true)
    expect(isSupportedExt('.NCM')).toBe(true)
  })

  it('should support the activated QMCv2 variants', () => {
    // .mflac/.mflac0/.mgg/.bkc 已接入 ENCRYPTED_EXTS（QMCv2 解码器已启用）
    for (const ext of ['.mflac', '.mflac0', '.mgg', '.bkc']) {
      expect(isSupportedExt(ext)).toBe(true)
    }
  })

  it('should NOT support unlisted QMCv2 variants', () => {
    // .mflac2/.mgg1 等变体虽有解码器能力但尚未列入格式列表，仍视为不支持
    for (const ext of ['.mflac2', '.mflac4', '.mgg1', '.mgg2', '.mgg4', '.mggl', '.bkcmp3', '.bkcflac']) {
      expect(isSupportedExt(ext)).toBe(false)
    }
  })

  it('should return false for unknown extensions', () => {
    expect(isSupportedExt('.txt')).toBe(false)
    expect(isSupportedExt('')).toBe(false)
  })
})
