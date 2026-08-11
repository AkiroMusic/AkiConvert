/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import { describe, it, expect } from 'vitest'
import { detectLanguage, resolveInitialLanguage } from './language'

describe('detectLanguage', () => {
  it('maps zh-* navigator languages to zh-CN', () => {
    expect(detectLanguage('zh-Hans-CN')).toBe('zh-CN')
    expect(detectLanguage('zh-CN')).toBe('zh-CN')
    expect(detectLanguage('zh-TW')).toBe('zh-CN')
    expect(detectLanguage('zh')).toBe('zh-CN')
  })

  it('defaults to en-US for non-Chinese, unknown, and empty navigator languages', () => {
    expect(detectLanguage('en')).toBe('en-US')
    expect(detectLanguage('en-US')).toBe('en-US')
    expect(detectLanguage('ja-JP')).toBe('en-US')
    expect(detectLanguage('fr-FR')).toBe('en-US')
    expect(detectLanguage('')).toBe('en-US')
  })
})

describe('resolveInitialLanguage', () => {
  it('auto-detects from the OS language on first run (languageSet === false)', () => {
    expect(resolveInitialLanguage('zh-CN', false, 'en-US')).toBe('en-US')
    expect(resolveInitialLanguage('en-US', false, 'zh-Hans-CN')).toBe('zh-CN')
  })

  it('honors the stored language once the user has explicitly chosen one', () => {
    expect(resolveInitialLanguage('zh-CN', true, 'en-US')).toBe('zh-CN')
    expect(resolveInitialLanguage('en-US', true, 'zh-CN')).toBe('en-US')
  })
})
