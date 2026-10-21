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

  return <div ref={rootRef} className={`menu-select${open ? ' menu-select-open' : ''}`}>
    <button ref={triggerRef} type="button" className="menu-select-trigger" aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-options`} onClick={() => setOpen(current => !current)} onKeyDown={onTriggerKeyDown}>
      <span>{selected?.label ?? value}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && <div id={`${id}-options`} className="menu-select-options" role="listbox" aria-label={label}>
      {options.map((option, index) => <button ref={node => { optionRefs.current[index] = node }} id={`${id}-option-${index}`} key={option.value} type="button" className="menu-select-option" role="option" aria-selected={option.value === value} onClick={() => choose(option)} onKeyDown={event => onOptionKeyDown(event, index)}>
        <span>{option.label}</span>{option.value === value && <Check size={15} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>
}
