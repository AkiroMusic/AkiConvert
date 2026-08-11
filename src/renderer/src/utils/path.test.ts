/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import { describe, it, expect } from 'vitest'
import { basenameFromPath } from './path'

describe('basenameFromPath', () => {
  it('提取正斜杠路径的文件名', () => {
    expect(basenameFromPath('a/b/c.mp3')).toBe('c.mp3')
  })

  it('提取反斜杠路径的文件名', () => {
    expect(basenameFromPath('C:\\Users\\x\\song.flac')).toBe('song.flac')
  })

  it('无目录时返回原文件名', () => {
    expect(basenameFromPath('plain.txt')).toBe('plain.txt')
  })

  it('空串输入返回空串', () => {
    expect(basenameFromPath('')).toBe('')
  })

  it('去除末尾分隔符后提取末段（Windows）', () => {
    expect(basenameFromPath('C:\\foo\\bar\\')).toBe('bar')
  })

  it('去除末尾分隔符后提取末段（正斜杠）', () => {
    expect(basenameFromPath('a/b/')).toBe('b')
  })

  it('全部为分隔符时返回空串', () => {
    expect(basenameFromPath('\\\\')).toBe('')
  })
})
