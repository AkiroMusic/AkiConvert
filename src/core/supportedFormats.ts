/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * 单一格式事实源（Single Source of Truth）模块。
 *
 * 所有受支持的音频格式列表都集中定义在此处，供主进程、渲染进程与
 * 转换流程统一引用，避免多个文件各自维护一份格式列表导致不一致。
 *
 * 本模块为纯常量 + 纯函数，顶层零 import，无副作用，可在 Node 与
 * Web 两种编译环境下直接使用。
 */

/** 加密音频格式（含 vpr/tkm/kgg —— 它们已有可用的解码器） */
export const ENCRYPTED_EXTS: string[] = [
  '.ncm', '.kwm', '.kgm', '.kgma',
  '.vpr', '.qmc0', '.qmc3', '.qmcflac',
  '.qmcogg', '.qmc1', '.qmc2', '.tkm',
  '.mflac', '.mflac0', '.mgg', '.bkc',
  '.kgg', '.kgg.flac',
]

/** 普通（未加密）音频格式 */
export const PLAIN_AUDIO_EXTS: string[] = [
  '.mp3', '.flac', '.wav', '.m4a',
  '.aac', '.ogg', '.opus', '.aiff',
  '.alac', '.wma', '.ape',
]

/**
 * 可输出的音频格式（不含 "source" 占位符）。
 * 与 ffmpeg.ts 的 FfmpegOptions["format"] 联合类型保持一致，是输出格式的
 * 单一事实源：convert.ts 的白名单与 settings.ts 的 outputFormat 校验器
 * 都应引用此列表，避免两份硬编码列表漂移。
 */
export const OUTPUT_FORMATS: string[] = [
  'mp3', 'flac', 'wav', 'm4a',
  'aac', 'ogg', 'opus', 'aiff', 'alac',
]

/**
 * 获取全部受支持的扩展名（加密 + 普通），去重后按字典序排序。
 * 注意：不使用 Set/迭代器，保证在 web tsconfig 的 ES5 target 下也可编译。
 */
export function getAllSupportedExts(): string[] {
  const merged = ENCRYPTED_EXTS.concat(PLAIN_AUDIO_EXTS)
  return merged
    .filter((ext, i, arr) => arr.indexOf(ext) === i)
    .sort()
}

/**
 * 将输入的扩展名规整为小写且带前导点的标准形式。
 * 例如：'.MP3' / 'MP3' / '.mp3' 都会规整为 '.mp3'。
 */
function toExtName(ext: string): string {
  const lower = ext.toLowerCase()
  return lower.startsWith('.') ? lower : `.${lower}`
}

/** 判断是否为加密音频格式（大小写不敏感，可带或不带前导点） */
export function isEncryptedExt(ext: string): boolean {
  return ENCRYPTED_EXTS.includes(toExtName(ext))
}

/** 判断是否为普通（未加密）音频格式（大小写不敏感，可带或不带前导点） */
export function isPlainAudioExt(ext: string): boolean {
  return PLAIN_AUDIO_EXTS.includes(toExtName(ext))
}

/** 判断是否为受支持格式（加密 + 普通，大小写不敏感，可带或不带前导点） */
export function isSupportedExt(ext: string): boolean {
  return isEncryptedExt(ext) || isPlainAudioExt(ext)
}
