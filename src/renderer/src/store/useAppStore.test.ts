/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore, AppSettings } from './useAppStore'

// Snapshot the pristine store once, then restore it before each test so
// mutations never leak between cases.
const initialState = useAppStore.getState()

beforeEach(() => {
  useAppStore.setState(initialState)
})

function persistedSettings(overrides: Partial<AppSettings>): AppSettings {
  return { ...useAppStore.getState().settings, ...overrides }
}

describe('applyPersistedSettings', () => {
  it('hydrates outputDir and merges persisted settings into state', () => {
    useAppStore.getState().applyPersistedSettings(
      persistedSettings({
        outputDir: 'D:\\out',
        language: 'zh-CN',
        theme: 'ocean',
        outputFormat: 'flac',
        concurrentLimit: 5
      })
    )

    const state = useAppStore.getState()
    expect(state.outputDir).toBe('D:\\out')
    expect(state.settings.outputDir).toBe('D:\\out')
    expect(state.settings.language).toBe('zh-CN')
    expect(state.settings.theme).toBe('ocean')
    expect(state.settings.outputFormat).toBe('flac')
    expect(state.settings.concurrentLimit).toBe(5)
  })

  it('normalizes an empty persisted outputDir to null', () => {
    useAppStore.getState().applyPersistedSettings(persistedSettings({ outputDir: '' }))

    const state = useAppStore.getState()
    expect(state.outputDir).toBeNull()
    expect(state.settings.outputDir).toBe('')
  })
})
