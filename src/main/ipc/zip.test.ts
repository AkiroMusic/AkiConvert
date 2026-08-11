/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * 测试 ZIP 条目名消毒函数 sanitizeZipEntryName：JSZip 会按原样保存条目名，
 * `../evil.txt` 之类的名字在解压时可能写出目标目录（zip-slip），绝对路径
 * 与 NUL/控制字符同样危险。该函数为纯函数（不依赖 electron 运行时），
 * mock electron 仅为了让模块在 vitest node 环境下可加载。
 */

import { describe, it, expect, vi, beforeAll } from 'vitest'

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() }
}))

let sanitizeZipEntryName: (name: string) => string

beforeAll(async () => {
  const mod = await import('./zip')
  sanitizeZipEntryName = mod.sanitizeZipEntryName
})

describe('sanitizeZipEntryName', () => {
  it('collapses Windows backslash traversal', () => {
    expect(sanitizeZipEntryName('..\\..\\evil.txt')).toBe('evil.txt')
  })

  it('collapses forward-slash traversal', () => {
    expect(sanitizeZipEntryName('../../evil.txt')).toBe('evil.txt')
  })

  it('strips leading slash from absolute paths', () => {
    expect(sanitizeZipEntryName('/abs/name.txt')).toBe('abs/name.txt')
  })

  it('removes intermediate parent-directory segments', () => {
    expect(sanitizeZipEntryName('a/../../b.txt')).toBe('b.txt')
  })

  it('replaces NUL and control characters with underscore', () => {
    expect(sanitizeZipEntryName('nul\u0000char.txt')).toBe('nul_char.txt')
  })

  it('keeps normal relative paths unchanged', () => {
    expect(sanitizeZipEntryName('normal/file.txt')).toBe('normal/file.txt')
  })

  it('normalizes backslashes to forward slashes throughout', () => {
    expect(sanitizeZipEntryName('dir\\sub\\file.txt')).toBe('dir/sub/file.txt')
  })

  it('falls back to a safe name when nothing remains', () => {
    expect(sanitizeZipEntryName('../../')).toBe('file')
    expect(sanitizeZipEntryName('..')).toBe('file')
  })
})
