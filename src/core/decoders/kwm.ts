/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 *
 * KWM (Kuwo Music) decoder — pure TypeScript, no native deps.
 *
 * Format ("yeelion-kuwo-tme"):
 *   0x000  16B  magic "yeelion-kuwo-tme"
 *   0x018   8B  seed — uint64 LE; its decimal digits key the payload mask
 *   0x030   8B  NUL-padded "bitrate+type" tag, e.g. "320mp3" / "2000flac"
 *   0x400   -   audio payload, XORed with a 32-byte repeating mask
 *
 * Mask: decimal string of the seed cycled to 32 bytes, then XORed per byte
 * with ROOT. Algorithm matches the reference unlock-music implementations.
 */

import { DecoderResult } from './types'
import { sniffAudioExt } from './utils'

const MAGIC = new Uint8Array([0x79, 0x65, 0x65, 0x6c, 0x69, 0x6f, 0x6e, 0x2d, 0x6b, 0x75, 0x77, 0x6f])
const ROOT = new TextEncoder().encode('MoOtOiTvINGwd2E6n0E1i7L5t2IoOoNk')
const MASK_SIZE = 32
const AUDIO_OFFSET = 0x400
const SEED_OFFSET = 0x18
const TYPE_OFFSET = 0x30
const TYPE_SIZE = 8

function readBigUint64LE(data: Uint8Array, offset: number): bigint {
  let value = 0n
  for (let i = 7; i >= 0; i--) {
    value = (value << 8n) | BigInt(data[offset + i])
  }
  return value
}

function buildMask(seed: bigint): Uint8Array {
  const decimal = seed.toString(10)
  const mask = new Uint8Array(MASK_SIZE)
  for (let i = 0; i < MASK_SIZE; i++) {
    mask[i] = decimal.charCodeAt(i % decimal.length) ^ ROOT[i]
  }
  return mask
}

/**
 * Parse the NUL-padded "bitrate+type" tag at 0x30 (e.g. "320mp3") and
 * return the declared payload type ("mp3"), or null when absent/malformed.
 */
function parseFormatHint(kwmBuf: Uint8Array): string | null {
  let tag = ''
  for (let i = TYPE_OFFSET; i < TYPE_OFFSET + TYPE_SIZE; i++) {
    if (kwmBuf[i] === 0) break
    tag += String.fromCharCode(kwmBuf[i])
  }
  const match = /^\d+([a-z0-9]+)$/i.exec(tag)
  return match ? match[1].toLowerCase() : null
}

export function decryptBuffer(kwmBuf: Uint8Array): DecoderResult {
  if (kwmBuf.length < AUDIO_OFFSET) {
    throw new Error('KWM: file too small (' + kwmBuf.length + ' < ' + AUDIO_OFFSET + ')')
  }
  for (let i = 0; i < MAGIC.length; i++) {
    if (kwmBuf[i] !== MAGIC[i]) {
      throw new Error('KWM: bad magic, expected "yeelion-kuwo" at offset 0')
    }
  }

  const seed = readBigUint64LE(kwmBuf, SEED_OFFSET)
  const mask = buildMask(seed)

  const audio = new Uint8Array(kwmBuf.slice(AUDIO_OFFSET))
  for (let i = 0; i < audio.length; i++) {
    audio[i] ^= mask[i % MASK_SIZE]
  }

  // Trust the decrypted bytes when they carry a known container signature;
  // fall back to the header's declared type for payloads sniffing can't
  // identify (e.g. APE/WMA), and to plain "mp3" otherwise.
  const sniffed = sniffAudioExt(audio)
  const format = sniffed ?? parseFormatHint(kwmBuf) ?? 'mp3'
  return { audio, format }
}

export { buildMask, MAGIC, ROOT, AUDIO_OFFSET, SEED_OFFSET }
