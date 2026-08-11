/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/useAppStore'

function LanguageSwitcher(): JSX.Element {
  const { i18n, t } = useTranslation()
  const setSettings = useAppStore((s) => s.setSettings)

  const currentLang = i18n.language || 'en-US'

  const toggleLanguage = useCallback(async () => {
    const newLang = currentLang === 'zh-CN' ? 'en-US' : 'zh-CN'
    await i18n.changeLanguage(newLang)
    // Explicit choice: persist both the language and the languageSet flag
    // so future launches honor it instead of re-running OS auto-detection.
    setSettings({ language: newLang, languageSet: true })
    window.akiConvert?.setSettings({ language: newLang, languageSet: true }).catch(() => {})
  }, [currentLang, i18n, setSettings])

  return (
    <button
      onClick={toggleLanguage}
      style={{
        padding: 'var(--space-1) 10px',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        backgroundColor: 'transparent',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
        transition: 'border-color var(--duration-hover) var(--ease-default), background-color var(--duration-hover) var(--ease-default), color var(--duration-hover) var(--ease-default)',
        marginRight: 'var(--space-2)'
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.borderColor = 'var(--accent)'
        e.currentTarget.style.color = 'var(--accent)'
        e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 8%, transparent)'
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.borderColor = 'var(--border)'
        e.currentTarget.style.color = 'var(--text-secondary)'
        e.currentTarget.style.backgroundColor = 'transparent'
      }}
      title={t('language.switch')}
    >
      {currentLang === 'zh-CN' ? 'EN' : 'CN'}
    </button>
  )
}

export default LanguageSwitcher
