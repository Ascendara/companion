'use client'

import * as React from 'react'
import { ThemeSelector } from '@/components/theme-selector'

interface ThemeSelectorModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ThemeSelectorModal({ isOpen, onClose }: ThemeSelectorModalProps) {
  React.useEffect(() => {
    if (!isOpen) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', onKey)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={onClose} />
      <ThemeSelector onClose={onClose} />
    </div>
  )
}
