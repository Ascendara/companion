'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Library, Search, Star, Clock3, Trophy, CheckCircle2 } from 'lucide-react'
import { CompanionLayout, EmptyState, GameArtwork, LoadState, Pagination, RefreshButton, SearchField, SegmentedTabs, Stat } from '@/components/companion-layout'
import { useCompanion } from '@/hooks/use-companion'
import { useGameArtwork } from '@/hooks/use-game-artwork'
import { useVisibleGames } from '@/hooks/use-visible-games'
import { Account, playtime } from '@/lib/companion'

const PAGE_SIZE = 12
type Filter = 'all' | 'favorites' | 'completed'

export default function CloudLibraryPage() {
  const state = useCompanion<Account>('account')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const library = state.data?.library
  const all = library?.games || []
  const games = all.filter(game => game.name.toLowerCase().includes(query.toLowerCase()) && (filter !== 'favorites' || game.favorite) && (filter !== 'completed' || game.completed))
  const totalPages = Math.max(1, Math.ceil(games.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleGames = games.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const { gridRef, names: visibleNames } = useVisibleGames(visibleGames.map(game => game.name))
  const artwork = useGameArtwork(visibleNames)
  const unlocked = library?.unlockedAchievements || 0
  const achievements = library?.totalAchievements || 0

  return <CompanionLayout title="Your synced collection" eyebrow={<Link href="/library" className="text-link"><ArrowLeft size={13} />Library</Link>}
    subtitle="Your games, playtime and milestones, synced from Ascendara."
    actions={<RefreshButton busy={state.loading} onClick={state.retry} />}>
    <LoadState {...state} />
    {library && <>
      <div className="stat-strip">
        <Stat icon={Library} label="Games">{all.length}</Stat>
        <Stat icon={Clock3} label="Total playtime">{playtime(library.totalPlaytime)}</Stat>
        <Stat icon={Trophy} label="Achievements">{unlocked}<small> / {achievements}</small></Stat>
      </div>
      {achievements > 0 && <div className="panel" style={{ marginTop: -16, marginBottom: 32, padding: '14px 18px' }}>
        <div className="section-head" style={{ marginBottom: 10 }}><span className="section-meta">Achievement progress</span><strong style={{ fontSize: 13 }}>{Math.round(unlocked / achievements * 100)}%</strong></div>
        <div className="progress-track"><span style={{ width: `${unlocked / achievements * 100}%` }} /></div>
      </div>}

      <div className="section-head"><h2>All your games</h2><span className="section-meta">{library.lastSynced ? `Synced ${new Date(library.lastSynced).toLocaleDateString()}` : 'Waiting for your first sync'}</span></div>
      <SegmentedTabs label="Filter library" value={filter} onChange={value => { setFilter(value); setPage(1) }} options={[
        { value: 'all', label: 'All', count: all.length },
        { value: 'favorites', label: 'Favorites', count: all.filter(game => game.favorite).length },
        { value: 'completed', label: 'Completed', count: all.filter(game => game.completed).length },
      ]} />
      <div className="toolbar"><SearchField label="Search library" placeholder="Search your collection…" value={query} onChange={value => { setQuery(value); setPage(1) }} /></div>
      <div ref={gridRef} className="game-grid">{visibleGames.map((game, index) => <article data-game-name={game.name} className="game-card" key={`${game.gameID || game.name}-${index}`}>
        <div className="game-card-badges">{game.favorite && <span className="art-badge"><Star size={11} fill="currentColor" />Favorite</span>}{game.completed && <span className="art-badge accent end"><CheckCircle2 size={11} />Completed</span>}</div>
        <GameArtwork name={game.name} src={artwork[game.name] || undefined} loading={artwork[game.name] === undefined} />
        <div className="game-card-body">
          <h3>{game.name}</h3>
          <p className="game-card-meta"><Clock3 size={12} />{playtime(game.playTime)}{game.lastPlayed && <><span className="sep">·</span>{new Date(game.lastPlayed).toLocaleDateString()}</>}</p>
          {game.achievementStats && game.achievementStats.total > 0 && <div className="game-card-foot">
            <span className="game-card-meta"><Trophy size={12} />{game.achievementStats.unlocked} / {game.achievementStats.total} achievements</span>
            <div className="progress-track"><span style={{ width: `${game.achievementStats.unlocked / game.achievementStats.total * 100}%` }} /></div>
          </div>}
        </div>
      </article>)}</div>
      {!games.length && <EmptyState icon={all.length ? Search : Library} title={all.length ? 'No matching games' : 'Your collection starts on desktop'}>{all.length ? 'Try another title or change the filter.' : 'Sync your cloud library in Ascendara to see your games and playtime here.'}</EmptyState>}
      {totalPages > 1 && <Pagination label="Library pages" page={currentPage} totalPages={totalPages} onPage={next => { setPage(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />}
    </>}
  </CompanionLayout>
}
