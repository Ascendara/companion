'use client'

import { Suspense, useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowRight, HardDrive, Search, Sparkles, X } from 'lucide-react'
import { CompanionLayout, EmptyState, GameArtwork, LoadState, Pagination, RefreshButton, SearchField } from '@/components/companion-layout'
import { MenuSelect } from '@/components/ui/menu-select'
import { useCompanion } from '@/hooks/use-companion'
import { useGameArtwork } from '@/hooks/use-game-artwork'
import { useVisibleGames } from '@/hooks/use-visible-games'
import type { Catalog, Game } from '@/lib/companion'

const SORT_OPTIONS = [
  { value: 'updated', label: 'Recently updated' }, { value: 'popular', label: 'Popular' }, { value: 'name', label: 'Name: A–Z' },
]

export default function ExplorePage() {
  return <Suspense fallback={<CompanionLayout title="Find your next adventure" eyebrow="Discover"><LoadState loading retry={() => {}} /></CompanionLayout>}><Explore /></Suspense>
}

function Explore() {
  const router = useRouter()
  const params = useSearchParams()
  const query = params.get('q') || ''
  const category = params.get('category') || ''
  const sort = params.get('sort') || 'updated'
  const page = Math.max(1, Number.parseInt(params.get('page') || '1', 10) || 1)
  const state = useCompanion<Catalog>(`games?${new URLSearchParams({ q: query, category, sort, page: String(page) })}`)
  const games = state.data?.games || []
  // The newest update gets a spotlight on the landing view only.
  const spotlight = !query && !category && sort === 'updated' && page === 1 ? games[0] : undefined
  const gridGames = spotlight ? games.slice(1) : games
  const { gridRef, names: visibleNames } = useVisibleGames(gridGames.map(game => game.name))
  const artwork = useGameArtwork(spotlight ? [spotlight.name, ...visibleNames] : visibleNames)
  const from = encodeURIComponent(`/explore?${params}`)

  const navigate = useCallback((changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString())
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    router.push(`/explore?${next}`, { scroll: false })
  }, [params, router])
  const search = useCallback((value: string) => navigate({ q: value, page: '1' }), [navigate])
  const totalPages = state.data ? Math.max(1, Math.ceil(state.data.total / state.data.pageSize)) : 1

  return <CompanionLayout title="Find your next adventure" eyebrow="Discover"
    subtitle="Browse the latest Ascendara index, from fresh updates to your next favorite."
    actions={<RefreshButton label="Refresh index" busy={state.loading} onClick={state.retry} />}>
    {spotlight && <Spotlight game={spotlight} src={artwork[spotlight.name] || undefined} loading={artwork[spotlight.name] === undefined} href={`/games/${encodeURIComponent(spotlight.id)}?from=${from}`} />}
    <div className="toolbar">
      <CatalogSearch query={query} onSearch={search} />
      <MenuSelect label="Filter by genre" value={category} onChange={value => navigate({ category: value, page: '1' })} options={[
        { value: '', label: 'All genres' },
        ...(category && !state.data?.categories.includes(category) ? [{ value: category, label: category }] : []),
        ...(state.data?.categories || []).map(value => ({ value, label: value })),
      ]} />
      <MenuSelect label="Sort games" value={sort} onChange={value => navigate({ sort: value, page: '1' })} options={SORT_OPTIONS} />
    </div>
    {(query || category) && <div className="chip-row filter-chips">
      {query && <button type="button" className="chip accent" onClick={() => navigate({ q: '', page: '1' })} aria-label={`Remove search “${query}”`}>“{query}”<X size={13} /></button>}
      {category && <button type="button" className="chip accent" onClick={() => navigate({ category: '', page: '1' })} aria-label={`Remove genre ${category}`}>{category}<X size={13} /></button>}
    </div>}
    <LoadState {...state} />
    {state.data && <>
      <div className="section-head"><h2>{query ? 'Search results' : category || (spotlight ? 'More recent updates' : 'Explore the index')}</h2><span className="section-meta" role="status">{state.data.total.toLocaleString()} games</span></div>
      <p className="freshness"><span className={`status-dot${state.data.stale ? ' away' : ' online'}`} />{state.data.stale ? 'Showing the last available index while the latest update is unavailable.' : `Index fetched ${new Date(state.data.fetchedAt).toLocaleString()} · checked every 5 minutes`}</p>
      <div ref={gridRef} className="game-grid">{gridGames.map((game, index) => <Link key={game.id} data-game-name={game.name} className="game-card" href={`/games/${encodeURIComponent(game.id)}?from=${from}`}>
        <div className="game-card-badges">{game.size && <span className="art-badge end"><HardDrive size={11} />{game.size}</span>}</div>
        <GameArtwork src={artwork[game.name] || undefined} name={game.name} eager={index < 2} loading={artwork[game.name] === undefined} />
        <div className="game-card-body">
          <h3>{game.name}</h3>
          <p className="game-card-meta">{game.categories.slice(0, 2).join(' · ') || 'Game'}</p>
          {game.updated && <p className="game-card-meta game-card-foot">Updated {game.updated}</p>}
        </div>
      </Link>)}</div>
      {!games.length && <EmptyState icon={Search} title="No games found" action={<button className="btn btn-primary" onClick={() => navigate({ q: '', category: '', page: '1' })}>Clear filters</button>}>Try another title or choose a different genre.</EmptyState>}
      {state.data.total > 0 && <Pagination label="Catalog pages" page={state.data.page} totalPages={totalPages} onPage={next => { navigate({ page: String(next) }); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />}
    </>}
  </CompanionLayout>
}

function Spotlight({ game, src, loading, href }: { game: Game; src?: string; loading: boolean; href: string }) {
  return <Link className="spotlight" href={href}>
    <GameArtwork src={src} name={game.name} eager loading={loading} />
    <div className="spotlight-copy">
      <span className="art-badge"><Sparkles size={12} />Latest update{game.updated ? ` · ${game.updated}` : ''}</span>
      <h2>{game.name}</h2>
      <p>{game.description || game.categories.slice(0, 3).join(' · ') || 'Fresh on the Ascendara index.'}</p>
      <span className="spotlight-cta">View details <ArrowRight size={16} /></span>
    </div>
  </Link>
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
  return <SearchField label="Search the game index" placeholder="Search games…" value={value} onChange={setValue} onSubmit={() => onSearch(value.trim())} />
}
