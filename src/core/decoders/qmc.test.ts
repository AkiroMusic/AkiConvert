/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * Unit tests for qmc.ts — QMCv1 static-mask roundtrip.
 *
 * Covers:
 *   - QMCv1 decryption roundtrip for buffers longer than the 32768-byte mask
 *     (regression for the off-by-one `i % 32767` bug, which corrupted every
 *     byte at index >= 32768).
 */
import { describe, it, expect } from 'vitest'
import { decryptBuffer, V1_MASK } from './qmc'

describe('QMCv1 static mask', () => {
  it('decrypts a 33000-byte buffer, wrapping the mask at i % 32768', () => {
    const len = 33000
    const plain = new Uint8Array(len)
    let seed = 0x12345678
    for (let i = 0; i < len; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0
      plain[i] = seed & 0xff
    }

    // Encrypt (XOR is symmetric) with the mask indexed by i % 32768.
    // Byte 32768 is the divergence point: it needs mask[0], not mask[1].
    const enc = new Uint8Array(len)
    for (let i = 0; i < len; i++) enc[i] = plain[i] ^ V1_MASK[i % 32768]

    const { audio } = decryptBuffer(enc)

    expect(audio).toEqual(plain)
  })
})
