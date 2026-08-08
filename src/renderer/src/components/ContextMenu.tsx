/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import { useEffect, useRef, useState } from 'react'

export interface ContextMenuItem {
  label: string
  onClick: () => void
  icon?: React.ReactNode
  disabled?: boolean
  separator?: boolean
  danger?: boolean
}

interface ContextMenuProps {
  x: number
  y: number
  items: ContextMenuItem[]
  onClose: () => void
}

function ContextMenu({ x, y, items, onClose }: ContextMenuProps): JSX.Element {
  const menuRef = useRef<HTMLDivElement>(null)
  const [adjustedPos, setAdjustedPos] = useState({ x, y })

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    // Defer listener attachment so the same mousedown that opened
    // the menu doesn't immediately close it.
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 0)

    // Measure and clamp within viewport bounds
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      const padding = 8
      const maxX = window.innerWidth - rect.width - padding
      const maxY = window.innerHeight - rect.height - padding
      setAdjustedPos({
        x: Math.min(x, maxX),
        y: Math.min(y, maxY)
      })
    }

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose, x, y])

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: `${adjustedPos.x}px`,
        top: `${adjustedPos.y}px`,
        zIndex: 9999,
        minWidth: '170px',
        backgroundColor: 'var(--surface-1)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-1)',
        boxShadow: 'var(--shadow-3)',
        overflow: 'hidden'
      }}
    >
      {items.map((item, i) => {
        if (item.separator) {
          return (
            <div
              key={`sep-${i}`}
              style={{
                height: '1px',
                backgroundColor: 'var(--border)',
                margin: 'var(--space-1)'
              }}
            />
          )
        }

        return (
          <div
            key={`item-${i}`}
            role="menuitem"
            onClick={() => {
              if (!item.disabled) {
                item.onClick()
                onClose()
              }
            }}
            style={{
              padding: 'var(--space-2) 10px',
              borderRadius: 'var(--radius-sm)',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-2)',
              fontSize: '13px',
              fontWeight: 400,
              fontFamily: 'var(--font-sans)',
              color: item.danger
                ? 'var(--error)'
                : item.disabled
                  ? 'var(--text-tertiary)'
                  : 'var(--text-primary)',
              transition: 'background-color var(--duration-hover) var(--ease-default)',
              opacity: item.disabled ? 0.4 : 1,
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                e.currentTarget.style.backgroundColor = item.danger
                  ? 'color-mix(in srgb, var(--error) 10%, transparent)'
                  : 'color-mix(in srgb, var(--text-primary) 6%, transparent)'
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
          >
            {item.icon && (
              <span
                style={{
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {item.icon}
              </span>
            )}
            <span>{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}

export default ContextMenu
