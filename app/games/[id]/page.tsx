'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, Download, Globe, HardDrive, Package, Tags } from 'lucide-react'
import { CompanionLayout, GameArtwork, LoadState } from '@/components/companion-layout'
import { useCompanion } from '@/hooks/use-companion'
import { useGameArtwork } from '@/hooks/use-game-artwork'
import type { Game } from '@/lib/companion'

export default function GameDetails() {
  const { id } = useParams<{ id: string }>()
  const params = useSearchParams()
  const from = params.get('from') || ''
  const back = from.startsWith('/explore?') ? from : '/explore'
  const state = useCompanion<{ game: Game; stale: boolean }>(`games/${encodeURIComponent(id)}`)
  const game = state.data?.game
  const artwork = useGameArtwork(game ? [game.name] : [])
  return <CompanionLayout>
    <Link className="back-link" href={back}><ArrowLeft size={16} />Back to results</Link>
    <LoadState {...state} variant="detail" />
    {game && <>
      <section className="detail-hero">
        <GameArtwork name={game.name} src={artwork[game.name] || undefined} loading={artwork[game.name] === undefined} eager />
        <div className="detail-hero-copy">
          {game.categories.length > 0 && <div className="chip-row">{game.categories.map(category => <Link key={category} className="chip" href={`/explore?category=${encodeURIComponent(category)}`}>{category}</Link>)}</div>}
          <h1>{game.name}</h1>
          {game.updated && <p>Last updated {game.updated}</p>}
        </div>
      </section>
      <dl className="fact-grid">
        <div className="fact"><dt><HardDrive size={13} />Download size</dt><dd>{game.size || 'Not listed'}</dd></div>
        <div className="fact"><dt><Tags size={13} />Version</dt><dd>{game.version || 'Not listed'}</dd></div>
        <div className="fact"><dt><Globe size={13} />Online support</dt><dd>{game.online ? 'Included' : 'Not listed'}</dd></div>
        <div className="fact"><dt><Package size={13} />DLC</dt><dd>{game.dlc ? 'Included' : 'Not listed'}</dd></div>
      </dl>
      {state.data?.stale && <p className="freshness" style={{ marginTop: 14 }}><span className="status-dot away" />Showing the last available index while the latest update is unavailable.</p>}
      <div className="detail-layout">
        <div>
          <section className="panel"><h2>About this game</h2><p className="prose">{game.description || 'A description is not included in this index entry.'}</p></section>
          <section className="panel"><h2>System requirements</h2><p className="prose pre">{game.requirements || 'System requirements are not provided for this game.'}</p></section>
        </div>
        <aside className="panel cta-panel">
          <div className="stat-icon"><Download size={19} /></div>
          <h2>Ready to play?</h2>
          <p>Open Ascendara on your desktop to install this game, then follow its progress right here.</p>
          <Link className="btn btn-primary btn-block" href="/dashboard">View downloads <ArrowUpRight size={16} /></Link>
        </aside>
      </div>
    </>}
  </CompanionLayout>
}
