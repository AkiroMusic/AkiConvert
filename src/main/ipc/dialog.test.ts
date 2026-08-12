/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

/**
 * 测试 dialog:selectFiles 的文件选择过滤器：应包含全部受支持的音频格式
 * （加密 + 普通），而不仅仅是加密格式，否则 .mp3/.flac 等普通音频在
 * 打开对话框中不可见、不可选。
 *
 * 通过 vi.mock('electron') 捕获 ipcMain.handle 注册的 handler 与
 * dialog.showOpenDialog 收到的 filter 配置；动态 import 主进程模块，
 * 与 settings.test.ts 的既有模式保持一致。
 */

import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'

const tempDir = mkdtempSync(join(tmpdir(), 'dialog-test-'))

vi.mock('electron', () => ({
  ipcMain: { handle: vi.fn() },
  dialog: { showOpenDialog: vi.fn(), showSaveDialog: vi.fn() },
  app: { getPath: vi.fn(() => tempDir) }
}))

import { ipcMain, dialog } from 'electron'

describe('dialog:selectFiles — file-open filter', () => {
  beforeAll(async () => {
    const mod = await import('./dialog')
    mod.registerDialogHandlers()
  })

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true })
  })

  it('should include plain audio formats (mp3, flac) in the "All Supported Audio Files" filter', async () => {
    vi.mocked(dialog.showOpenDialog).mockResolvedValueOnce({ canceled: true, filePaths: [] })

    const selectFilesCall = vi.mocked(ipcMain.handle).mock.calls.find(
      ([channel]) => channel === 'dialog:selectFiles'
    )
    expect(selectFilesCall).toBeDefined()
    await (selectFilesCall![1] as () => Promise<string[]>)()

    expect(dialog.showOpenDialog).toHaveBeenCalledTimes(1)
    const options = vi.mocked(dialog.showOpenDialog).mock.calls[0][0]
    const filter = options.filters?.find((f: { name: string }) => f.name === 'All Supported Audio Files')
    expect(filter).toBeDefined()
    expect(filter!.extensions).toContain('mp3')
    expect(filter!.extensions).toContain('flac')
    // 既有行为保持不变：加密格式仍在过滤器内
    expect(filter!.extensions).toContain('ncm')
  })
})
