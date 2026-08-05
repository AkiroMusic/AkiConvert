/**
 * Format Converter
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

// 外部 URL 协议白名单：仅允许 https / http / mailto，
// 用于约束渲染进程传给 shell.openExternal 的地址，防止 file:// 等任意协议被打开。
// 本模块刻意不引入 electron，保证可在 vitest 的 node 环境直接测试。
const ALLOWED_PROTOCOLS = new Set(['https:', 'http:', 'mailto:'])

export function isSafeExternalUrl(url: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    // 无协议、相对路径等无法解析的字符串一律视为不安全
    return false
  }
  return ALLOWED_PROTOCOLS.has(parsed.protocol)
}
