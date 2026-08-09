/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import { ipcMain, dialog } from 'electron'
import { readFile, writeFile } from 'fs/promises'
import { isAbsolute } from 'path'
import { SimpleStore } from '../simpleStore'
import { probeBinary } from '../ffmpeg-check'
import { OUTPUT_FORMATS } from '../../core/supportedFormats'

export interface Preset {
  id: string
  name: string
  outputFormat: string
  bitrate: string
  vbrEnabled: boolean
  vbrQuality: number
  compressionLevel: number
  sampleRate: string
  bitDepth: string
}

const DEFAULT_PRESETS: Preset[] = [
  {
    id: 'standard',
    name: 'Standard',
    outputFormat: 'source',
    bitrate: '320k',
    vbrEnabled: false,
    vbrQuality: 0,
    compressionLevel: 5,
    sampleRate: 'original',
    bitDepth: 'original'
  },
  {
    id: 'podcast',
    name: 'Podcast',
    outputFormat: 'mp3',
    bitrate: '128k',
    vbrEnabled: true,
    vbrQuality: 5,
    compressionLevel: 0,
    sampleRate: '44100',
    bitDepth: 'original'
  },
  {
    id: 'hifi',
    name: 'Hi-Fi',
    outputFormat: 'flac',
    bitrate: '320k',
    vbrEnabled: false,
    vbrQuality: 0,
    compressionLevel: 8,
    sampleRate: 'original',
    bitDepth: 'original'
  },
  {
    id: 'archive',
    name: 'Archive',
    outputFormat: 'flac',
    bitrate: '320k',
    vbrEnabled: false,
    vbrQuality: 0,
    compressionLevel: 12,
    sampleRate: 'original',
    bitDepth: '24'
  }
]

type AppSettings = {
  language: string
  outputDir: string
  filenameTemplate: string
  theme: string
  outputFormat: string
  bitrate: string
  vbrEnabled: boolean
  vbrQuality: number
  compressionLevel: number
  sampleRate: string
  bitDepth: string
  qmcEkey: string
  kggKeyImportPath: string
  autoConcurrent: boolean
  notificationsEnabled: boolean
  selectedPreset: string
  presets: Preset[]
  concurrentLimit: number
  duplicateAction: string
  customFfmpegPath: string
  embedCompanionLyrics: boolean
  loudnormEnabled: boolean
  loudnormTarget: number
}

// ---------------------------------------------------------------------------
// 安全加固：settings:set / settings:import 键白名单 + 每键类型/值域校验。
// 渲染进程（以及被导入的 settings.json）只能写入白名单内的键，且值必须
// 通过对应校验器。这切断了"注入任意设置键 → 指向任意可执行文件"的链路。
// 同一组校验器也用于 store 加载时的逐键校验（L7）：手工编辑/损坏的
// settings.json 携带非法值会被丢弃并回退默认值，避免运行时类型崩溃。
// ---------------------------------------------------------------------------

/** 允许通过 IPC 写入的设置键（customFfmpegPath 见下方单独处理）。 */
const SETTABLE_KEYS = new Set<keyof AppSettings>([
  'language',
  'theme',
  'outputDir',
  'filenameTemplate',
  'outputFormat',
  'bitrate',
  'vbrEnabled',
  'vbrQuality',
  'compressionLevel',
  'sampleRate',
  'bitDepth',
  'autoConcurrent',
  'concurrentLimit',
  'duplicateAction',
  'notificationsEnabled',
  'selectedPreset',
  'presets',
  'embedCompanionLyrics',
  'loudnormEnabled',
  'loudnormTarget',
  'qmcEkey',
  'kggKeyImportPath',
])

const VALIDATORS: Partial<Record<keyof AppSettings, (v: unknown) => boolean>> = {
  language: (v) => v === 'zh-CN' || v === 'en-US',
  theme: (v) => ['system', 'dark', 'light', 'sepia', 'forest', 'ocean', 'lavender'].includes(v as string),
  outputDir: (v) => typeof v === 'string' && v.length <= 4096,
  filenameTemplate: (v) => typeof v === 'string' && v.length <= 200,
  outputFormat: (v) => v === 'source' || OUTPUT_FORMATS.includes(v as string),
  bitrate: (v) => typeof v === 'string' && /^\d{2,4}k?$/.test(v),
  vbrEnabled: (v) => typeof v === 'boolean',
  vbrQuality: (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 9,
  compressionLevel: (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 12,
  // 采样率：'original' 或标准采样率白名单（与 SettingsPanel 提供的选项一致）
  sampleRate: (v) =>
    typeof v === 'string' &&
    (v === 'original' ||
      ['8000', '11025', '16000', '22050', '32000', '44100', '48000', '88200', '96000', '176400', '192000'].includes(v)),
  // 位深：'original' 或合法数值（16/24/32）
  bitDepth: (v) =>
    typeof v === 'string' &&
    (v === 'original' || v === '16' || v === '24' || v === '32'),
  autoConcurrent: (v) => typeof v === 'boolean',
  concurrentLimit: (v) => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 10,
  duplicateAction: (v) => ['rename', 'skip', 'overwrite'].includes(v as string),
  notificationsEnabled: (v) => typeof v === 'boolean',
  selectedPreset: (v) => typeof v === 'string' && v.length <= 64,
  presets: (v) =>
    Array.isArray(v) &&
    v.length <= 50 &&
    v.every(
      (p) =>
        p !== null &&
        typeof p === 'object' &&
        typeof (p as Preset).id === 'string' &&
        typeof (p as Preset).name === 'string'
    ),
  embedCompanionLyrics: (v) => typeof v === 'boolean',
  loudnormEnabled: (v) => typeof v === 'boolean',
  loudnormTarget: (v) => typeof v === 'number' && v >= -23 && v <= -9,
  qmcEkey: (v) => typeof v === 'string' && v.length <= 4096,
  kggKeyImportPath: (v) => typeof v === 'string' && v.length <= 4096,
}

const store = new SimpleStore<AppSettings>({
  name: 'settings',
  // L7：settings.json schema 加载校验。load 时逐键跑 VALIDATORS，
  // 非法值（错误类型/越界/手工编辑残留）丢弃并回退 defaults，
  // 防止损坏的配置文件把运行时拖垮。schemaVersion=1 为当前版本，
  // 未来字段变更时递增版本并提供 migrate 迁移。
  schemaVersion: 1,
  validateKey: (key, value): boolean => {
    const validate = VALIDATORS[key as keyof AppSettings]
    // 无校验器的键（customFfmpegPath，经对话框探活后才写入）直接放行
    return validate ? validate(value) : true
  },
  defaults: {
    language: 'zh-CN',
    outputDir: '',
    filenameTemplate: '{artist} - {title}',
    theme: 'dark',
    outputFormat: 'source',
    concurrentLimit: 3,
    duplicateAction: 'rename',
    bitrate: '320k',
    vbrEnabled: false,
    vbrQuality: 0,
    compressionLevel: 5,
    sampleRate: 'original',
    bitDepth: 'original',
    qmcEkey: '',
    kggKeyImportPath: '',
    autoConcurrent: true,
    notificationsEnabled: true,
    selectedPreset: 'standard',
    presets: DEFAULT_PRESETS,
    customFfmpegPath: '',
    embedCompanionLyrics: true,
    loudnormEnabled: false,
    loudnormTarget: -14
  }
})

/**
 * 过滤任意 patch：剔除白名单外的键、类型/值域不合法的值。
 * customFfmpegPath 不在白名单内——它只能经 dialog:selectFfmpegBinary
 * 由用户通过原生文件选择对话框设置（见 dialog.ts）。
 */
export function sanitizePatch(patch: Record<string, unknown>): Partial<AppSettings> {
  const out: Partial<AppSettings> = {}
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue
    if (!SETTABLE_KEYS.has(key as keyof AppSettings)) continue
    const validate = VALIDATORS[key as keyof AppSettings]
    if (validate && !validate(value)) continue
    ;(out as Record<string, unknown>)[key] = value
  }
  return out
}

/** 校验 customFfmpegPath：仅接受绝对路径，且必须能通过 ffmpeg -version 探活。 */
async function validateFfmpegPath(value: unknown): Promise<string | null> {
  if (value === undefined) return null
  const p = value as string
  if (typeof p !== 'string' || p === '' || !isAbsolute(p)) return null
  const ok = await probeBinary(p)
  return ok ? p : null
}

export function registerSettingsHandlers(): void {
  ipcMain.handle('settings:get', async (): Promise<AppSettings> => {
    return store.store
  })

  ipcMain.handle('settings:set', async (_event, patch: Partial<AppSettings>): Promise<void> => {
    // customFfmpegPath 单独处理：必须经探活校验通过才允许写入，
    // 防止渲染进程注入任意可执行文件路径。
    if (patch.customFfmpegPath !== undefined) {
      const valid = await validateFfmpegPath(patch.customFfmpegPath)
      if (valid) store.set('customFfmpegPath', valid)
    }
    const sanitized = sanitizePatch(patch as Record<string, unknown>)
    for (const [key, value] of Object.entries(sanitized)) {
      store.set(key as keyof AppSettings, value)
    }
  })

  ipcMain.handle('settings:export', async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await dialog.showSaveDialog({
        title: 'Export Settings',
        defaultPath: 'akiconvert-settings.json',
        filters: [{ name: 'JSON Settings', extensions: ['json'] }]
      })
      if (result.canceled || !result.filePath) {
        return { success: false, error: 'Save cancelled' }
      }
      await writeFile(result.filePath, JSON.stringify(store.store, null, 2), 'utf-8')
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })

  ipcMain.handle('settings:import', async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await dialog.showOpenDialog({
        title: 'Import Settings',
        filters: [{ name: 'JSON Settings', extensions: ['json'] }],
        properties: ['openFile']
      })
      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, error: 'Open cancelled' }
      }
      const raw = await readFile(result.filePaths[0], 'utf-8')
      const imported = JSON.parse(raw) as Record<string, unknown>

      // 安全加固：导入的 settings.json 同样只应用白名单内的合法键。
      // 自定义 FFmpeg 路径不在白名单内（需经对话框选择），故忽略导入。
      const sanitized = sanitizePatch(imported)
      for (const [key, value] of Object.entries(sanitized)) {
        if (key !== 'language') {
          // Don't override language
          store.set(key as keyof AppSettings, value)
        }
      }
      return { success: true }
    } catch (err) {
      return { success: false, error: (err as Error).message }
    }
  })
}

export { store as settingsStore }
