/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * Simple JSON file-based settings store.
 * Replaces electron-store which is ESM-only and incompatible with
 * the CJS main process bundle.
 */

import { app } from 'electron'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'

interface StoredData {
  [key: string]: unknown
}

export interface SimpleStoreOptions<T extends StoredData> {
  defaults: T
  name?: string
  /**
   * 当前 schema 版本。落盘时写入保留键 `_version`。
   * 旧版本文件加载时若提供了 migrate，先迁移再合并。
   */
  schemaVersion?: number
  /**
   * 逐键校验器：返回 false 的键在加载时被丢弃并回退到 defaults。
   * 防止手工编辑 / 损坏的 settings.json 携带错误类型/越界值
   * 进入运行时（L7：schema 加载校验）。
   */
  validateKey?: (key: string, value: unknown) => boolean
  /**
   * 版本迁移：把 storedVersion 的旧数据转换为当前版本。
   * 返回的 Record 随后会被 validateKey 逐键过滤。
   */
  migrate?: (raw: Record<string, unknown>, fromVersion: number) => Record<string, unknown>
}

const CURRENT_VERSION = 1

export class SimpleStore<T extends StoredData> {
  private data: T
  private filePath: string

  constructor(private readonly options: SimpleStoreOptions<T>) {
    const userDataPath = app.getPath('userData')
    const fileName = options.name ? `${options.name}.json` : 'config.json'
    this.filePath = join(userDataPath, fileName)

    // Ensure userData directory exists
    if (!existsSync(userDataPath)) {
      mkdirSync(userDataPath, { recursive: true })
    }

    // Load existing data or use defaults
    this.data = this.load()
  }

  private load(): T {
    try {
      if (existsSync(this.filePath)) {
        const raw = readFileSync(this.filePath, 'utf-8')
        const parsed = JSON.parse(raw) as Record<string, unknown>

        // 读取落盘版本号（保留键，不暴露为数据键）
        const storedVersion =
          typeof parsed._version === 'number' ? parsed._version : CURRENT_VERSION
        delete parsed._version

        // 版本迁移：旧数据 → 当前版本
        let migrated = parsed
        const targetVersion = this.options.schemaVersion ?? CURRENT_VERSION
        if (this.options.migrate && storedVersion < targetVersion) {
          migrated = this.options.migrate(migrated, storedVersion)
        }

        // 逐键校验：非法值丢弃，回退到 defaults
        const result: Record<string, unknown> = { ...this.options.defaults }
        for (const [key, value] of Object.entries(migrated)) {
          if (value === undefined) continue
          if (this.options.validateKey && !this.options.validateKey(key, value)) continue
          result[key] = value
        }
        return result as T
      }
    } catch {
      // If file is corrupted, fall back to defaults
    }
    return { ...this.options.defaults }
  }

  private save(): void {
    try {
      const dir = dirname(this.filePath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }
      const toWrite = { ...this.data, _version: this.options.schemaVersion ?? CURRENT_VERSION }
      writeFileSync(this.filePath, JSON.stringify(toWrite, null, 2), 'utf-8')
    } catch (err) {
      console.error('SimpleStore: failed to save', err)
    }
  }

  get store(): T {
    return { ...this.data }
  }

  get<K extends keyof T>(key: K): T[K] {
    return this.data[key]
  }

  set<K extends keyof T>(key: K, value: T[K]): void {
    this.data[key] = value
    this.save()
  }
}
