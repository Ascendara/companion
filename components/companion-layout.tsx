'use client'
import Link from 'next/link'
import { ArrowUpRight, RefreshCw, AlertCircle, Gamepad2, Search, X, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react'
import { BottomNavbar } from './bottom-navbar'
import { useEffect, useState } from 'react'

export function CompanionLayout({ title, eyebrow, subtitle, children, actions }: { title?: React.ReactNode; eyebrow?: React.ReactNode; subtitle?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode }) {
  return <div className="app-shell">
    <BottomNavbar />
    <main className="app-main">
      {title && <header className="page-header">
        <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{subtitle && <p className="page-subtitle">{subtitle}</p>}</div>
        {actions && <div className="page-actions">{actions}</div>}
      </header>}
      {children}
    </main>
  </div>
}

export function RefreshButton({ onClick, busy = false, label = 'Refresh' }: { onClick: () => void; busy?: boolean; label?: string }) {
  return <button type="button" className="icon-btn" aria-label={label} title={label} disabled={busy} onClick={onClick}><RefreshCw size={18} className={busy ? 'spin' : undefined} /></button>
}

export function LoadState({ loading, error, disconnected, retry, variant = 'grid' }: { loading: boolean; error?: string; disconnected?: boolean; retry: () => void; variant?: 'grid' | 'list' | 'detail' }) {
  if (loading) {
    if (variant === 'detail') return <div aria-label="Loading" aria-busy="true"><div className="skeleton skeleton-hero" /></div>
    if (variant === 'list') return <div className="friend-list" aria-label="Loading" aria-busy="true">{Array.from({ length: 6 }, (_, i) => <div className="skeleton" style={{ height: 76 }} key={i} />)}</div>
    return <div className="game-grid" aria-label="Loading" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <div className="skeleton skeleton-card" key={i} />)}</div>
  }
  if (!error) return null
  return <EmptyState icon={AlertCircle} title={disconnected ? 'Bring your desktop with you' : 'Couldn’t load this view'} role="alert"
    action={disconnected ? <Link className="btn btn-primary" href="/?reconnect=1">Connect to Ascendara <ArrowUpRight size={16} /></Link> : <button className="btn btn-primary" onClick={retry}><RefreshCw size={16} />Try again</button>}>
    {error}
  </EmptyState>
}

export function EmptyState({ icon: Icon, title, children, action, role }: { icon: LucideIcon; title: string; children?: React.ReactNode; action?: React.ReactNode; role?: string }) {
  return <section className="empty-state" role={role}><div className="empty-icon"><Icon size={26} /></div><h2>{title}</h2>{children && <p>{children}</p>}{action}</section>
}

export function Stat({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return <div className="stat"><div className="stat-icon"><Icon size={19} /></div><div className="stat-copy"><span className="stat-label">{label}</span><strong className="stat-value">{children}</strong></div></div>
}

export function SearchField({ value, onChange, placeholder, label, onSubmit }: { value: string; onChange: (value: string) => void; placeholder: string; label: string; onSubmit?: () => void }) {
  return <form className="search-field" role="search" onSubmit={event => { event.preventDefault(); onSubmit?.() }}>
    <Search size={18} aria-hidden="true" />
    <input type="search" aria-label={label} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} enterKeyHint="search" />
    {value && <button type="button" className="search-clear" aria-label="Clear search" onClick={() => onChange('')}><X size={16} /></button>}
  </form>
}

export function SegmentedTabs<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string; count?: number }[]; onChange: (value: T) => void }) {
  return <div className="segmented" role="tablist" aria-label={label}>
    {options.map(option => <button key={option.value} type="button" role="tab" aria-selected={option.value === value} onClick={() => onChange(option.value)}>
      {option.label}{option.count !== undefined && <span className="count-badge">{option.count}</span>}
    </button>)}
  </div>
}

export function Pagination({ page, totalPages, onPage, label }: { page: number; totalPages: number; onPage: (page: number) => void; label: string }) {
  return <nav className="pagination" aria-label={label}>
    <button type="button" className="icon-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
    <span>Page {page} of {totalPages}</span>
    <button type="button" className="icon-btn" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
  </nav>
}

export function GameArtwork({ src, name, eager = false, loading = false }: { src?: string; name: string; eager?: boolean; loading?: boolean }) {
  return <ArtworkImage key={src || name} src={src} name={name} eager={eager} loading={loading} />
}
function ArtworkImage({ src, name, eager, loading }: { src?: string; name: string; eager: boolean; loading: boolean }) {
  const [failures, setFailures] = useState(0)
  const [retry, setRetry] = useState(0)
  const [loaded, setLoaded] = useState(false)
  const retrying = failures > retry
  useEffect(() => {
    if (!retrying) return
    const retryNow = () => setRetry(failures)
    const timer = setTimeout(retryNow, failures <= 2 ? 1000 * failures : 60_000)
    window.addEventListener('online', retryNow)
    return () => { clearTimeout(timer); window.removeEventListener('online', retryNow) }
  }, [failures, retrying])
  loading = loading || (retrying && failures <= 2)
  return <div className="game-art" aria-busy={loading}>{src && failures === retry ?
    // eslint-disable-next-line @next/next/no-img-element
    <img key={retry} src={src} alt={name} loading={eager ? 'eager' : 'lazy'} fetchPriority={eager ? 'high' : 'auto'} decoding="async" className={loaded ? 'loaded' : undefined} ref={node => { if (node?.complete && node.naturalWidth) setLoaded(true) }} onLoad={() => setLoaded(true)} onError={() => setFailures(n => n + 1)} /> : <div className={`art-placeholder${loading ? ' artwork-pending' : ''}`}><Gamepad2 size={30} /><span>{loading ? 'Loading artwork…' : name}</span></div>}</div>
}

// Dialog behaviour shared by the library sheets: Escape closes and the page
// behind stops scrolling while it is open.
export function useSheet(open: boolean, close: () => void) {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = overflow; window.removeEventListener('keydown', onKey) }
  }, [open, close])
}
