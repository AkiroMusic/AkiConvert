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

/**
 * 消毒 ZIP 条目名，防止路径穿越（zip-slip）与绝对路径/控制字符注入。
 * JSZip 会按原样保存条目名，`../evil.txt` 在解压时可写出目标目录之外，
 * `/abs/name.txt` 保留前导斜杠、NUL 等控制字符也可能造成危险。
 *
 * 规则：按 `/` 与 `\` 分段，丢弃空段与 `..` 段，去掉前导斜杠，
 * 控制字符（[\u0000-\u001f\u007f]）替换为 `_`，再以 `/` 重新拼接；
 * 结果为空或仅剩 `.` 时回退到 `file`。
 */
export function sanitizeZipEntryName(name: string): string {
  const segments: string[] = []
  for (const raw of name.replace(/[\u0000-\u001f\u007f]/g, '_').split(/[\\/]+/)) {
    if (raw === '' || raw === '.') continue
    if (raw === '..') {
      segments.pop() // `..` 抵消前一段（pop 空栈无害，不会产生穿越）
      continue
    }
    segments.push(raw)
  }
  return segments.length > 0 ? segments.join('/') : 'file'
}

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
          zip.file(sanitizeZipEntryName(fileName), data)
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