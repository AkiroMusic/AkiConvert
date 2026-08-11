/**
 * AkiConvert
 * Copyright (c) 2026 Akiro. All rights reserved.
 */

import { Fragment, memo, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAppStore, FileEntry } from '../store/useAppStore'
import UnlockAnimation from './UnlockAnimation'
import ContextMenu, { type ContextMenuItem } from './ContextMenu'
import LyricsDialog from './LyricsDialog'

interface FileItemProps {
  file: FileEntry
  index?: number
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const FileItem = memo(function FileItem({ file, index }: FileItemProps): JSX.Element {
  const { t } = useTranslation()
  const removeFile = useAppStore((s) => s.removeFile)
  const setCurrentPreview = useAppStore((s) => s.setCurrentPreview)
  const currentPreviewId = useAppStore((s) => s.currentPreviewId)
  const selectedIds = useAppStore((s) => s.selectedIds)
  const toggleSelect = useAppStore((s) => s.toggleSelect)
  const retryFile = useAppStore((s) => s.retryFile)
  const cancelFile = useAppStore((s) => s.cancelFile)
  const setLyricsPath = useAppStore((s) => s.setLyricsPath)

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const [lyricsDialogPath, setLyricsDialogPath] = useState<string | null>(null)

  const isSelected = selectedIds.includes(file.id)

  const handleRemove = useCallback(() => {
    removeFile(file.id)
  }, [removeFile, file.id])

  const handlePreview = useCallback(() => {
    if (file.status === 'success') {
      setCurrentPreview(currentPreviewId === file.id ? null : file.id)
    }
  }, [file.id, file.status, currentPreviewId, setCurrentPreview])

  const handleRetry = useCallback(() => {
    retryFile(file.id)
  }, [retryFile, file.id])

  const handleSelectLyrics = useCallback(async () => {
    const path = await window.akiConvert.selectLyricsFile()
    if (path) {
      setLyricsPath(file.id, path)
    }
  }, [setLyricsPath, file.id])

  const handleClearLyrics = useCallback(() => {
    setLyricsPath(file.id, undefined)
  }, [setLyricsPath, file.id])

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.dataTransfer.setData('text/plain', file.id)
      e.dataTransfer.effectAllowed = 'move'
      // Dim the dragged item
      const el = e.currentTarget
      requestAnimationFrame(() => {
        el.style.opacity = '0.4'
      })
    },
    [file.id]
  )

  const handleDragEnd = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1'
  }, [])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const getStatusColor = (): string => {
    switch (file.status) {
      case 'converting': return 'var(--accent)'
      case 'success': return 'var(--success)'
      case 'error': return 'var(--error)'
      default: return 'var(--border)'
    }
  }

  const getStatusBg = (): string => {
    switch (file.status) {
      case 'converting': return 'color-mix(in srgb, var(--accent) 5%, transparent)'
      case 'success': return 'color-mix(in srgb, var(--success) 5%, transparent)'
      case 'error': return 'color-mix(in srgb, var(--error) 5%, transparent)'
      default: return 'transparent'
    }
  }

  const isPlaying = currentPreviewId === file.id

  const buildContextMenuItems = useCallback((): ContextMenuItem[] => {
    const items: ContextMenuItem[] = []

    if (file.status === 'error') {
      items.push({
        label: t('actions.retry'),
        onClick: handleRetry,
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="23 4 23 10 17 10" />
            <polyline points="1 20 1 14 7 14" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        )
      })
    }

    if (file.status === 'success' && file.outputPath) {
      items.push({
        label: t('lyrics.extract'),
        onClick: () => setLyricsDialogPath(file.outputPath!),
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20v-6M6 20v-4M18 20v-8" />
            <path d="M2 20h20" />
            <path d="M2 4h20" />
            <path d="M2 8h20" />
            <path d="M2 12h20" />
          </svg>
        )
      })
      items.push({
        label: t('actions.showInFolder'),
        onClick: () => { window.akiConvert.revealInFolder(file.outputPath!) },
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
        )
      })
      items.push({
        label: t('actions.copyPath'),
        onClick: () => { navigator.clipboard.writeText(file.outputPath!) },
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )
      })
    }

    // 手动指定歌词文件（pending/error 可设置，转换时嵌入）
    if (file.status === 'pending' || file.status === 'error') {
      items.push({
        label: file.lyricsPath ? t('lyrics.changeFile') : t('lyrics.selectFile'),
        onClick: handleSelectLyrics,
        icon: (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        )
      })
      if (file.lyricsPath) {
        items.push({
          label: t('lyrics.clearFile'),
          onClick: handleClearLyrics,
          icon: (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )
        })
      }
    }

    items.push({ label: '', onClick: () => {}, separator: true })

    items.push({
      label: t('actions.clear'),
      onClick: handleRemove,
      danger: true,
      icon: (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      )
    })

    return items
  }, [file, t, handleRetry, handleRemove, handleSelectLyrics, handleClearLyrics])

  return (
    <>
    <div
      className="double-bezel spring-in flex items-center"
      draggable
      data-file-id={file.id}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onContextMenu={handleContextMenu}
      style={{
        padding: 'var(--space-3) var(--space-4)',
        backgroundColor: getStatusBg(),
        marginBottom: 'var(--space-2)',
        border: `1px solid ${getStatusColor()}`,
        outline: isSelected ? `2px solid var(--accent)` : undefined,
        outlineOffset: '-2px'
      }}
    >
      {/* Drag handle */}
      <div
        style={{
          marginRight: 'var(--space-2)',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'grab',
          color: 'var(--text-tertiary)',
          opacity: 0.4
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="9" cy="5" r="1.5" />
          <circle cx="15" cy="5" r="1.5" />
          <circle cx="9" cy="12" r="1.5" />
          <circle cx="15" cy="12" r="1.5" />
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="15" cy="19" r="1.5" />
        </svg>
      </div>

      {/* Checkbox for selection */}
      <div
        style={{ marginRight: 'var(--space-2)', flexShrink: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleSelect(file.id)}
          style={{
            width: '16px',
            height: '16px',
            cursor: 'pointer',
            accentColor: 'var(--accent)'
          }}
        />
      </div>

      {/* Cover image or icon */}
      <div style={{ marginRight: 'var(--space-3)', flexShrink: 0 }}>
        {file.coverImageBase64 && file.status === 'success' ? (
          <img
            src={`data:image/jpeg;base64,${file.coverImageBase64}`}
            alt={file.songName || ''}
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-sm)',
              objectFit: 'cover',
              backgroundColor: 'var(--surface-2)'
            }}
          />
        ) : (
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--surface-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-tertiary)'
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18V5l12-2v13" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
        )}
      </div>

      {/* File info */}
      <div className="flex-1" style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            marginBottom: '2px'
          }}
        >
          {file.songName || file.fileName}
        </div>
        <div
          style={{
            fontSize: '13px',
            color: file.status === 'success' ? 'var(--success)' : file.status === 'error' ? 'var(--error)' : 'var(--text-secondary)'
          }}
        >
          {file.status === 'pending' && (
            <>
              <span>{t('status.pending')}{file.fileSize > 0 ? ' · ' : ''}</span>
              {file.fileSize > 0 && (
                <span style={{ fontFamily: 'var(--font-mono)' }}>{formatFileSize(file.fileSize)}</span>
              )}
              {file.estimatedOutputSize != null && file.estimatedOutputSize > 0 && (
                <span style={{ marginLeft: 'var(--space-2)', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                  {t('sizeEstimate.label', { size: formatFileSize(file.estimatedOutputSize) })}
                </span>
              )}
              {file.lyricsPath && (
                <span style={{ marginLeft: 'var(--space-2)', color: 'var(--text-tertiary)' }}>
                  {t('lyrics.attached')}
                </span>
              )}
            </>
          )}
          {file.status === 'converting' && (
            <span>
              {t('status.converting')}{' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>{Math.round(file.progress * 100)}%</span>
            </span>
          )}
          {file.status === 'success' && (
            <>
              <span>{(file.format || '').toUpperCase()} · {file.songName || ''}</span>
              {file.outputPath && (
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-mono)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    marginTop: '2px'
                  }}
                  title={file.outputPath}
                >
                  {file.outputPath}
                </div>
              )}
            </>
          )}
          {file.status === 'error' && `${t('status.error')}: ${file.errorMessage}`}
        </div>

        {/* Progress / Unlock animation for converting state */}
        {file.status === 'converting' && (
          <div className="flex items-center" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)' }}>
            <UnlockAnimation status="converting" progress={file.progress} />
            <div
              style={{
                flex: 1,
                height: '3px',
                backgroundColor: 'var(--border)',
                borderRadius: 'var(--radius-sm)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${Math.round(file.progress * 100)}%`,
                  backgroundColor: 'var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  transition: 'width var(--duration-hover) var(--ease-default)'
                }}
              />
            </div>
          </div>
        )}
        {file.status === 'success' && (
          <div style={{ marginTop: '4px' }}>
            <UnlockAnimation status="success" progress={1} />
          </div>
        )}
        {file.status === 'error' && (
          <div style={{ marginTop: '4px' }}>
            <UnlockAnimation status="error" progress={0} />
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex" style={{ gap: 'var(--space-1)', marginLeft: 'var(--space-2)', flexShrink: 0 }}>
        {file.status === 'success' && (
          <button
            onClick={handlePreview}
            style={{
              width: '36px',
              height: '36px',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              color: isPlaying ? 'var(--accent)' : 'var(--text-secondary)',
              transition: 'background-color var(--duration-hover) var(--ease-default), color var(--duration-hover) var(--ease-default)'
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--text-primary) 6%, transparent)'
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.backgroundColor = 'transparent'
            }}
            title={isPlaying ? t('player.pause') : t('player.play')}
          >
            {isPlaying ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>
        )}
        {file.status === 'converting' && (
          <button
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              cancelFile(file.filePath)
            }}
            style={{
              width: '36px',
              height: '36px',
              border: 'none',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              color: 'var(--error)',
              transition: 'background-color var(--duration-hover) var(--ease-default), opacity var(--duration-hover) var(--ease-default)',
              opacity: 0.7
            }}
            title={t('actions.cancel')}
            onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.opacity = '1' }}
            onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => { e.currentTarget.style.opacity = '0.7' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </button>
        )}
        <button
          onClick={handleRemove}
          style={{
            width: '36px',
            height: '36px',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'transparent',
            color: 'var(--text-tertiary)',
            transition: 'background-color var(--duration-hover) var(--ease-default), color var(--duration-hover) var(--ease-default)'
          }}
          onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--error) 10%, transparent)'
            e.currentTarget.style.color = 'var(--error)'
          }}
          onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
            e.currentTarget.style.backgroundColor = 'transparent'
            e.currentTarget.style.color = 'var(--text-tertiary)'
          }}
          title={t('actions.clear')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildContextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
      {lyricsDialogPath && (
        <LyricsDialog
          filePath={lyricsDialogPath}
          fileName={file.fileName}
          onClose={() => setLyricsDialogPath(null)}
        />
      )}
    </>
  )
})

export default FileItem
