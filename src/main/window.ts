/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import { isSafeExternalUrl } from './ipc/url-safety'

export function createWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1120,
    height: 800,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0E1016',
    show: false,
    frame: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // 安全加固：preload 仅使用 contextBridge/ipcRenderer/webUtils，
      // 全部属于 sandbox 白名单 API，开启 sandbox 不破坏现有功能，
      // 同时限制渲染进程逃逸面（Electron 安全最佳实践）。
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    // 新窗口一律 deny，仅对白名单协议的外部链接调用系统浏览器打开
    if (isSafeExternalUrl(details.url)) {
      shell.openExternal(details.url)
    }
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}
