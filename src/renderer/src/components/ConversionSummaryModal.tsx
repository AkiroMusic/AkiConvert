/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 *
 * Modal shown after a batch conversion completes: success/fail counts,
 * total duration, and a close button.
 */

import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'

interface Props {
  success: number
  fail: number
  total: number
  durationMs: number
  onClose: () => void
}

function ConversionSummaryModal({ success, fail, total, durationMs, onClose }: Props): JSX.Element {
  const { t } = useTranslation()
  const notificationsEnabled = useAppStore((s) => s.settings.notificationsEnabled)

  // Also fire a system notification if enabled
  useEffect(() => {
    if (!notificationsEnabled) return
    const parts: string[] = []
    if (success > 0) parts.push(t('notification.successCount', { count: success }))
    if (fail > 0) parts.push(t('notification.failCount', { count: fail }))
    if (parts.length > 0) {
      window.akiConvert.showNotification({
        title: t('notification.complete'),
        body: parts.join(' · ')
      }).catch(() => {})
    }
  }, [success, fail, notificationsEnabled, t])

  const fmtDuration = (ms: number): string => {
    const sec = Math.floor(ms / 1000)
    if (sec < 60) return `${sec}s`
    const min = Math.floor(sec / 60)
    const s = sec % 60
    return s > 0 ? `${min}m ${s}s` : `${min}m`
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'color-mix(in srgb, var(--bg-base) 60%, transparent)'
      }}
      onClick={onClose}
    >
      <div
        className="double-bezel spring-in"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '360px',
          padding: 'var(--space-6)'
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '20px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: 'var(--space-4)',
            textAlign: 'center',
            lineHeight: 1.25,
            letterSpacing: '-0.01em'
          }}
        >
          {t('summary.title')}
        </h2>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
          {success > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>{success}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{t('summary.success', { count: success })}</div>
            </div>
          )}
          {fail > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--error)', fontFamily: 'var(--font-mono)' }}>{fail}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{t('summary.fail', { count: fail })}</div>
            </div>
          )}
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{total}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{t('summary.total', { count: total })}</div>
          </div>
        </div>

        {/* Duration */}
        <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          {t('summary.duration', { time: fmtDuration(durationMs) })}
        </div>

        {/* Close button */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={onClose}
            style={{
              padding: 'var(--space-2) var(--space-8)',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--accent)',
              color: 'var(--bg-base)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'background-color var(--duration-hover) var(--ease-default), color var(--duration-hover) var(--ease-default)'
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-hover)'
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'var(--accent)'
            }}
          >
            {t('summary.close')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConversionSummaryModal
