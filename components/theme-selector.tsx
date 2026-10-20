'use client'

import * as React from 'react'
import { useTheme } from '@/contexts/theme-context'
import { themes, getThemePreview } from '@/lib/themes'
import { Palette, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeSwatches({ onSelect }: { onSelect?: (themeId: string) => void }) {
  const { theme: currentTheme, setTheme } = useTheme()

  return <>
    {(['light', 'dark'] as const).map(group => <div key={group} className="theme-group">
      <h3>{group === 'light' ? 'Light themes' : 'Dark themes'}</h3>
      <div className="theme-grid">
        {themes.filter(t => t.group === group).map(theme => {
          const active = currentTheme.id === theme.id
          return <button key={theme.id} type="button" className="theme-swatch" aria-pressed={active}
            onClick={() => { setTheme(theme.id); onSelect?.(theme.id) }}>
            <div className={cn(getThemePreview(theme.id))} />
            <span>{theme.name}</span>
            {active && <span className="theme-check"><Check size={13} strokeWidth={3} /></span>}
          </button>
        })}
      </div>
    </div>)}
  </>
}

interface ThemeSelectorProps {
  onClose?: () => void
}

export function ThemeSelector({ onClose }: ThemeSelectorProps) {
  return (
    <div className="modal-card" role="dialog" aria-modal="true" aria-label="Choose your theme">
      <header>
        <div className="stat-icon"><Palette size={19} /></div>
        <div>
          <h2>Choose your theme</h2>
          <p>Saved automatically on this device</p>
        </div>
        {onClose && <button type="button" className="icon-btn ghost" aria-label="Close" onClick={onClose}><X size={18} /></button>}
      </header>
      <ThemeSwatches onSelect={() => { if (onClose) setTimeout(onClose, 300) }} />
    </div>
  )
}
