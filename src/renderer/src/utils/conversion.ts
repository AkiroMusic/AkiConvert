/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

export interface ConversionBatchOptions<T> {
  files: T[]
  limit: number
  convert: (file: T) => Promise<{ success: boolean }>
  shouldAbort: () => boolean
  isStale: (file: T) => boolean
}

export interface ConversionBatchResult<T> {
  success: T[]
  failed: T[]
  interrupted: boolean
}

/**
 * 批量执行转换任务，带并发限制、可中止与陈旧结果跳过。
 * - 单个转换的 Promise 被拒绝时会被吸收，该文件归类为失败，其余文件继续处理。
 * - 每个批次开始前检查 shouldAbort，为 true 时立即中断并返回 interrupted: true。
 * - 结果返回时若 isStale(file) 为 true（如暂停/取消后状态已被重置为 pending），
 *   该文件既不记成功也不记失败，避免旧结果覆盖新状态。
 */
export async function runConversionBatches<T>({
  files,
  limit,
  convert,
  shouldAbort,
  isStale
}: ConversionBatchOptions<T>): Promise<ConversionBatchResult<T>> {
  const success: T[] = []
  const failed: T[] = []
  const batchSize = limit > 0 ? limit : 1
  let interrupted = false

  for (let i = 0; i < files.length; i += batchSize) {
    if (shouldAbort()) {
      interrupted = true
      break
    }

    const batch = files.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map((file) =>
        Promise.resolve()
          .then(() => convert(file))
          .then((result) => ({ file, result }))
          .catch(() => ({ file, result: { success: false } }))
      )
    )

    for (const { file, result } of results) {
      if (isStale(file)) continue
      if (result.success) {
        success.push(file)
      } else {
        failed.push(file)
      }
    }
  }

  return { success, failed, interrupted }
}
