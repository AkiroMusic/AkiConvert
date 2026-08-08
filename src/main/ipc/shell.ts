/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import { ipcMain, shell, app } from 'electron'
import { isSafeExternalUrl } from './url-safety'

export function registerShellHandlers(): void {
  ipcMain.handle('fs:revealInFolder', async (_event, filePath: string) => {
    shell.showItemInFolder(filePath)
  })

  ipcMain.handle('fs:openFile', async (_event, filePath: string) => {
    await shell.openPath(filePath)
  })

  ipcMain.handle('shell:openUrl', async (_event, url: string) => {
    // 仅放行白名单协议，非法地址直接忽略，不调用 shell.openExternal
    if (!isSafeExternalUrl(url)) {
      return
    }
    await shell.openExternal(url)
  })
}
