'use client'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ChevronRight, Clock3, Cloud, Library, MonitorSmartphone, Play, Rocket, Search, Star, WifiOff, X, AlertCircle } from 'lucide-react'
import { CompanionLayout, EmptyState, GameArtwork, LoadState, RefreshButton, SearchField, Stat, useSheet } from '@/components/companion-layout'
import { MenuSelect } from '@/components/ui/menu-select'
import { useGameArtwork } from '@/hooks/use-game-artwork'
import { useVisibleGames } from '@/hooks/use-visible-games'
import { apiClient } from '@/lib/api'
import { companionFetch, companionPost, playtime, type DesktopGame, type DesktopLibrary } from '@/lib/companion'

const time = (value?: string) => (value && Date.parse(value)) || 0
const SORTS: Record<string, (a: DesktopGame, b: DesktopGame) => number> = {
  recent: (a, b) => time(b.lastPlayed) - time(a.lastPlayed),
  playtime: (a, b) => b.playTime - a.playTime,
  name: (a, b) => a.name.localeCompare(b.name),
}

// The last library seen this visit, so returning to the tab shows games
// immediately while a fresh copy loads in the background.
let lastLibrary: { session: string | null; data: DesktopLibrary } | null = null
const rememberedLibrary = () => lastLibrary && lastLibrary.session === apiClient.getSessionId() ? lastLibrary.data : null

export default function LibraryPage() {
  const [library, setLibrary] = useState<DesktopLibrary | null>(rememberedLibrary)
  const [loading, setLoading] = useState(() => !rememberedLibrary())
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState('recent')
  const [selected, setSelected] = useState<DesktopGame | null>(null)
  const [launching, setLaunching] = useState(false)
  const [launchMessage, setLaunchMessage] = useState('')

  async function refresh() {
    try {
      const data = await companionFetch<DesktopLibrary>('library', AbortSignal.timeout(20_000))
      lastLibrary = { session: apiClient.getSessionId(), data }
      setLibrary(data)
      setError('')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load your desktop library.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    const initial = setTimeout(() => { void refresh() }, 0)
    const interval = setInterval(() => { void refresh() }, 15_000)
    return () => { clearTimeout(initial); clearInterval(interval) }
  }, [])

  const games = useMemo(() => (library?.games || []).filter(game => game.name.toLowerCase().includes(query.toLowerCase())).sort(SORTS[sort]), [library, query, sort])
  const recent = useMemo(() => (library?.games || []).filter(game => time(game.lastPlayed)).sort(SORTS.recent).slice(0, 8), [library])
  const showRecent = !query && recent.length > 0
  const { gridRef, names: visibleNames } = useVisibleGames(games.map(game => game.name))
  const artwork = useGameArtwork([...(showRecent ? recent.map(game => game.name) : []), ...visibleNames, ...(selected ? [selected.name] : [])])
  const totalPlaytime = (library?.games || []).reduce((total, game) => total + game.playTime, 0)
  const open = (game: DesktopGame) => { setSelected(game); setLaunchMessage('') }
  const close = useCallback(() => setSelected(null), [])

  async function launch(game: DesktopGame) {
    setLaunching(true)
    setLaunchMessage('Sending launch request to Ascendara…')
    try {
      const { commandId } = await companionPost<{ commandId: string }>('library/launch', { gameId: game.id })
      for (let attempt = 0; attempt < 30; attempt++) {
        await new Promise(resolve => setTimeout(resolve, 2_000))
        const result = await companionFetch<{ status: string; error?: string }>(`library/commands/${commandId}`)
        if (result.status === 'completed') {
          setLaunchMessage(`${game.name} launched on your desktop.`)
          return
        }
        if (result.status === 'failed' || result.status === 'expired') {
          throw new Error(result.error || 'Ascendara could not launch this game.')
        }
      }
      throw new Error('Ascendara did not respond to the launch request.')
    } catch (cause) {
      setLaunchMessage(cause instanceof Error ? cause.message : 'Unable to launch the game.')
    } finally {
      setLaunching(false)
    }
  }

  return <CompanionLayout title="Your desktop games" eyebrow="Library"
    subtitle="Browse what’s installed in Ascendara and launch it on your desktop."
    actions={<>{library && <span className="status-chip"><span className={`status-dot${library.online ? ' online live' : ''}`} />{library.online ? 'Desktop online' : 'Desktop offline'}</span>}<RefreshButton label="Refresh library" busy={refreshing} onClick={() => { setRefreshing(true); void refresh() }} /></>}>
    <LoadState loading={loading && !library} error={error && !library ? error : undefined} retry={() => { setLoading(true); void refresh() }} />
    {library && <>
      <div className="stat-strip">
        <Stat icon={Library} label="Installed games">{library.games.length}</Stat>
        <Stat icon={Clock3} label="Total playtime">{playtime(totalPlaytime)}</Stat>
        <Stat icon={library.online ? MonitorSmartphone : WifiOff} label="Desktop">{library.online ? 'Online' : 'Offline'}</Stat>
      </div>
      {!library.online && <div className="callout warn"><WifiOff size={18} /><div><strong>Your desktop is offline.</strong> Open Ascendara on your desktop to refresh your library and launch games.{library.lastSeen && ` Last connected ${new Date(library.lastSeen).toLocaleString()}.`}</div></div>}
      {error && <div className="callout danger" role="alert"><AlertCircle size={18} /><div>{error}</div></div>}

      {showRecent && <section className="section">
        <div className="section-head"><h2>Jump back in</h2></div>
        <div className="rail">{recent.map(game => <button type="button" key={game.id} className="rail-card" onClick={() => open(game)}>
          <GameArtwork name={game.name} src={artwork[game.name] || undefined} loading={artwork[game.name] === undefined} />
          <span className="rail-card-copy"><strong>{game.name}</strong><span>Played {new Date(game.lastPlayed).toLocaleDateString()} · {playtime(game.playTime)}</span></span>
        </button>)}</div>
      </section>}

      <section className="section">
        <div className="section-head"><h2>All games <span className="count-badge">{library.games.length}</span></h2></div>
        <div className="toolbar">
          <SearchField label="Search installed games" placeholder="Search installed games…" value={query} onChange={setQuery} />
          <MenuSelect label="Sort library" value={sort} onChange={setSort} options={[{ value: 'recent', label: 'Recently played' }, { value: 'playtime', label: 'Most played' }, { value: 'name', label: 'Name: A–Z' }]} />
        </div>
        <div ref={gridRef} className="game-grid">{games.map(game => <button type="button" data-game-name={game.name} className="game-card" key={game.id} onClick={() => open(game)}>
          <div className="game-card-badges">{game.favorite && <span className="art-badge"><Star size={11} fill="currentColor" />Favorite</span>}{game.isCustom && <span className="art-badge end">Custom</span>}</div>
          <GameArtwork name={game.name} src={artwork[game.name] || undefined} loading={artwork[game.name] === undefined} />
          <span className="game-card-body"><strong className="game-card-title">{game.name}</strong><span className="game-card-meta"><Clock3 size={12} />{playtime(game.playTime)}{game.version && <><span className="sep">·</span>v{game.version}</>}</span></span>
        </button>)}</div>
        {!games.length && <EmptyState icon={library.games.length ? Search : Library} title={library.games.length ? 'No matching games' : 'No installed games found'}>{library.games.length ? 'Try another title.' : 'Install or add a game in Ascendara, then refresh this page.'}</EmptyState>}
      </section>

      <Link className="promo-card" href="/cloud-library"><div className="stat-icon"><Cloud size={19} /></div><div><strong>Cloud collection</strong><span>Synced playtime, favorites and achievements across devices.</span></div><ChevronRight size={18} /></Link>
    </>}
    {selected && <GameSheet game={selected} art={artwork[selected.name] || undefined} online={!!library?.online} launching={launching} message={launchMessage} onLaunch={() => void launch(selected)} onClose={close} />}
  </CompanionLayout>
}

function GameSheet({ game, art, online, launching, message, onLaunch, onClose }: { game: DesktopGame; art?: string; online: boolean; launching: boolean; message: string; onLaunch: () => void; onClose: () => void }) {
  useSheet(true, onClose)
  const tags = [game.online && 'Online play', game.dlc && 'Includes DLC', game.isCustom && 'Custom game', ...(game.categories || [])].filter(Boolean) as string[]
  return <div className="sheet-backdrop" onClick={onClose}>
    <section className="sheet" role="dialog" aria-modal="true" aria-label={game.name} onClick={event => event.stopPropagation()}>
      <button className="sheet-close" aria-label="Close game details" onClick={onClose}><X size={18} /></button>
      <div className="sheet-hero"><GameArtwork name={game.name} src={art} eager /></div>
      <div className="sheet-body">
        {game.favorite && <p className="eyebrow"><Star size={13} fill="currentColor" />Favorite</p>}
        <h2>{game.name}</h2>
        <p>{game.description || 'Installed in your Ascendara library.'}</p>
        {tags.length > 0 && <div className="chip-row" style={{ marginBottom: 18 }}>{tags.map(tag => <span key={tag} className="chip">{tag}</span>)}</div>}
        <dl className="fact-grid" style={{ ['--cols' as string]: 2 }}>
          <div className="fact"><dt>Playtime</dt><dd>{playtime(game.playTime)}</dd></div>
          <div className="fact"><dt>Launches</dt><dd>{game.launchCount}</dd></div>
          {game.lastPlayed && <div className="fact"><dt>Last played</dt><dd>{new Date(game.lastPlayed).toLocaleDateString()}</dd></div>}
          {game.version && <div className="fact"><dt>Version</dt><dd>{game.version}</dd></div>}
          {game.size && <div className="fact"><dt>Size</dt><dd>{game.size}</dd></div>}
        </dl>
        <div className="sheet-actions">
          <button className="btn btn-primary btn-block" disabled={!online || launching} onClick={onLaunch}>{launching ? <Rocket size={17} className="spin" /> : <Play size={17} fill="currentColor" />}{launching ? 'Launching…' : 'Play on desktop'}</button>
          {message ? <p role="status" className="sheet-status">{message}</p> : !online && <p className="sheet-status">Open Ascendara on your desktop to launch games.</p>}
        </div>
      </div>
    </section>
  </div>
}
