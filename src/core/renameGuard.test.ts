/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * 改名守卫测试：防止 "Format Converter" 旧品牌标识符在源码/配置/本地化中回归。
 * 覆盖 v2.0.0 起正式更名为 AkiConvert 后的所有关键点。
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(__dirname, '..', '..')
const SRC = join(ROOT, 'src')

/** 递归收集 src/ 下所有源码与资源文件 */
function collectFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      files.push(...collectFiles(full))
    } else if (/\.(ts|tsx|mjs|js|json|html)$/.test(entry)) {
      files.push(full)
    }
  }
  return files
}

describe('AkiConvert rename guard', () => {
  it('package.json 声明 akiconvert / 2.0.1 / AkiConvert 品牌配置', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
    expect(pkg.name).toBe('akiconvert')
    expect(pkg.version).toBe('2.0.1')
    expect(pkg.build.productName).toBe('AkiConvert')
    expect(pkg.build.appId).toBe('com.akiro.akiconvert')
    expect(pkg.build.nsis.shortcutName).toBe('AkiConvert')
    expect(pkg.build.nsis.artifactName).toBe('AkiConvert-Setup-${version}.${ext}')
    expect(pkg.build.dmg.artifactName).toBe('AkiConvert-${version}.${ext}')
    expect(pkg.allowScripts).toEqual({ electron: true, esbuild: true })
    expect(pkg.devDependencies['electron-icon-builder']).toBeUndefined()
  })

  it('src/ 下所有文件中不含旧品牌标识符', () => {
    const forbidden = [
      'Format Converter',
      'format-converter',
      'Format-Converter',
      'FormatConverter',
      'formatConverter',
    ]
    const offenders: string[] = []
    for (const file of collectFiles(SRC)) {
      // 守卫测试自身需引用旧名做断言，跳过自扫
      if (file.endsWith('renameGuard.test.ts')) continue
      const content = readFileSync(file, 'utf8')
      for (const token of forbidden) {
        if (content.includes(token)) {
          offenders.push(`${file}: ${token}`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it('preload 暴露 window.akiConvert 而非旧 API 名', () => {
    const preload = readFileSync(join(SRC, 'preload', 'index.ts'), 'utf8')
    expect(preload).toContain("exposeInMainWorld('akiConvert'")
    expect(preload).not.toContain('formatConverter')
  })

  it('本地化文件 app.title 均为 AkiConvert', () => {
    const en = JSON.parse(readFileSync(join(SRC, 'renderer/src/locales/en-US.json'), 'utf8'))
    const zh = JSON.parse(readFileSync(join(SRC, 'renderer/src/locales/zh-CN.json'), 'utf8'))
    expect(en['app.title']).toBe('AkiConvert')
    expect(zh['app.title']).toBe('AkiConvert')
  })
})
