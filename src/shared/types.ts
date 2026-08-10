/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 *
 * Cross-process shared type definitions (main process <-> preload <-> renderer).
 * Single source of truth for the settings / preset / history shapes that
 * travel across the IPC boundary.
 */

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

// 用 type 别名而非 interface：TS 中 type 别名对对象字面量有隐式索引签名，
// 可满足 SimpleStore<T extends StoredData> 的约束（interface 无隐式索引签名）。
export type AppSettings = {
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
  customFfmpegPath?: string
  embedCompanionLyrics: boolean
  loudnormEnabled: boolean
  loudnormTarget: number
}

export interface HistoryRecord {
  ts: number
  inputPath: string
  inputName: string
  targetFormat: string
  status: 'success' | 'failed'
  outputName: string | null
  outputPath: string | null
  durationMs: number | null
  error: string | null
}
