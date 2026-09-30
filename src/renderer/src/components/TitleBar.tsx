/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'
import LanguageSwitcher from './LanguageSwitcher'
import AppIcon from './AppIcon'

const THEME_ORDER: string[] = ['dark', 'amber', 'mint', 'pearl']

function nextThemeName(current: string): string {
  const base = current === 'system' ? 'dark' : current
  const idx = THEME_ORDER.indexOf(base)
  return THEME_ORDER[(idx + 1) % THEME_ORDER.length]
}

function TitleBar(): JSX.Element {
  const { t } = useTranslation()
  const settings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.setSettings)
  const [platform, setPlatform] = useState<'win32' | 'darwin' | 'other'>('other')
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    // Detect platform via userAgent
    const ua = navigator.userAgent.toLowerCase()
    if (ua.includes('win')) setPlatform('win32')
    else if (ua.includes('mac')) setPlatform('darwin')
    else setPlatform('other')
  }, [])

  // Track maximize state + F11 fullscreen
  useEffect(() => {
    window.akiConvert?.isMaximized().then(setIsMaximized)
    const unsub = window.akiConvert?.onMaximizeChange(setIsMaximized)

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'F11') {
        e.preventDefault()
        window.akiConvert?.toggleFullscreen()
      }
    }
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      unsub?.()
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Apply stored theme on mount
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
  }, [])

  const handleToggleTheme = useCallback((): void => {
    const newTheme = nextThemeName(settings.theme)
    setSettings({ theme: newTheme })
    document.documentElement.dataset.theme = newTheme
    window.akiConvert?.setSettings({ theme: newTheme })
  }, [settings.theme, setSettings])

  const handleMinimize = (): void => {
    window.akiConvert?.minimizeWindow()
  }

  const handleClose = (): void => {
    window.close()
  }

  return (
    <div
      className="material-frosted"
      style={{
        display: 'flex',
        alignItems: 'center',
        height: '40px',
        WebkitAppRegion: 'drag',
        WebkitUserSelect: 'none',
        flexShrink: 0,
        position: 'relative'
      } as React.CSSProperties}
    >
      {/* macOS traffic light spacing */}
      {platform === 'darwin' && <div style={{ width: '78px', flexShrink: 0 }} />}

      {/* Title + icon — centered via flex */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', gap: '8px' }}>
        <AppIcon size={20} />
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '14px',
            color: 'var(--accent)',
            letterSpacing: '0.5px',
            whiteSpace: 'nowrap'
          }}
        >
          {t('app.title')}
        </span>
      </div>

      {/* Right-side controls (absolute, out of flex flow — keeps title centered) */}
      <div
        style={{
          position: 'absolute',
          right: 0,
          top: 0,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          WebkitAppRegion: 'no-drag'
        } as React.CSSProperties}
      >
        <LanguageSwitcher />

        {/* Theme toggle — cycles the 4 color packs */}
        <button
          onClick={handleToggleTheme}
          style={{
            width: '36px',
            height: '40px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color var(--duration-hover) var(--ease-default)'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          title={t('theme.' + nextThemeName(settings.theme))}
          aria-label={t('theme.' + nextThemeName(settings.theme))}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 3a9 9 0 0 0 0 18c1.1 0 2-.9 2-2v-1.2c0-.9.7-1.6 1.6-1.6h1.6c1 0 1.8-.8 1.8-1.8 0-.5-.2-1-.6-1.3A9 9 0 0 0 12 3z" />
            <circle cx="8.5" cy="10" r="0.6" fill="currentColor" />
            <circle cx="12" cy="7.5" r="0.6" fill="currentColor" />
            <circle cx="15.5" cy="10" r="0.6" fill="currentColor" />
          </svg>
        </button>

        {/* Windows window controls */}
        {platform === 'win32' && (
          <>
            <button
              onClick={handleMinimize}
              style={{
                width: '46px',
                height: '40px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color var(--duration-hover) var(--ease-default), color var(--duration-hover) var(--ease-default)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              title={t('titlebar.minimize')}
              aria-label={t('titlebar.minimize')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            <button
              onClick={() => window.akiConvert?.toggleMaximize()}
              style={{
                width: '46px',
                height: '40px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color var(--duration-hover) var(--ease-default), color var(--duration-hover) var(--ease-default)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              title={t(isMaximized ? 'titlebar.restore' : 'titlebar.maximize')}
              aria-label={t(isMaximized ? 'titlebar.restore' : 'titlebar.maximize')}
            >
              {isMaximized ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <rect x="2" y="4" width="10" height="8" rx="1" />
                  <path d="M4 4V3a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <rect x="1.5" y="1.5" width="11" height="11" rx="1.5" />
                </svg>
              )}
            </button>
            <button
              onClick={handleClose}
              style={{
                width: '46px',
                height: '40px',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color var(--duration-hover) var(--ease-default), color var(--duration-hover) var(--ease-default)'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#e81123'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
              title={t('titlebar.close')}
              aria-label={t('titlebar.close')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                <line x1="6" y1="6" x2="18" y2="18" />
                <line x1="18" y1="6" x2="6" y2="18" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default TitleBar
