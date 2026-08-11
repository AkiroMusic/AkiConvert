/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * 测试 settings 安全加固：键白名单 + 每键类型/值域校验器。
 * sanitizePatch 是纯函数（不依赖 electron 运行时），此处 mock electron
 * 仅为了让模块在 vitest node 环境下可加载。
 *
 * 注意：必须在 beforeAll 中动态 import settings.ts —— 顶层静态 import 会
 * 因 ESM import 提升而在 tempDir 初始化前就执行模块，导致 SimpleStore 构造
 * 时 mock 工厂读取到未初始化的 tempDir（TDZ 错误）。
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { Preset } from './settings'

let tempDir = ''
let sanitizePatch: (patch: Record<string, unknown>) => Partial<Record<string, unknown>>
let validateSettingsKey: ((key: string, value: unknown) => boolean) | undefined
let settingsStore: {
  store: Record<string, unknown>
}
let SimpleStoreCtor: new <T extends Record<string, unknown>>(options: {
  defaults: T
  name?: string
  schemaVersion?: number
  validateKey?: (key: string, value: unknown) => boolean
  migrate?: (raw: Record<string, unknown>, fromVersion: number) => Record<string, unknown>
}) => { store: T; set: <K extends keyof T>(key: K, value: T[K]) => void }

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() },
  app: { getPath: vi.fn(() => tempDir) }
}))

beforeAll(async () => {
  tempDir = mkdtempSync(join(tmpdir(), 'settings-test-'))
  const mod = await import('./settings')
  sanitizePatch = mod.sanitizePatch
  validateSettingsKey = mod.validateSettingsKey
  settingsStore = mod.settingsStore as typeof settingsStore
  const simpleStore = await import('../simpleStore')
  SimpleStoreCtor = simpleStore.SimpleStore as typeof SimpleStoreCtor
})

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true })
})

describe('sanitizePatch — key whitelist', () => {
  it('should keep valid whitelisted keys', () => {
    const out = sanitizePatch({ theme: 'dark', language: 'en-US' })
    expect(out).toEqual({ theme: 'dark', language: 'en-US' })
  })

  it('should drop unknown keys (injection attempt)', () => {
    const out = sanitizePatch({
      theme: 'dark',
      // 攻击面：任意非白名单键
      exec: '/bin/sh',
      shell: 'true',
      customFfmpegPath: 'C:\\evil\\ffmpeg.exe',
      __proto__: { polluted: true } as unknown,
    })
    expect(out).toEqual({ theme: 'dark' })
    expect('exec' in out).toBe(false)
    expect('shell' in out).toBe(false)
    expect('customFfmpegPath' in out).toBe(false)
  })

  it('should ignore undefined values', () => {
    const out = sanitizePatch({ theme: undefined })
    expect(out).toEqual({})
  })
})

describe('sanitizePatch — per-key validators', () => {
  it('should reject invalid theme', () => {
    expect(sanitizePatch({ theme: 'neon' })).toEqual({})
    expect(sanitizePatch({ theme: '../../x' })).toEqual({})
  })

  it('should reject invalid outputFormat (traversal attempt via format string)', () => {
    expect(sanitizePatch({ outputFormat: '../x' })).toEqual({})
    expect(sanitizePatch({ outputFormat: '/tmp/evil' })).toEqual({})
    expect(sanitizePatch({ outputFormat: 'mp3.exe' })).toEqual({})
    expect(sanitizePatch({ outputFormat: 'mp3' })).toEqual({ outputFormat: 'mp3' })
    expect(sanitizePatch({ outputFormat: 'source' })).toEqual({ outputFormat: 'source' })
  })

  it('should reject invalid bitrate', () => {
    expect(sanitizePatch({ bitrate: 'evil; rm -rf /' })).toEqual({})
    expect(sanitizePatch({ bitrate: 'abc' })).toEqual({})
    expect(sanitizePatch({ bitrate: '320k' })).toEqual({ bitrate: '320k' })
  })

  it('should reject out-of-range numeric settings', () => {
    expect(sanitizePatch({ vbrQuality: 11 })).toEqual({})
    expect(sanitizePatch({ vbrQuality: -1 })).toEqual({})
    expect(sanitizePatch({ vbrQuality: 2.5 })).toEqual({})
    expect(sanitizePatch({ vbrQuality: 5 })).toEqual({ vbrQuality: 5 })
    expect(sanitizePatch({ concurrentLimit: 0 })).toEqual({})
    expect(sanitizePatch({ concurrentLimit: 99 })).toEqual({})
    expect(sanitizePatch({ concurrentLimit: 3 })).toEqual({ concurrentLimit: 3 })
  })

  it('should reject wrong types', () => {
    expect(sanitizePatch({ vbrEnabled: 'yes' })).toEqual({})
    expect(sanitizePatch({ vbrEnabled: 1 })).toEqual({})
    expect(sanitizePatch({ vbrEnabled: true })).toEqual({ vbrEnabled: true })
    expect(sanitizePatch({ loudnormTarget: 'loud' })).toEqual({})
    expect(sanitizePatch({ loudnormTarget: -14 })).toEqual({ loudnormTarget: -14 })
  })

  it('should accept only booleans for languageSet', () => {
    expect(sanitizePatch({ languageSet: true })).toEqual({ languageSet: true })
    expect(sanitizePatch({ languageSet: false })).toEqual({ languageSet: false })
    expect(sanitizePatch({ languageSet: 'yes' })).toEqual({})
    expect(sanitizePatch({ languageSet: 1 })).toEqual({})
  })

  it('should reject invalid duplicateAction', () => {
    expect(sanitizePatch({ duplicateAction: 'delete-everything' })).toEqual({})
    expect(sanitizePatch({ duplicateAction: 'rename' })).toEqual({ duplicateAction: 'rename' })
  })

  it('should validate sampleRate against standard values (reject NaN-producing garbage)', () => {
    expect(sanitizePatch({ sampleRate: 'abc' })).toEqual({})
    expect(sanitizePatch({ sampleRate: '44100 ' })).toEqual({})
    expect(sanitizePatch({ sampleRate: '999999' })).toEqual({})
    expect(sanitizePatch({ sampleRate: '-44100' })).toEqual({})
    expect(sanitizePatch({ sampleRate: '44100' })).toEqual({ sampleRate: '44100' })
    expect(sanitizePatch({ sampleRate: 'original' })).toEqual({ sampleRate: 'original' })
    expect(sanitizePatch({ sampleRate: '192000' })).toEqual({ sampleRate: '192000' })
  })

  it('should validate bitDepth against allowed values', () => {
    expect(sanitizePatch({ bitDepth: 'abc' })).toEqual({})
    expect(sanitizePatch({ bitDepth: '8' })).toEqual({})
    expect(sanitizePatch({ bitDepth: '16' })).toEqual({ bitDepth: '16' })
    expect(sanitizePatch({ bitDepth: '24' })).toEqual({ bitDepth: '24' })
    expect(sanitizePatch({ bitDepth: '32' })).toEqual({ bitDepth: '32' })
    expect(sanitizePatch({ bitDepth: 'original' })).toEqual({ bitDepth: 'original' })
  })

  it('should validate presets array shape', () => {
    expect(sanitizePatch({ presets: 'not-an-array' })).toEqual({})
    expect(sanitizePatch({ presets: [{ id: 123, name: 'x' }] })).toEqual({})
    const goodPreset = [{ id: 'p1', name: 'P1' }] as Preset[]
    expect(sanitizePatch({ presets: goodPreset })).toEqual({ presets: goodPreset })
  })

  it('should enforce length limits on string settings', () => {
    expect(sanitizePatch({ filenameTemplate: 'a'.repeat(201) })).toEqual({})
    expect(sanitizePatch({ filenameTemplate: 'a'.repeat(200) })).toEqual({ filenameTemplate: 'a'.repeat(200) })
    expect(sanitizePatch({ qmcEkey: 'x'.repeat(4097) })).toEqual({})
  })
})

describe('SimpleStore — schema load validation (L7)', () => {
  it('should replace invalid persisted values with defaults on load', () => {
    // 手工编辑/损坏的 settings.json：theme 越界、concurrentLimit 类型错误
    writeFileSync(
      join(tempDir, 'settings.json'),
      JSON.stringify({
        _version: 1,
        theme: 'neon',
        concurrentLimit: 'abc',
        language: 'en-US',
        outputFormat: 'mp3'
      }),
      'utf-8'
    )

    const store = new SimpleStoreCtor({
      name: 'settings',
      schemaVersion: 1,
      validateKey: (key, value): boolean => {
        if (key === 'theme') return ['system', 'dark', 'light', 'sepia', 'forest', 'ocean', 'lavender'].includes(value as string)
        if (key === 'concurrentLimit') return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 10
        return true
      },
      defaults: {
        theme: 'dark',
        concurrentLimit: 3,
        language: 'zh-CN',
        outputFormat: 'source'
      }
    })

    // 非法值回退默认
    expect(store.store.theme).toBe('dark')
    expect(store.store.concurrentLimit).toBe(3)
    // 合法值保留
    expect(store.store.language).toBe('en-US')
    expect(store.store.outputFormat).toBe('mp3')
  })

  it('should keep stored version as reserved key, not data', () => {
    const store = new SimpleStoreCtor({
      name: 'settings',
      schemaVersion: 1,
      defaults: { theme: 'dark', concurrentLimit: 3, language: 'zh-CN', outputFormat: 'source' }
    })
    // _version 不应出现在暴露的数据中
    expect('_version' in store.store).toBe(false)
  })

  it('should fall back to defaults when file is corrupted JSON', () => {
    writeFileSync(join(tempDir, 'settings.json'), '{ not valid json !!!', 'utf-8')
    const store = new SimpleStoreCtor({
      name: 'settings',
      schemaVersion: 1,
      defaults: { theme: 'dark', concurrentLimit: 3, language: 'zh-CN', outputFormat: 'source' }
    })
    expect(store.store).toEqual({ theme: 'dark', concurrentLimit: 3, language: 'zh-CN', outputFormat: 'source' })
  })

  it('should run migrate when stored version is older', () => {
    writeFileSync(
      join(tempDir, 'settings.json'),
      JSON.stringify({ _version: 0, oldKey: 'legacy' }),
      'utf-8'
    )
    const store = new SimpleStoreCtor({
      name: 'settings',
      schemaVersion: 2,
      migrate: (raw, fromVersion) => {
        if (fromVersion < 1 && raw.oldKey) {
          return { ...raw, language: 'zh-CN', migrated: true }
        }
        return raw
      },
      defaults: { theme: 'dark', concurrentLimit: 3, language: 'en-US', outputFormat: 'source' }
    })
    const loaded = store.store as Record<string, unknown>
    expect(loaded.migrated).toBe(true)
    expect(loaded.language).toBe('zh-CN')
    expect(loaded.theme).toBe('dark')
  })

  it('should persist current version on save', () => {
    const store = new SimpleStoreCtor({
      name: 'settings',
      schemaVersion: 1,
      defaults: { theme: 'dark', concurrentLimit: 3, language: 'zh-CN', outputFormat: 'source' }
    })
    store.set('theme', 'light')
    const saved = JSON.parse(readFileSync(join(tempDir, 'settings.json'), 'utf-8'))
    expect(saved._version).toBe(1)
    expect(saved.theme).toBe('light')
    expect(existsSync(join(tempDir, 'settings.json'))).toBe(true)
  })

  it('should expose validated settings from the real settingsStore', () => {
    // settingsStore 是带 VALIDATORS 的真实 store —— store.store 应包含全部默认键
    expect(settingsStore.store).toMatchObject({
      theme: 'dark',
      language: 'zh-CN',
      concurrentLimit: 3,
      outputFormat: 'source',
      embedCompanionLyrics: true
    })
  })

  it('should reject magic/prototype keys and unknown keys when loading settings.json', () => {
    // 攻击面：手工编辑的 settings.json 携带 __proto__/constructor/prototype
    // 及任意未知键。__proto__ 会污染 store 数据对象原型，constructor 会成为
    // 自有键并被导出，未知键会原样进入运行时 —— 加载路径必须全部丢弃。
    writeFileSync(
      join(tempDir, 'settings.json'),
      JSON.stringify({
        _version: 1,
        theme: 'dark',
        language: 'en-US',
        // 计算属性名：对象字面量里 __proto__ 会设置原型而非建 own key，
        // 而 JSON.parse 会把它还原成真正的 own key —— 正是攻击载荷。
        ['__proto__']: { polluted: true },
        constructor: { prototype: { evil: true } },
        prototype: { polluted: true },
        evil: true,
        exec: '/bin/sh'
      }),
      'utf-8'
    )

    const store = new SimpleStoreCtor({
      name: 'settings',
      schemaVersion: 1,
      // 与 settings.ts 真实的加载校验器保持一致（收紧后：白名单外键拒绝）
      validateKey: validateSettingsKey,
      defaults: {
        theme: 'dark',
        concurrentLimit: 3,
        language: 'zh-CN',
        outputFormat: 'source',
        customFfmpegPath: ''
      }
    })

    // TS private 仅编译期生效，运行时 data 可访问：直接验证内部数据对象
    const data = (store as unknown as { data: Record<string, unknown> }).data
    // 原型未被污染（__proto__ 载荷不生效）
    expect(Object.getPrototypeOf(data)).toBe(Object.prototype)
    expect('polluted' in data).toBe(false)
    // 无魔术键 own key 残留
    expect(Object.prototype.hasOwnProperty.call(data, '__proto__')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(data, 'constructor')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(data, 'prototype')).toBe(false)
    // 未知键被丢弃
    expect(Object.prototype.hasOwnProperty.call(data, 'evil')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(data, 'exec')).toBe(false)
    // 公开视图同样无残留
    expect(Object.prototype.hasOwnProperty.call(store.store, 'constructor')).toBe(false)
    expect(Object.prototype.hasOwnProperty.call(store.store, 'evil')).toBe(false)
    // 合法键仍正常加载
    expect(store.store.theme).toBe('dark')
    expect(store.store.language).toBe('en-US')
    expect(store.store.concurrentLimit).toBe(3)
  })

  it('should still load a settings.json containing only valid keys', () => {
    writeFileSync(
      join(tempDir, 'settings.json'),
      JSON.stringify({
        _version: 1,
        theme: 'light',
        language: 'en-US',
        outputFormat: 'flac',
        concurrentLimit: 5
      }),
      'utf-8'
    )

    const store = new SimpleStoreCtor({
      name: 'settings',
      schemaVersion: 1,
      validateKey: validateSettingsKey,
      defaults: {
        theme: 'dark',
        concurrentLimit: 3,
        language: 'zh-CN',
        outputFormat: 'source',
        customFfmpegPath: ''
      }
    })

    expect(store.store.theme).toBe('light')
    expect(store.store.language).toBe('en-US')
    expect(store.store.outputFormat).toBe('flac')
    expect(store.store.concurrentLimit).toBe(5)
  })
})
