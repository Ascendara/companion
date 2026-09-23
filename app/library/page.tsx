'use client'
import { useState } from 'react'
import { Library, Search, Star, Clock3, Trophy, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { CompanionLayout, GameArtwork, LoadState } from '@/components/companion-layout'
import { MenuSelect } from '@/components/ui/menu-select'
import { useCompanion } from '@/hooks/use-companion'
import { useGameArtwork } from '@/hooks/use-game-artwork'
import { Account, playtime } from '@/lib/companion'

export default function LibraryPage() {
  const state = useCompanion<Account>('account')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [page, setPage] = useState(1)
  const library = state.data?.library
  const games = (library?.games || []).filter(game => game.name.toLowerCase().includes(query.toLowerCase()) && (filter !== 'favorites' || game.favorite) && (filter !== 'completed' || game.completed))
  const totalPages = Math.max(1, Math.ceil(games.length / 6))
  const currentPage = Math.min(page, totalPages)
  const visibleGames = games.slice((currentPage - 1) * 6, currentPage * 6)
  const artwork = useGameArtwork(visibleGames.map(game => game.name))
  return <CompanionLayout title="Your collection, connected." eyebrow="LIBRARY">
    <p className="page-intro">Your games, playtime, and milestones. Synced from Ascendara.</p><LoadState {...state} />
    {library && <><div className="stat-grid"><div><Library /><span>Games in your library</span><strong>{library.games?.length || 0}</strong></div><div><Clock3 /><span>Total playtime</span><strong>{playtime(library.totalPlaytime)}</strong></div><div><Trophy /><span>Achievements unlocked</span><strong>{library.unlockedAchievements || 0}<small> / {library.totalAchievements || 0}</small></strong></div></div>
      <div className="section-heading"><h2>All your games</h2><span>{library.lastSynced ? `Last synced ${new Date(library.lastSynced).toLocaleDateString()}` : 'Waiting for your first sync'}</span></div>
      <div className="catalog-controls"><label className="search-field"><Search size={18} /><input aria-label="Search library" placeholder="Search your library…" value={query} onChange={e => { setQuery(e.target.value); setPage(1) }} /></label><MenuSelect label="Filter library" value={filter} onChange={value => { setFilter(value); setPage(1) }} options={[{ value: 'all', label: 'All games' }, { value: 'favorites', label: 'Favorites' }, { value: 'completed', label: 'Completed' }]} /></div>
      <div className="game-grid compact-game-grid">{visibleGames.map((game, index) => <article className="game-tile" key={`${game.gameID || game.name}-${index}`}><GameArtwork name={game.name} src={artwork[game.name] || undefined} loading={artwork[game.name] === undefined} /><div className="game-tile-copy"><h3>{game.name}</h3><p><span className="inline-meta"><Clock3 size={14} />{playtime(game.playTime)}</span>{game.favorite && <Star size={14} aria-label="Favorite" />}{game.completed && <CheckCircle2 size={14} aria-label="Completed" />}</p>{game.achievementStats && <p><Trophy size={14} /> {game.achievementStats.unlocked} / {game.achievementStats.total} achievements</p>}{game.lastPlayed && <p>Last played {new Date(game.lastPlayed).toLocaleDateString()}</p>}</div></article>)}</div>
      {!games.length && <section className="empty-state"><Library size={32} /><h2>{library.games?.length ? 'No matching games' : 'Your collection starts on desktop'}</h2><p>{library.games?.length ? 'Try another title or change the filter.' : 'Sync your cloud library in Ascendara to see your games and playtime here.'}</p></section>}</>}
    {library && totalPages > 1 && <nav className="pagination" aria-label="Library pages">
      <button disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
      <span>Page {currentPage} of {totalPages}</span>
      <button disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
    </nav>}
  </CompanionLayout>
}
