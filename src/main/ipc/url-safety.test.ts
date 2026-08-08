/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */
import { describe, it, expect } from 'vitest'
import { isSafeExternalUrl } from './url-safety'

describe('isSafeExternalUrl', () => {
  it('应放行 https 协议', () => {
    expect(isSafeExternalUrl('https://example.com')).toBe(true)
  })

  it('应放行 http 协议', () => {
    expect(isSafeExternalUrl('http://x.com')).toBe(true)
  })

  it('应放行 mailto 协议', () => {
    expect(isSafeExternalUrl('mailto:test@x.com')).toBe(true)
  })

  it('应拒绝 file 协议', () => {
    expect(isSafeExternalUrl('file:///etc/passwd')).toBe(false)
  })

  it('应拒绝 javascript 协议', () => {
    expect(isSafeExternalUrl('javascript:alert(1)')).toBe(false)
  })

  it('应拒绝 data 协议', () => {
    expect(isSafeExternalUrl('data:text/html,x')).toBe(false)
  })

  it('应拒绝无协议的相对串', () => {
    expect(isSafeExternalUrl('example.com')).toBe(false)
  })

  it('应正确处理大写协议', () => {
    expect(isSafeExternalUrl('HTTPS://EXAMPLE.COM')).toBe(true)
  })
})
