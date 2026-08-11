/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 *
 * 并发控制工具函数。
 */

export interface ConcurrencySettings {
  autoConcurrent: boolean
  concurrentLimit: number
}

/**
 * 解析实际使用的并发数。
 * - autoConcurrent 为 true 时：取硬件并发数（hc 可注入，缺省回退 4），钳制在 1–10。
 * - autoConcurrent 为 false 时：使用手动设置的 concurrentLimit，为 0 时回退 3。
 * @example resolveConcurrency({ autoConcurrent: true, concurrentLimit: 3 }, 8) → 8
 */
export function resolveConcurrency(settings: ConcurrencySettings, hc?: number): number {
  if (settings.autoConcurrent) {
    // hc 为 0/undefined 或 navigator 不可用时（如 vitest node 环境）回退 4
    const hardware =
      hc ||
      (typeof navigator !== 'undefined' ? navigator.hardwareConcurrency : 4) ||
      4
    return Math.max(1, Math.min(10, hardware))
  }
  return Math.max(1, Math.min(10, settings.concurrentLimit || 3))
}
