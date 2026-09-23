'use client'

import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Check, ChevronDown } from 'lucide-react'

export interface MenuSelectOption {
  value: string
  label: string
}

interface MenuSelectProps {
  label: string
  value: string
  options: MenuSelectOption[]
  onChange: (value: string) => void
}

export function MenuSelect({ label, value, options, onChange }: MenuSelectProps) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
  const selectedIndex = Math.max(0, options.findIndex(option => option.value === value))
  const selected = options[selectedIndex]

  useEffect(() => {
    if (!open) return
    const closeOnOutside = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    optionRefs.current[selectedIndex]?.focus()
    return () => document.removeEventListener('pointerdown', closeOnOutside)
  }, [open, selectedIndex])

  function focusOption(index: number) {
    const next = (index + options.length) % options.length
    optionRefs.current[next]?.focus()
  }

  function choose(option: MenuSelectOption) {
    onChange(option.value)
    setOpen(false)
    triggerRef.current?.focus()
  }

  function onTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
    }
  }

  function onOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowDown') { event.preventDefault(); focusOption(index + 1) }
    else if (event.key === 'ArrowUp') { event.preventDefault(); focusOption(index - 1) }
    else if (event.key === 'Home') { event.preventDefault(); focusOption(0) }
    else if (event.key === 'End') { event.preventDefault(); focusOption(options.length - 1) }
    else if (event.key === 'Escape') { event.preventDefault(); setOpen(false); triggerRef.current?.focus() }
    else if (event.key === 'Tab') setOpen(false)
  }

  return <div ref={rootRef} className={`menu-select${open ? ' menu-select-open' : ''}`} style={{ position: 'relative' }}>
    <button ref={triggerRef} type="button" className="menu-select-trigger" style={{ width: '100%', minHeight: 43, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, border: '1px solid var(--border)', borderRadius: 9, padding: '0 13px', background: 'var(--card)', color: 'var(--foreground)', fontSize: 12, textAlign: 'left', cursor: 'pointer' }} aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`} onClick={() => setOpen(current => !current)} onKeyDown={onTriggerKeyDown}>
      <span>{selected?.label ?? value}</span><ChevronDown size={15} aria-hidden="true" />
    </button>
    {open && <div id={`${id}-options`} className="menu-select-options" style={{ position: 'absolute', display: 'grid', gap: 2, top: 'calc(100% + 7px)', right: 0, zIndex: 50, width: 'max(100%, 210px)', maxHeight: 'min(290px, 55vh)', overflowY: 'auto', padding: 5, border: '1px solid var(--border)', borderRadius: 11, background: 'var(--card)', color: 'var(--foreground)', boxShadow: '0 14px 38px #0003' }} role="listbox" aria-label={label}>
      {options.map((option, index) => <button ref={node => { optionRefs.current[index] = node }} id={`${id}-option-${index}`} key={option.value} type="button" className="menu-select-option" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, width: '100%', minHeight: 38, border: 0, borderRadius: 7, padding: '8px 10px', background: option.value === value ? 'color-mix(in srgb, var(--companion-accent) 12%, var(--muted))' : 'transparent', color: option.value === value ? 'var(--companion-accent)' : 'var(--foreground)', fontSize: 12, textAlign: 'left', cursor: 'pointer' }} role="option" aria-selected={option.value === value} onClick={() => choose(option)} onKeyDown={event => onOptionKeyDown(event, index)}>
        <span>{option.label}</span>{option.value === value && <Check size={15} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>
}
