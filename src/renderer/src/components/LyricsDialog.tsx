/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 *
 * Modal dialog for displaying extracted lyrics from an audio file.
 */

import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface LyricsDialogProps {
  filePath: string
  fileName: string
  onClose: () => void
}

function LyricsDialog({ filePath, fileName, onClose }: LyricsDialogProps): JSX.Element {
  const { t } = useTranslation()
  const [lyrics, setLyrics] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    window.akiConvert.extractLyrics(filePath)
      .then((result) => {
        if (cancelled) return
        setLyrics(result)
        if (!result) {
          setError(t('lyrics.noLyricsFound'))
        }
      })
      .catch((err: Error) => {
        if (cancelled) return
        setError(t('lyrics.extractError') + (err.message ? `: ${err.message}` : ''))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [filePath, t])

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
          width: '480px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-4)'
        }}>
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
              lineHeight: 1.25,
              letterSpacing: '-0.01em'
            }}
          >
            {t('lyrics.dialogTitle')}
          </h2>
          <span style={{ fontSize: '13px', color: 'var(--text-tertiary)', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fileName}
          </span>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: 'var(--space-4)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border)',
            minHeight: '120px',
            maxHeight: '50vh',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
            lineHeight: 1.6,
            whiteSpace: 'pre-wrap',
            color: 'var(--text-primary)'
          }}
        >
          {loading ? (
            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-6)' }}>
              {t('status.converting')}...
            </div>
          ) : error ? (
            <div style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 'var(--space-6)' }}>
              {error}
            </div>
          ) : (
            lyrics
          )}
        </div>

        {/* Close button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--space-4)' }}>
          <button
            onClick={onClose}
            style={{
              padding: 'var(--space-2) var(--space-6)',
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

export default LyricsDialog
