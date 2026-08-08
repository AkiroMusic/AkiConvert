/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 *
 * 路径工具函数。
 */

/**
 * 从路径中提取文件名（同时兼容正斜杠与反斜杠）。
 * 空串输入返回空串。
 * @example basenameFromPath('C:\\Users\\x\\song.flac') → 'song.flac'
 */
export function basenameFromPath(p: string): string {
  return p.split(/[\\/]/).pop() || p
}
