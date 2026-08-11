/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * 本地化键集对齐测试：锁定 en-US.json 与 zh-CN.json 具有完全一致的键结构，
 * 防止只改一个语言文件导致另一个缺失翻译键。
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const LOCALES_DIR = join(__dirname, '..', 'renderer', 'src', 'locales')

/** 读取并解析指定语言文件 */
function loadLocale(fileName: string): Record<string, unknown> {
  const raw = readFileSync(join(LOCALES_DIR, fileName), 'utf8')
  return JSON.parse(raw) as Record<string, unknown>
}

/** 递归将 JSON 对象展平为点分路径集合（叶子键，如 'status.error'、'settings.filenameHint'） */
function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, path))
    } else {
      keys.push(path)
    }
  }
  return keys
}

describe('locale key parity', () => {
  const en = loadLocale('en-US.json')
  const zh = loadLocale('zh-CN.json')

  it('两个语言文件均非空', () => {
    expect(Object.keys(en).length).toBeGreaterThan(0)
    expect(Object.keys(zh).length).toBeGreaterThan(0)
  })

  it('顶层键集合完全一致', () => {
    expect(Object.keys(en).slice().sort()).toEqual(Object.keys(zh).slice().sort())
  })

  it('嵌套叶子键路径集合完全一致', () => {
    expect(flattenKeys(en).sort()).toEqual(flattenKeys(zh).sort())
  })
})
