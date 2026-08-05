/**
 * Format Converter
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import { useTranslation } from 'react-i18next'

type ViewType = 'convert' | 'settings' | 'history'

interface SidebarProps {
  currentView: ViewType
  onNavigate: (view: ViewType) => void
}

interface NavItem {
  id: ViewType
  icon: string
  labelKey: string
}

const navItems: NavItem[] = [
  { id: 'convert', icon: 'convert', labelKey: 'sidebar.convert' },
  { id: 'history', icon: 'history', labelKey: 'sidebar.history' },
  { id: 'settings', icon: 'settings', labelKey: 'sidebar.settings' }
]

const primaryNavItems = navItems.slice(0, 2)
const secondaryNavItems = navItems.slice(2)

// Inline SVG icons (24 viewBox, strokeWidth 1.7, rendered 21px)
const icons: Record<string, JSX.Element> = {
  convert: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
  history: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  settings: (
    <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

function Sidebar({ currentView, onNavigate }: SidebarProps): JSX.Element {
  const { t } = useTranslation()

  const renderItem = (item: NavItem): JSX.Element => {
    const isActive = currentView === item.id
    return (
      <button
        key={item.id}
        onClick={() => onNavigate(item.id)}
        title={t(item.labelKey)}
        style={{
          width: 'calc(100% - 16px)',
          height: '52px',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          margin: '1px 8px',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          backgroundColor: isActive
            ? 'color-mix(in srgb, var(--accent) 13%, transparent)'
            : 'transparent',
          color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
          transition:
            'background-color var(--duration-hover) var(--ease-default), color var(--duration-hover) var(--ease-default)'
        }}
        onMouseEnter={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)'
            e.currentTarget.style.color = 'var(--text-secondary)'
          }
        }}
        onMouseLeave={(e) => {
          if (!isActive) {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }
        }}
      >
        {icons[item.icon]}
        <span
          style={{
            fontSize: '10px',
            letterSpacing: '0.02em',
            lineHeight: 1,
            maxWidth: '62px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            fontWeight: 500
          }}
        >
          {t(item.labelKey)}
        </span>
      </button>
    )
  }

  return (
    <nav
      className="flex flex-col no-scrollbar py-4"
      style={{
        width: '80px',
        minWidth: '80px',
        backgroundColor: 'var(--surface-1)',
        borderRight: '1px solid var(--border)',
        flexShrink: 0,
        overflowY: 'auto'
      }}
    >
      {primaryNavItems.map((item) => renderItem(item))}
      {/* Group divider */}
      <div style={{ margin: '8px 16px', height: 1, backgroundColor: 'var(--border)', opacity: 0.6 }} />
      <div className="flex flex-col" style={{ marginTop: 'auto' }}>
        {secondaryNavItems.map((item) => renderItem(item))}
      </div>
    </nav>
  )
}

export default Sidebar
