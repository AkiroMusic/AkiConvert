/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import { ipcMain, dialog } from 'electron'
import { getAllSupportedExts } from '../../core/supportedFormats'

export function registerDialogHandlers(): void {
  // Multi-format file selection (Phase 1 — no external key needed)
  ipcMain.handle('dialog:selectFiles', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'All Supported Audio Files',
          extensions: getAllSupportedExts().map((e) => e.slice(1))
        },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return result.canceled ? [] : result.filePaths
  })

  ipcMain.handle('dialog:selectFolder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // KGG key database selection
  ipcMain.handle('dialog:selectKggDatabase', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'KGG Key Database', extensions: ['db'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // 歌词文件手动指定（转换时嵌入用，仅允许 .lrc/.txt）
  ipcMain.handle('dialog:selectLyricsFile', async () => {
    const result = await dialog.showOpenDialog({
      title: 'Select Lyrics File',
      properties: ['openFile'],
      filters: [
        { name: 'Lyrics Files', extensions: ['lrc', 'txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return result.canceled ? null : (result.filePaths[0] ?? null)
  })

  // FFmpeg binary manual selection
  ipcMain.handle('dialog:selectFfmpegBinary', async () => {
    const isWin = process.platform === 'win32'
    const result = await dialog.showOpenDialog({
      title: 'Select FFmpeg Binary',
      message: isWin
        ? 'Please select the ffmpeg.exe file itself (not the folder). The matching ffprobe.exe will be auto-detected from the same directory.'
        : 'Please select the ffmpeg binary file itself. The matching ffprobe will be auto-detected from the same directory.',
      properties: ['openFile'],
      filters: [
        { name: 'FFmpeg Binary', extensions: isWin ? ['exe'] : ['*'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    })
    return result.canceled ? null : result.filePaths[0]
  })
}
