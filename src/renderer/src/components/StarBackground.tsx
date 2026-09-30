/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 *
 * 星尘层（§8 可选层）——右下角一组 Aki 四角星芒星座（§13.1），
 * 极淡呼吸（opacity 0.05–0.16），纯氛围装饰，不承载信息。
 */

import { useMemo } from 'react'
import { Sparkle } from './Sparkle'

interface Star {
  id: number
  bottom: number  // px from bottom
  right: number   // px from right
  size: number    // px
  delay: number   // animation delay (s)
  duration: number // animation duration (s)
}

/** Stars arranged as a small constellation in the bottom-right corner.
 *  Positions are relative to bottom-right so they stay put on resize. */
const STARS: Star[] = [
  { id: 0, bottom: 100, right: 100, size: 14, delay: 0,    duration: 5 },
  { id: 1, bottom: 140, right: 140, size: 10, delay: 1.5,  duration: 6 },
  { id: 2, bottom: 150, right: 70,  size: 9,  delay: 0.8,  duration: 4.5 },
  { id: 3, bottom: 80,  right: 160, size: 11, delay: 2.2,  duration: 5.5 },
  { id: 4, bottom: 50,  right: 120, size: 8,  delay: 1,    duration: 7 },
  { id: 5, bottom: 170, right: 110, size: 12, delay: 0.3,  duration: 5 },
  { id: 6, bottom: 120, right: 60,  size: 7,  delay: 1.8,  duration: 4 },
  { id: 7, bottom: 60,  right: 80,  size: 10, delay: 2.5,  duration: 6.5 },
]

function StarBackground(): JSX.Element {
  const stars = useMemo(() => STARS, [])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: -1,
        overflow: 'hidden',
      }}
      aria-hidden
    >
      <style>{`
        @keyframes starPulse {
          0%   { opacity: 0.05; }
          50%  { opacity: 0.16; }
          100% { opacity: 0.05; }
        }
      `}</style>

      {stars.map((star) => (
        <Sparkle
          key={star.id}
          size={star.size}
          style={{
            position: 'absolute',
            bottom: star.bottom,
            right: star.right,
            opacity: 0,
            animation: `starPulse ${star.duration}s ease-in-out ${star.delay}s infinite`,
            color: 'var(--grad-c)',
            filter: 'blur(0.3px)',
          }}
        />
      ))}
    </div>
  )
}

export default StarBackground
