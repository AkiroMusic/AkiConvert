/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import { describe, it, expect } from 'vitest'
import { formatTime, formatVolume } from './player'

describe('formatTime', () => {
  it('formats 0 seconds as "0:00"', () => {
    expect(formatTime(0)).toBe('0:00')
  })

  it('formats 65 seconds as "1:05"', () => {
    expect(formatTime(65)).toBe('1:05')
  })

  it('formats 3661 seconds as "61:01"', () => {
    expect(formatTime(3661)).toBe('61:01')
  })

  it('formats negative seconds as "0:00"', () => {
    expect(formatTime(-1)).toBe('0:00')
  })
})

describe('formatVolume', () => {
  it('formats 0 as "0%"', () => {
    expect(formatVolume(0)).toBe('0%')
  })

  it('formats 0.7 as "70%"', () => {
    expect(formatVolume(0.7)).toBe('70%')
  })

  it('formats 1 as "100%"', () => {
    expect(formatVolume(1)).toBe('100%')
  })

  it('formats 0.05 as "5%"', () => {
    expect(formatVolume(0.05)).toBe('5%')
  })

  it('formats 0.345 as "35%"', () => {
    expect(formatVolume(0.345)).toBe('35%')
  })
})
