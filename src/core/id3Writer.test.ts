/**
 * Format Converter
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * Unit tests for id3Writer.ts — ID3v2.3 tag writer.
 *
 * Covers:
 *   - ID3v2.3 header structure ('ID3', version 0x0300)
 *   - Text frames (TIT2, TPE1, TALB, TYER, TCON)
 *   - APIC frame (cover art)
 *   - Edge cases (empty tags, long strings)
 */

import { describe, it, expect } from 'vitest'
import { writeID3Tags, stripExistingId3Header } from './id3Writer'

describe('writeID3Tags', () => {
  const dummyAudio = new Uint8Array([0xff, 0xfb, 0x90, 0x00]) // MPEG sync frame

  // -----------------------------------------------------------------------
  // Header
  // -----------------------------------------------------------------------
  describe('ID3v2.3 header', () => {
    it('should prepend "ID3" magic bytes with version 0x0300', () => {
      const result = writeID3Tags({}, dummyAudio)
      expect(result[0]).toBe(0x49) // 'I'
      expect(result[1]).toBe(0x44) // 'D'
      expect(result[2]).toBe(0x33) // '3'
      expect(result[3]).toBe(0x03) // version 2.3
      expect(result[4]).toBe(0x00) // revision
      expect(result[5]).toBe(0x00) // flags
    })

    it('should use sync-safe integer for tag size', () => {
      const result = writeID3Tags({ title: 'A' }, dummyAudio)
      // bytes 6-9 are the sync-safe size of frames data
      // For just TIT2 frame (~20 bytes + overhead), size should be small
      const size =
        (result[6] << 21) |
        (result[7] << 14) |
        (result[8] << 7) |
        result[9]
      expect(size).toBeGreaterThan(0)
      // Verify sync-safe: top bit of each byte must be 0
      expect(result[6] & 0x80).toBe(0)
      expect(result[7] & 0x80).toBe(0)
      expect(result[8] & 0x80).toBe(0)
      expect(result[9] & 0x80).toBe(0)
    })
  })

  // -----------------------------------------------------------------------
  // Text frames
  // -----------------------------------------------------------------------
  describe('text frames', () => {
    it('should embed TIT2 frame for title', () => {
      const result = writeID3Tags({ title: 'Test Song' }, dummyAudio)
      const headerStr = new TextDecoder('latin1').decode(result.slice(0, 3))
      expect(headerStr).toBe('ID3')
      // Find TIT2 frame in the tag data (starts at offset 10)
      const tagData = result.slice(10)
      const tit2Offset = findFrame(tagData, 'TIT2')
      expect(tit2Offset).not.toBe(-1)
    })

    it('should embed TPE1 frame for artist', () => {
      const result = writeID3Tags({ artist: 'Test Artist' }, dummyAudio)
      const tagData = result.slice(10)
      expect(findFrame(tagData, 'TPE1')).not.toBe(-1)
    })

    it('should embed TALB frame for album', () => {
      const result = writeID3Tags({ album: 'Test Album' }, dummyAudio)
      const tagData = result.slice(10)
      expect(findFrame(tagData, 'TALB')).not.toBe(-1)
    })

    it('should embed TYER frame for year', () => {
      const result = writeID3Tags({ year: 2024 }, dummyAudio)
      const tagData = result.slice(10)
      expect(findFrame(tagData, 'TYER')).not.toBe(-1)
    })

    it('should embed TCON frame for genre', () => {
      const result = writeID3Tags({ genre: 'Pop' }, dummyAudio)
      const tagData = result.slice(10)
      expect(findFrame(tagData, 'TCON')).not.toBe(-1)
    })

    it('should embed all text frames when all tags are provided', () => {
      const result = writeID3Tags({
        title: 'T',
        artist: 'A',
        album: 'Al',
        year: 2024,
        genre: 'G'
      }, dummyAudio)
      const tagData = result.slice(10)
      expect(findFrame(tagData, 'TIT2')).not.toBe(-1)
      expect(findFrame(tagData, 'TPE1')).not.toBe(-1)
      expect(findFrame(tagData, 'TALB')).not.toBe(-1)
      expect(findFrame(tagData, 'TYER')).not.toBe(-1)
      expect(findFrame(tagData, 'TCON')).not.toBe(-1)
    })
  })

  // -----------------------------------------------------------------------
  // APIC (cover art) frame
  // -----------------------------------------------------------------------
  describe('APIC frame', () => {
    it('should embed APIC frame with JPEG image', () => {
      // Minimal JPEG-like data (just the SOI marker)
      const jpegData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])
      const result = writeID3Tags({
        image: {
          imageBuffer: jpegData,
          mime: 'image/jpeg'
        }
      }, dummyAudio)
      const tagData = result.slice(10)
      expect(findFrame(tagData, 'APIC')).not.toBe(-1)
    })

    it('should detect MIME type from image buffer', () => {
      const jpegData = new Uint8Array([0xff, 0xd8, 0xff, 0xe0])
      const pngData = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
      const resultJpeg = writeID3Tags({
        image: { imageBuffer: jpegData }
      }, dummyAudio)
      const resultPng = writeID3Tags({
        image: { imageBuffer: pngData, mime: 'image/png' }
      }, dummyAudio)
      expect(findFrame(resultJpeg.slice(10), 'APIC')).not.toBe(-1)
      expect(findFrame(resultPng.slice(10), 'APIC')).not.toBe(-1)
    })
  })

  // -----------------------------------------------------------------------
  // Audio data preservation
  // -----------------------------------------------------------------------
  describe('audio data preservation', () => {
    it('should append original audio after the ID3 header', () => {
      const result = writeID3Tags({ title: 'T' }, dummyAudio)
      // The audio should be at the end of the result
      const audioStart = result.length - dummyAudio.length
      expect(result.slice(audioStart)).toEqual(dummyAudio)
    })
  })

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------
  describe('edge cases', () => {
    it('should handle empty tags gracefully', () => {
      const result = writeID3Tags({}, dummyAudio)
      // Should still have ID3 header with size 0 + audio data
      expect(result.length).toBe(10 + dummyAudio.length) // header only, no frames
      expect(result.slice(10)).toEqual(dummyAudio)
    })

    it('should handle long strings', () => {
      const longTitle = 'A'.repeat(500)
      const result = writeID3Tags({ title: longTitle }, dummyAudio)
      expect(result.length).toBeGreaterThan(dummyAudio.length)
      const tagData = result.slice(10)
      expect(findFrame(tagData, 'TIT2')).not.toBe(-1)
    })

    it('should handle unicode characters in tags', () => {
      const result = writeID3Tags({
        title: '你好世界',       // Chinese
        artist: '歌手名',        // Japanese-adjacent
        album: 'Album アルバム'
      }, dummyAudio)
      const tagData = result.slice(10)
      expect(findFrame(tagData, 'TIT2')).not.toBe(-1)
      expect(findFrame(tagData, 'TPE1')).not.toBe(-1)
      expect(findFrame(tagData, 'TALB')).not.toBe(-1)
    })

    it('should encode BMP unicode (Chinese) as UTF-16BE unchanged', () => {
      const result = writeID3Tags({ title: '你好世界' }, dummyAudio)
      const tagData = result.slice(10)
      const offset = findFrame(tagData, 'TIT2')
      expect(offset).not.toBe(-1)
      const frameSize = readFrameSize(tagData, offset)
      // 10 字节帧头 + 1 字节编码标志 + BOM(2) + 每字符 2 字节大端
      const textBytes = tagData.slice(offset + 11, offset + 10 + frameSize)
      expect(Array.from(textBytes)).toEqual([
        0xfe, 0xff,
        0x4f, 0x60, // 你
        0x59, 0x7d, // 好
        0x4e, 0x16, // 世
        0x75, 0x4c  // 界
      ])
    })

    it('should encode astral characters (emoji) as UTF-16 surrogate pairs', () => {
      const result = writeID3Tags({ title: '🎵' }, dummyAudio)
      const tagData = result.slice(10)
      const offset = findFrame(tagData, 'TIT2')
      expect(offset).not.toBe(-1)
      const frameSize = readFrameSize(tagData, offset)
      // 10 字节帧头 + 1 字节编码标志 + BOM(2) + 代理对(4)
      const textBytes = tagData.slice(offset + 11, offset + 10 + frameSize)
      expect(textBytes.length).toBe(6)
      // 🎵 = U+1F3B5 → 代理对 0xD83C 0xDFB5
      expect(Array.from(textBytes.slice(2))).toEqual([0xd8, 0x3c, 0xdf, 0xb5])
      // 剥离 BOM 后用 UTF-16BE 解码应还原 '🎵'
      const decoded = new TextDecoder('utf-16be').decode(textBytes.slice(2))
      expect(decoded).toBe('🎵')
    })
  })
})

// -----------------------------------------------------------------------
// stripExistingId3Header
// -----------------------------------------------------------------------
describe('stripExistingId3Header', () => {
  it('should strip a valid ID3v2 header and return the payload', () => {
    const header = new Uint8Array([
      0x49, 0x44, 0x33, // 'ID3'
      0x03, 0x00, 0x00, // version + revision + flags
      0x00, 0x00, 0x00, 0x05 // syncsafe size = 5
    ])
    const tagBody = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd, 0xee]) // 头部声明的 5 字节标签体
    const payload = new Uint8Array([1, 2, 3, 4, 5]) // 剥头后保留的正文（音频帧）
    const data = new Uint8Array(
      header.length + tagBody.length + payload.length
    )
    data.set(header, 0)
    data.set(tagBody, header.length)
    data.set(payload, header.length + tagBody.length)
    const stripped = stripExistingId3Header(data)
    expect(Array.from(stripped)).toEqual(Array.from(payload))
  })

  it('should return data unchanged when no ID3 magic is present', () => {
    const data = new Uint8Array([
      0x4d, 0x50, 0x33, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01
    ])
    const stripped = stripExistingId3Header(data)
    expect(stripped).toEqual(data)
  })

  it('should not throw and return data unchanged when shorter than 10 bytes', () => {
    const data = new Uint8Array([0x49, 0x44, 0x33])
    let stripped: Uint8Array
    expect(() => {
      stripped = stripExistingId3Header(data)
    }).not.toThrow()
    expect(stripped!).toEqual(data)
  })

  it('should return data unchanged when declared size exceeds data length', () => {
    // 头部声明 1000 字节正文，但实际数据不够（syncsafe 0x07D0 = 2000）
    const data = new Uint8Array(15)
    data.set(
      [0x49, 0x44, 0x33, 0x03, 0x00, 0x00, 0x00, 0x00, 0x07, 0xd0],
      0
    )
    const stripped = stripExistingId3Header(data)
    expect(stripped).toEqual(data)
  })
})

/**
 * 读取帧头（10 字节）中的 4 字节帧大小。
 */
function readFrameSize(tagData: Uint8Array, frameOffset: number): number {
  return (
    (tagData[frameOffset + 4] << 24) |
    (tagData[frameOffset + 5] << 16) |
    (tagData[frameOffset + 6] << 8) |
    tagData[frameOffset + 7]
  )
}

/**
 * Find a frame by its 4-byte identifier within tag data.
 * @returns offset of frame identifier within tagData, or -1 if not found
 */
function findFrame(tagData: Uint8Array, frameId: string): number {
  const idBytes = new TextEncoder().encode(frameId)
  if (idBytes.length !== 4) return -1

  let offset = 0
  while (offset + 10 <= tagData.length) {
    // Check frame identifier
    let match = true
    for (let i = 0; i < 4; i++) {
      if (tagData[offset + i] !== idBytes[i]) {
        match = false
        break
      }
    }
    if (match) return offset

    // Read frame size to advance to next frame
    const frameSize =
      (tagData[offset + 4] << 24) |
      (tagData[offset + 5] << 16) |
      (tagData[offset + 6] << 8) |
      tagData[offset + 7]
    offset += 10 + frameSize // 10 bytes header + frame data
  }
  return -1
}
