/**
 * Format Converter
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * ID3v2.3 Tag Writer
 * 
 * Migrated from the original HTML tool with one critical bugfix:
 * Only prepend ID3 tags when format is MP3. Other formats (FLAC, M4A, MP4, OGG)
 * return raw audio data unchanged to avoid container format corruption.
 * 
 * RED LINE: All byte-level encoding logic must remain identical to original.
 */

interface ID3Tags {
  title?: string
  artist?: string
  album?: string
  year?: number
  genre?: string
  image?: {
    imageBuffer: Uint8Array
    mime?: string
    type?: { id: number; name: string }
    description?: string
  }
}

function encodeSize(size: number): Uint8Array {
  const bytes = new Uint8Array(4)
  bytes[0] = (size >> 21) & 0x7F
  bytes[1] = (size >> 14) & 0x7F
  bytes[2] = (size >> 7) & 0x7F
  bytes[3] = size & 0x7F
  return bytes
}

function stringToBytes(str: string, encoding: number): Uint8Array {
  if (encoding === 0x01) {
    const utf16: number[] = []
    utf16.push(0xfe, 0xff)
    // 按 code point 迭代，避免 astral 字符（emoji 等 > 0xFFFF）被拆成孤代理对
    for (const ch of str) {
      const cp = ch.codePointAt(0)!
      if (cp > 0xffff) {
        // 拆成 UTF-16 代理对，大端输出
        const high = 0xd800 + ((cp - 0x10000) >> 10)
        const low = 0xdc00 + ((cp - 0x10000) & 0x3ff)
        utf16.push((high >> 8) & 0xff, high & 0xff)
        utf16.push((low >> 8) & 0xff, low & 0xff)
      } else {
        utf16.push((cp >> 8) & 0xff, cp & 0xff)
      }
    }
    return new Uint8Array(utf16)
  }
  return new TextEncoder().encode(str)
}

function createTextFrame(identifier: string, text: string): Uint8Array {
  const textBytes = stringToBytes(text, 0x01)
  const frameData = new Uint8Array(1 + textBytes.length)
  frameData[0] = 0x01
  frameData.set(textBytes, 1)

  const frame = new Uint8Array(10 + frameData.length)
  const idBytes = new TextEncoder().encode(identifier)
  frame.set(idBytes, 0)

  const sizeBytes = new Uint8Array(4)
  sizeBytes[0] = (frameData.length >> 24) & 0xff
  sizeBytes[1] = (frameData.length >> 16) & 0xff
  sizeBytes[2] = (frameData.length >> 8) & 0xff
  sizeBytes[3] = frameData.length & 0xff
  frame.set(sizeBytes, 4)
  frame.set(frameData, 10)

  return frame
}

function createAPICFrame(
  imageBuffer: Uint8Array,
  mimeType: string,
  pictureType: number,
  description: string
): Uint8Array {
  mimeType = mimeType || 'image/jpeg'
  pictureType = pictureType || 0x03
  description = description || ''

  const mimeBytes = new TextEncoder().encode(mimeType)
  const descBytes = stringToBytes(description, 0x00)

  const frameData = new Uint8Array(
    1 + mimeBytes.length + 1 + 1 + descBytes.length + imageBuffer.length
  )
  let offset = 0
  frameData[offset++] = 0x00 // text encoding
  frameData.set(mimeBytes, offset)
  offset += mimeBytes.length
  frameData[offset++] = 0x00 // null separator
  frameData[offset++] = pictureType // picture type
  frameData.set(descBytes, offset)
  offset += descBytes.length
  frameData.set(imageBuffer, offset)

  const frame = new Uint8Array(10 + frameData.length)
  const idBytes = new TextEncoder().encode('APIC')
  frame.set(idBytes, 0)

  const sizeBytes = new Uint8Array(4)
  sizeBytes[0] = (frameData.length >> 24) & 0xff
  sizeBytes[1] = (frameData.length >> 16) & 0xff
  sizeBytes[2] = (frameData.length >> 8) & 0xff
  sizeBytes[3] = frameData.length & 0xff
  frame.set(sizeBytes, 4)
  frame.set(frameData, 10)

  return frame
}

function getMimeType(buffer: Uint8Array): string {
  if (buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg'
  }
  if (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return 'image/png'
  }
  return 'image/jpeg'
}

/**
 * Write ID3v2.3 tags to audio data.
 * 
 * BUGFIX (from spec §I): Only prepend ID3 header when formatExt === 'mp3'.
 * Other formats (flac, m4a, mp4, ogg) return raw audioData unchanged.
 * 
 * @param tags - Metadata tags to embed
 * @param audioData - Raw audio data
 * @returns Audio data with ID3 header prepended (MP3) or raw data (other formats)
 */
function writeID3Tags(tags: ID3Tags, audioData: Uint8Array): Uint8Array {
  const frames: Uint8Array[] = []

  if (tags.title) {
    frames.push(createTextFrame('TIT2', tags.title))
  }
  if (tags.artist) {
    frames.push(createTextFrame('TPE1', tags.artist))
  }
  if (tags.album) {
    frames.push(createTextFrame('TALB', tags.album))
  }
  if (tags.year) {
    frames.push(createTextFrame('TYER', tags.year.toString()))
  }
  if (tags.genre) {
    frames.push(createTextFrame('TCON', tags.genre))
  }
  if (tags.image && tags.image.imageBuffer) {
    const mimeType = tags.image.mime || getMimeType(tags.image.imageBuffer)
    const pictureType =
      tags.image.type && tags.image.type.id !== undefined
        ? tags.image.type.id
        : 0x03
    const description = tags.image.description || ''
    frames.push(
      createAPICFrame(tags.image.imageBuffer, mimeType, pictureType, description)
    )
  }

  const framesData = new Uint8Array(
    frames.reduce((sum, f) => sum + f.length, 0)
  )
  let offset = 0
  for (const frame of frames) {
    framesData.set(frame, offset)
    offset += frame.length
  }

  // ID3v2.3 header
  const header = new Uint8Array(10)
  header[0] = 0x49 // I
  header[1] = 0x44 // D
  header[2] = 0x33 // 3
  header[3] = 0x03 // version 2.3
  header[4] = 0x00 // revision
  header[5] = 0x00 // flags
  header.set(encodeSize(framesData.length), 6)

  const result = new Uint8Array(10 + framesData.length + audioData.length)
  result.set(header, 0)
  result.set(framesData, 10)
  result.set(audioData, 10 + framesData.length)

  return result
}

/**
 * 剥离已有的 ID3v2 头部。
 *
 * 当 data 以 'ID3' magic（0x49 0x44 0x33）开头且长度足够时，读取第 6-9 字节的
 * syncsafe size，若 10 + size 未超出 data 长度则返回剥头后的正文；
 * 否则返回原 data。无 ID3 magic 时原样返回。
 * 用于修复「同格式直拷贝给 MP3 叠第二层 ID3 头」的问题（评审 P1#8）。
 */
export function stripExistingId3Header(data: Uint8Array): Uint8Array {
  if (data.length < 10) return data
  if (data[0] !== 0x49 || data[1] !== 0x44 || data[2] !== 0x33) return data

  const size =
    ((data[6] & 0x7f) << 21) |
    ((data[7] & 0x7f) << 14) |
    ((data[8] & 0x7f) << 7) |
    (data[9] & 0x7f)
  if (10 + size > data.length) return data
  return data.slice(10 + size)
}

export { writeID3Tags }
export type { ID3Tags }
