/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 *
 * Aki Signature 四角星芒（§13.1/§13.4）——唯一的 fill 型装饰元素。
 * 星芒出现必须带 .star-bloom 绽放动画；每屏 ≤ 3 颗。
 */

interface SparkleProps {
  size?: number
  style?: React.CSSProperties
  className?: string
}

export function Sparkle({ size = 12, style, className }: SparkleProps): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      style={style}
      className={className}
      aria-hidden
    >
      <path d="M12 2 C12.7 7.3 16.7 11.3 22 12 C16.7 12.7 12.7 16.7 12 22 C11.3 16.7 7.3 12.7 2 12 C7.3 11.3 11.3 7.3 12 2 Z" />
    </svg>
  )
}

/** 空状态专用：三星对角星座，级联绽放（12/16/12px） */
export function StarTrio({ style }: { style?: React.CSSProperties }): JSX.Element {
  const stars: Array<{ size: number; x: number; y: number; order: number }> = [
    { size: 12, x: 0, y: 10, order: 0 },
    { size: 16, x: 14, y: 0, order: 1 },
    { size: 12, x: 30, y: 8, order: 2 }
  ]
  return (
    <div
      style={{ position: 'relative', width: '42px', height: '26px', color: 'var(--grad-c)', ...style }}
      aria-hidden
    >
      {stars.map((s) => (
        <Sparkle
          key={s.order}
          size={s.size}
          className="star-bloom"
          style={{
            position: 'absolute',
            left: s.x,
            top: s.y,
            opacity: 0.7,
            ['--bloom-order' as string]: s.order
          }}
        />
      ))}
    </div>
  )
}

export default Sparkle
