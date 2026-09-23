'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowUpRight, ChevronLeft, ChevronRight, RefreshCw, Search } from 'lucide-react'
import { CompanionLayout, GameArtwork, LoadState } from '@/components/companion-layout'
import { MenuSelect } from '@/components/ui/menu-select'
import { useCompanion } from '@/hooks/use-companion'
import { useGameArtwork } from '@/hooks/use-game-artwork'
import type { Catalog } from '@/lib/companion'

export default function ExplorePage() {
  return <Suspense fallback={<CompanionLayout title="Discover games" eyebrow="DISCOVER / LATEST INDEX"><p className="page-intro">Loading the index…</p></CompanionLayout>}><Explore /></Suspense>
}

function Explore() {
  const router = useRouter()
  const params = useSearchParams()
  const query = params.get('q') || ''
  const category = params.get('category') || ''
  const sort = params.get('sort') || 'updated'
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
  const state = useCompanion<Catalog>(`games?${new URLSearchParams({ q: query, category, sort, page: String(page) })}`)
  const artwork = useGameArtwork(state.data?.games.map(game => game.name) || [])

  function navigate(changes: Record<string, string>) {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    router.push(`/explore?${next}`, { scroll: false })
  }

  return <CompanionLayout title="Find your next adventure." eyebrow="DISCOVER / LATEST INDEX"
    action={<button className="quiet-link discover-refresh" disabled={state.loading} onClick={state.retry}><RefreshCw size={16} />Refresh</button>}>
    <p className="page-intro">See what’s on the latest Ascendara index, from recent updates to your next favorite.</p>
    <div className="catalog-controls">
      <CatalogSearch query={query} onSearch={value => navigate({ q: value, page: '1' })} />
      <MenuSelect label="Filter by genre" value={category} onChange={value => navigate({ category: value, page: '1' })} options={[
        { value: '', label: 'All genres' },
        ...(category && !state.data?.categories.includes(category) ? [{ value: category, label: category }] : []),
        ...(state.data?.categories || []).map(value => ({ value, label: value })),
      ]} />
      <MenuSelect label="Sort games" value={sort} onChange={value => navigate({ sort: value, page: '1' })} options={[
        { value: 'updated', label: 'Recently updated' }, { value: 'popular', label: 'Popular' }, { value: 'name', label: 'Name: A–Z' },
      ]} />
    </div>
    <LoadState {...state} />
    {state.data && <>
      <div className="section-heading"><h2>{query ? `Results for “${query}”` : category || 'Explore the index'}</h2><span role="status">{state.data.total.toLocaleString()} games</span></div>
      <p className="index-freshness">{state.data.stale ? 'Showing the last available index. The latest update is temporarily unavailable.' : `Index fetched ${new Date(state.data.fetchedAt).toLocaleString()}. Updates checked every 5 minutes.`}</p>
      <div className="game-grid compact-game-grid">{state.data.games.map(game => <Link key={game.id} className="game-tile" href={`/games/${encodeURIComponent(game.id)}?from=${encodeURIComponent(`/explore?${params}`)}`}>
        <GameArtwork src={artwork[game.name] || undefined} name={game.name} loading={artwork[game.name] === undefined} />
        <div className="game-tile-copy"><h3>{game.name}</h3><p>{game.categories.slice(0, 2).join(' · ') || 'Game'}<span>{game.size}</span></p>{game.updated && <p>Updated {game.updated}<ArrowUpRight size={14} /></p>}</div>
      </Link>)}</div>
      {!state.data.games.length && <section className="empty-state"><Search size={32} /><h2>No games found</h2><p>Try another title or choose a different genre.</p><button className="companion-button" onClick={() => navigate({ q: '', category: '', page: '1' })}>Clear filters</button></section>}
      {state.data.total > 0 && <nav className="pagination" aria-label="Catalog pages">
        <button disabled={state.data.page <= 1} onClick={() => navigate({ page: String(state.data!.page - 1) })} aria-label="Previous page"><ChevronLeft size={18} /></button>
        <span>Page {state.data.page} of {Math.ceil(state.data.total / state.data.pageSize)}</span>
        <button disabled={state.data.page * state.data.pageSize >= state.data.total} onClick={() => navigate({ page: String(state.data!.page + 1) })} aria-label="Next page"><ChevronRight size={18} /></button>
      </nav>}
    </>}
  </CompanionLayout>
}

function CatalogSearch({ query, onSearch }: { query: string; onSearch: (query: string) => void }) {
  const [value, setValue] = useState(query)
  const [previousQuery, setPreviousQuery] = useState(query)
  if (query !== previousQuery) {
    setPreviousQuery(query)
    setValue(query)
  }
  useEffect(() => {
    if (value.trim() === query) return
    const timer = setTimeout(() => onSearch(value.trim()), 450)
    return () => clearTimeout(timer)
  }, [value, query, onSearch])
  return <form className="search-field" onSubmit={event => { event.preventDefault(); onSearch(value.trim()) }}>
    <Search size={18} /><input aria-label="Search the game index" placeholder="Search games…" value={value} onChange={event => setValue(event.target.value)} />
    {value && <button type="button" aria-label="Clear search" onClick={() => setValue('')}>×</button>}
  </form>
}
