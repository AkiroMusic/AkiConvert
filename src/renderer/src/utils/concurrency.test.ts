/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { resolveConcurrency } from './concurrency'

// Node 22+ 自带全局 navigator，为模拟「无 navigator」的 node 测试环境需先清除
beforeAll(() => {
  vi.stubGlobal('navigator', undefined)
})

afterAll(() => {
  vi.unstubAllGlobals()
})

describe('resolveConcurrency', () => {
  it('autoConcurrent 且 hc=8 时返回 8', () => {
    expect(resolveConcurrency({ autoConcurrent: true, concurrentLimit: 3 }, 8)).toBe(8)
  })

  it('autoConcurrent 且 hc=16 时钳制到 10', () => {
    expect(resolveConcurrency({ autoConcurrent: true, concurrentLimit: 3 }, 16)).toBe(10)
  })

  it('autoConcurrent 且 hc=0 时回退 4', () => {
    expect(resolveConcurrency({ autoConcurrent: true, concurrentLimit: 3 }, 0)).toBe(4)
  })

  it('autoConcurrent 且 hc 缺省时回退 4', () => {
    expect(resolveConcurrency({ autoConcurrent: true, concurrentLimit: 3 })).toBe(4)
  })

  it('autoConcurrent=false 且 concurrentLimit=5 时返回 5', () => {
    expect(resolveConcurrency({ autoConcurrent: false, concurrentLimit: 5 })).toBe(5)
  })

  it('autoConcurrent=false 且 concurrentLimit=0 时回退 3', () => {
    expect(resolveConcurrency({ autoConcurrent: false, concurrentLimit: 0 })).toBe(3)
  })
})
