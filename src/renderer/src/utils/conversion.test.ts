/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import { describe, it, expect } from 'vitest'
import { runConversionBatches } from './conversion'

interface FakeFile {
  id: string
}

function file(id: string): FakeFile {
  return { id }
}

const neverAbort = (): boolean => false
const neverStale = (): boolean => false

describe('runConversionBatches', () => {
  it('never rejects when a converter rejects — item classified as failed, remaining items still processed', async () => {
    const files = [file('a'), file('b'), file('c')]
    const convert = async (f: FakeFile): Promise<{ success: boolean }> => {
      if (f.id === 'b') throw new Error('ipc exploded')
      return { success: true }
    }

    const result = await runConversionBatches({
      files,
      limit: 1,
      convert,
      shouldAbort: neverAbort,
      isStale: neverStale
    })

    expect(result.interrupted).toBe(false)
    expect(result.success.map((f) => f.id)).toEqual(['a', 'c'])
    expect(result.failed.map((f) => f.id)).toEqual(['b'])
  })

  it('skips files whose status was reset to pending before the result resolved (isStale true) — counted neither as success nor failure', async () => {
    const files = [file('a'), file('b')]
    const stale = new Set(['b'])
    const convert = async (f: FakeFile): Promise<{ success: boolean }> => {
      if (f.id === 'b') throw new Error('conversion was cancelled')
      return { success: true }
    }

    const result = await runConversionBatches({
      files,
      limit: 2,
      convert,
      shouldAbort: neverAbort,
      isStale: (f) => stale.has(f.id)
    })

    expect(result.interrupted).toBe(false)
    expect(result.success.map((f) => f.id)).toEqual(['a'])
    expect(result.failed).toEqual([])
  })

  it('interrupts between batches once shouldAbort becomes true, leaving remaining files untouched', async () => {
    const files = [file('a'), file('b'), file('c'), file('d')]
    const converted: string[] = []
    const convert = async (f: FakeFile): Promise<{ success: boolean }> => {
      converted.push(f.id)
      return { success: true }
    }

    const result = await runConversionBatches({
      files,
      limit: 2,
      convert,
      shouldAbort: () => converted.length >= 2,
      isStale: neverStale
    })

    expect(result.interrupted).toBe(true)
    expect(result.success.map((f) => f.id)).toEqual(['a', 'b'])
    expect(result.failed).toEqual([])
    expect(converted).toEqual(['a', 'b'])
  })

  it('interrupts immediately without converting anything when aborted before the first batch', async () => {
    const files = [file('a'), file('b')]
    const convert = async (f: FakeFile): Promise<{ success: boolean }> => {
      throw new Error('should never be called')
    }

    const result = await runConversionBatches({
      files,
      limit: 2,
      convert,
      shouldAbort: () => true,
      isStale: neverStale
    })

    expect(result.interrupted).toBe(true)
    expect(result.success).toEqual([])
    expect(result.failed).toEqual([])
  })

  it('returns the full success list when every conversion succeeds', async () => {
    const files = [file('a'), file('b'), file('c')]
    const convert = async (f: FakeFile): Promise<{ success: boolean }> => ({ success: true })

    const result = await runConversionBatches({
      files,
      limit: 3,
      convert,
      shouldAbort: neverAbort,
      isStale: neverStale
    })

    expect(result.interrupted).toBe(false)
    expect(result.success.map((f) => f.id)).toEqual(['a', 'b', 'c'])
    expect(result.failed).toEqual([])
  })

  it('splits a mixed batch into success and failed while skipping stale files', async () => {
    const files = [file('a'), file('b'), file('c'), file('d')]
    const stale = new Set(['d'])
    const convert = async (f: FakeFile): Promise<{ success: boolean }> => {
      if (f.id === 'b') return { success: false }
      if (f.id === 'c') throw new Error('boom')
      return { success: true }
    }

    const result = await runConversionBatches({
      files,
      limit: 2,
      convert,
      shouldAbort: neverAbort,
      isStale: (f) => stale.has(f.id)
    })

    expect(result.interrupted).toBe(false)
    expect(result.success.map((f) => f.id)).toEqual(['a'])
    expect(result.failed.map((f) => f.id)).toEqual(['b', 'c'])
  })
})
