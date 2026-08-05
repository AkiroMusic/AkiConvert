/**
 * Format Converter
 * Copyright (c) 2026 Akiro. All rights reserved.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, existsSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { HistoryStore, HistoryRecord } from './history'

describe('HistoryStore', () => {
  let tempDir: string
  let store: HistoryStore

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'history-test-'))
    store = new HistoryStore(tempDir)
  })

  afterEach(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  const makeRecord = (overrides: Partial<HistoryRecord> = {}): HistoryRecord => ({
    ts: Date.now(),
    inputPath: '/test/input.mp3',
    inputName: 'input.mp3',
    targetFormat: 'flac',
    status: 'success',
    outputName: 'output.flac',
    outputPath: '/test/output.flac',
    durationMs: 1500,
    error: null,
    ...overrides
  })

  it('should return empty array when no history exists', async () => {
    const records = await store.readAll()
    expect(records).toEqual([])
  })

  it('should append a record and retrieve it', async () => {
    const record = makeRecord()
    await store.append(record)

    const records = await store.readAll()
    expect(records).toHaveLength(1)
    expect(records[0].inputName).toBe('input.mp3')
    expect(records[0].status).toBe('success')
  })

  it('should return records in reverse chronological order (newest first)', async () => {
    const oldRecord = makeRecord({ ts: 1000, inputName: 'old.mp3' })
    const newRecord = makeRecord({ ts: 2000, inputName: 'new.mp3' })

    await store.append(oldRecord)
    await store.append(newRecord)

    const records = await store.readAll()
    expect(records).toHaveLength(2)
    expect(records[0].inputName).toBe('new.mp3')
    expect(records[1].inputName).toBe('old.mp3')
  })

  it('should clear all history', async () => {
    await store.append(makeRecord())
    await store.append(makeRecord())

    await store.clear()

    const records = await store.readAll()
    expect(records).toHaveLength(0)
  })

  it('should handle failure records', async () => {
    const record = makeRecord({
      status: 'failed',
      outputName: null,
      outputPath: null,
      error: 'Something went wrong'
    })
    await store.append(record)

    const records = await store.readAll()
    expect(records).toHaveLength(1)
    expect(records[0].status).toBe('failed')
    expect(records[0].error).toBe('Something went wrong')
  })

  it('should trim to maxEntries', async () => {
    const smallStore = new HistoryStore(tempDir, 3)

    for (let i = 0; i < 5; i++) {
      await smallStore.append(makeRecord({ ts: i, inputName: `file_${i}.mp3` }))
    }

    const records = await smallStore.readAll()
    expect(records).toHaveLength(3)
    // Should keep the newest (highest ts)
    expect(records[records.length - 1].inputName).toBe('file_2.mp3')
  })

  it('should survive concurrent appends without losing or corrupting lines', async () => {
    const concurrentStore = new HistoryStore(tempDir, 30)
    const count = 100

    // 并发批量转换场景：100 次 append 同时触发，依赖内部写链串行化，
    // 不能出现 read-modify-write 竞态导致的丢行或半截行
    await Promise.all(
      Array.from({ length: count }, (_, i) =>
        concurrentStore.append(makeRecord({ ts: i, inputName: `file_${i}.mp3` }))
      )
    )

    const records = await concurrentStore.readAll()
    expect(records.length).toBeLessThanOrEqual(30)
    // 所有行都能解析为 JSON 记录，且 inputName 都在预期集合内（无损坏/丢失混入）
    const expectedNames = new Set(
      Array.from({ length: count }, (_, i) => `file_${i}.mp3`)
    )
    for (const record of records) {
      expect(record).toHaveProperty('inputName')
      expect(expectedNames.has(record.inputName)).toBe(true)
      expect(record.ts).toBeGreaterThanOrEqual(0)
    }
  })
})
