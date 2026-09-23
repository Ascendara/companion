'use client'
import Link from 'next/link'
import { ArrowUpRight, RefreshCw, AlertCircle, Gamepad2 } from 'lucide-react'
import { BottomNavbar } from './bottom-navbar'
import { useState } from 'react'

export function CompanionLayout({ title, eyebrow, children, action }: { title: string; eyebrow: string; children: React.ReactNode; action?: React.ReactNode }) {
  return <><BottomNavbar /><main className="companion-main"><header className="companion-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{action || <Link className="quiet-link" href="/dashboard">Desktop activity <ArrowUpRight size={16} /></Link>}</header>{children}</main></>
}
export function LoadState({ loading, error, disconnected, retry }: { loading: boolean; error?: string; disconnected?: boolean; retry: () => void }) {
  if (loading) return <div className="game-grid" aria-label="Loading" aria-busy="true">{Array.from({ length: 8 }, (_, i) => <div className="game-skeleton" key={i} />)}</div>
  if (!error) return null
  return <section className="empty-state" role="alert"><AlertCircle size={32} /><h2>{disconnected ? 'Bring your desktop with you' : 'Couldn’t load this view'}</h2><p>{error}</p>{disconnected ? <Link className="companion-button" href="/?reconnect=1">Connect to Ascendara <ArrowUpRight size={16} /></Link> : <button className="companion-button" onClick={retry}><RefreshCw size={16} />Try again</button>}</section>
}
export function GameArtwork({ src, name, eager = false, loading = false }: { src?: string; name: string; eager?: boolean; loading?: boolean }) {
  const [failedSrc, setFailedSrc] = useState<string>()
  return <div className="game-art" aria-busy={loading}>{src && failedSrc !== src ?
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailedSrc(src)} /> : <div className={`art-placeholder${loading ? ' artwork-pending' : ''}`}><Gamepad2 size={36} /><span>{loading ? 'Loading artwork…' : name}</span></div>}</div>
}
