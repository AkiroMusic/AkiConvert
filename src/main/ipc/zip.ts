/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 *
 * ZIP download IPC handler.
 */

import { ipcMain, dialog } from 'electron'
import { readFile, stat } from 'fs/promises'
import { extname } from 'path'
import JSZip from 'jszip'

// ---- ZIP 打包资源上限 ----
// 所有文件都 readFile 进内存再压缩，若不加限制，批量大文件（如无损 FLAC）
// 可导致内存耗尽（OOM 崩溃）。这里设置硬上限，超出即拒绝打包。
const MAX_TOTAL_BYTES = 1024 * 1024 * 1024 // 总大小 ≤ 1 GiB
const MAX_SINGLE_FILE_BYTES = 512 * 1024 * 1024 // 单文件 ≤ 512 MiB
const MAX_FILE_COUNT = 500 // 文件数 ≤ 500

export function registerZipHandlers(): void {
  ipcMain.handle(
    'convert:downloadAsZip',
    async (
      _event,
      payload: { filePaths: string[]; fileNames: string[] }
    ): Promise<{ success: boolean; outputPath?: string; error?: string }> => {
      try {
        const { filePaths, fileNames } = payload

        if (filePaths.length === 0) {
          return { success: false, error: 'No files to download' }
        }

        if (filePaths.length > MAX_FILE_COUNT) {
          return { success: false, error: `Too many files to zip (max ${MAX_FILE_COUNT})` }
        }

        // Pre-check total size before reading anything into memory
        let totalBytes = 0
        for (const filePath of filePaths) {
          const st = await stat(filePath)
          if (st.size > MAX_SINGLE_FILE_BYTES) {
            return { success: false, error: 'A file is too large to zip (max 512 MiB per file)' }
          }
          totalBytes += st.size
          if (totalBytes > MAX_TOTAL_BYTES) {
            return { success: false, error: 'Total file size is too large to zip (max 1 GiB)' }
          }
        }

        // Default filename
        const defaultName = `converted-${Date.now()}.zip`

        const result = await dialog.showSaveDialog({
          title: 'Save ZIP Archive',
          defaultPath: defaultName,
          filters: [{ name: 'ZIP Archive', extensions: ['zip'] }]
        })

        if (result.canceled || !result.filePath) {
          return { success: false, error: 'Save cancelled' }
        }

        const zip = new JSZip()

        for (let i = 0; i < filePaths.length; i++) {
          const filePath = filePaths[i]
          const fileName = fileNames[i] || `file_${i}${extname(filePath)}`
          const data = await readFile(filePath)
          zip.file(fileName, data)
        }

        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
        const { writeFile } = await import('fs/promises')
        await writeFile(result.filePath, zipBuffer)

        return { success: true, outputPath: result.filePath }
      } catch (err) {
        return { success: false, error: (err as Error).message }
      }
    }
  )
}