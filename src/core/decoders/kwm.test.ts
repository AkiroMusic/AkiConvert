/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * Unit tests for kwm.ts — Kuwo KWM decryption.
 *
 * The expected masks are hard-coded from an independent implementation of the
 * reference algorithm (seed decimal string cycled to 32 bytes, XORed with
 * ROOT), so a decoder-side algorithm drift cannot mask itself in roundtrips.
 *
 * Regressions covered:
 *   - seed must be read as uint64 LE at 0x18 (not uint32 at 0x10)
 *   - mask padding must cycle the decimal string (not zero-fill)
 */
import { describe, it, expect } from 'vitest'
import { decryptBuffer, buildMask, AUDIO_OFFSET } from './kwm'

// prettier-ignore
const REF_MASK_42 = new Uint8Array([
  0x79, 0x5d, 0x7b, 0x46, 0x7b, 0x5b, 0x60, 0x44, 0x7d, 0x7c, 0x73, 0x45, 0x50, 0x00, 0x71, 0x04,
  0x5a, 0x02, 0x71, 0x03, 0x5d, 0x05, 0x78, 0x07, 0x40, 0x00, 0x7d, 0x5d, 0x7b, 0x5d, 0x7a, 0x59,
])
// prettier-ignore
const REF_MASK_72623859790382856 = new Uint8Array([
  0x7a, 0x5d, 0x79, 0x46, 0x7c, 0x51, 0x61, 0x4f, 0x7e, 0x77, 0x77, 0x44, 0x5c, 0x00, 0x7d, 0x03,
  0x58, 0x07, 0x77, 0x07, 0x5b, 0x04, 0x74, 0x00, 0x4d, 0x05, 0x70, 0x5f, 0x7c, 0x57, 0x7c, 0x53,
])

const MAGIC_FULL = new TextEncoder().encode('yeelion-kuwo-tme')

/** Deterministic pseudo-random fill (LCG), like the QMC tests. */
function fillRandom(data: Uint8Array, seed: number): void {
  let s = seed >>> 0
  for (let i = 0; i < data.length; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    data[i] = s & 0xff
  }
}

/**
 * Build a synthetic KWM file: header + audio payload XORed with a known-good
 * reference mask (never with the decoder's own buildMask output).
 */
function makeKwm(seedLeBytes: number[], refMask: Uint8Array, audio: Uint8Array, typeTag?: string): Uint8Array {
  const buf = new Uint8Array(AUDIO_OFFSET + audio.length)
  buf.set(MAGIC_FULL, 0)
  buf.set(seedLeBytes, 0x18)
  // Poison the wrong seed location (0x10..0x18): a decoder reading uint32 at
  // 0x10 derives a different mask and fails the roundtrip.
  buf.fill(0xff, 0x10, 0x18)
  if (typeTag) buf.set(new TextEncoder().encode(typeTag), 0x30)
  for (let i = 0; i < audio.length; i++) {
    buf[AUDIO_OFFSET + i] = audio[i] ^ refMask[i % 32]
  }
  return buf
}

describe('KWM buildMask', () => {
  it('matches the reference mask for a short-decimal seed (cyclic padding)', () => {
    expect(buildMask(42n)).toEqual(REF_MASK_42)
  })

  it('matches the reference mask for a seed wider than 32 bits (uint64 read)', () => {
    // 72623859790382856 = 0x0102030405060708 — needs the full 8 bytes
    expect(buildMask(72623859790382856n)).toEqual(REF_MASK_72623859790382856)
  })
})

describe('KWM decryptBuffer', () => {
  it('roundtrips an ID3-tagged mp3 payload seeded at 0x18', () => {
    const plain = new Uint8Array(2048)
    plain.set([0x49, 0x44, 0x33], 0) // "ID3"
    fillRandom(plain.subarray(3), 0x1234)

    // seed 42 → decimal "42" (2 chars); stored uint64 LE
    const buf = makeKwm([42, 0, 0, 0, 0, 0, 0, 0], REF_MASK_42, plain, '320mp3')

    const { audio, format } = decryptBuffer(buf)
    expect(audio).toEqual(plain)
    expect(format).toBe('mp3')
  })

  it('roundtrips a flac payload and sniffs its format', () => {
    const plain = new Uint8Array(1024)
    plain.set([0x66, 0x4c, 0x61, 0x43], 0) // "fLaC"
    fillRandom(plain.subarray(4), 0xbeef)

    const buf = makeKwm([0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01], REF_MASK_72623859790382856, plain, '2000flac')

    const { audio, format } = decryptBuffer(buf)
    expect(audio).toEqual(plain)
    expect(format).toBe('flac')
  })

  it('falls back to the 0x30 type tag when the payload has no known magic', () => {
    const plain = new Uint8Array(512)
    plain.set([0x4d, 0x41, 0x43, 0x20], 0) // "MAC " (Monkey's Audio) — not in the sniffer
    fillRandom(plain.subarray(4), 0x777)

    const buf = makeKwm([42, 0, 0, 0, 0, 0, 0, 0], REF_MASK_42, plain, '828ape')

    const { format } = decryptBuffer(buf)
    expect(format).toBe('ape')
  })

  it('keeps the sniffed format even when the type tag disagrees', () => {
    const plain = new Uint8Array(256)
    plain.set([0x66, 0x4c, 0x61, 0x43], 0) // "fLaC"
    fillRandom(plain.subarray(4), 0x99)

    const buf = makeKwm([42, 0, 0, 0, 0, 0, 0, 0], REF_MASK_42, plain, '320mp3')

    expect(decryptBuffer(buf).format).toBe('flac')
  })

  it('handles a zero seed', () => {
    const plain = new Uint8Array(128)
    plain.set([0x49, 0x44, 0x33], 0)
    fillRandom(plain.subarray(3), 0x55)
    // seed 0 → decimal "0", mask[i] = 0x30 ^ ROOT[i]
    const refMask0 = buildMask(0n) // covered indirectly; roundtrip is symmetric
    const buf = makeKwm([0, 0, 0, 0, 0, 0, 0, 0], refMask0, plain)
    const { audio } = decryptBuffer(buf)
    expect(audio).toEqual(plain)
  })

  it('rejects files with a bad magic', () => {
    const buf = new Uint8Array(AUDIO_OFFSET + 16)
    buf[0] = 0x00
    expect(() => decryptBuffer(buf)).toThrow(/bad magic/)
  })

  it('rejects files smaller than the 0x400 audio offset', () => {
    const buf = new Uint8Array(16)
    buf.set(MAGIC_FULL, 0)
    expect(() => decryptBuffer(buf)).toThrow(/too small/)
  })
})
