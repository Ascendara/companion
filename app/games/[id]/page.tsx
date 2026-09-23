'use client'

import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { ArrowLeft, Globe, HardDrive, Package, Tags } from 'lucide-react'
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
  return <CompanionLayout title={game?.name || 'Game details'} eyebrow="DISCOVER / GAME DETAILS"
    action={<Link className="quiet-link discover-refresh" href={back}><ArrowLeft size={16} />Back to results</Link>}>
    <LoadState {...state} />
    {game && <>
      <div className="detail-art"><GameArtwork name={game.name} src={artwork[game.name] || undefined} eager /></div>
      {state.data?.stale && <p className="index-freshness">Showing the last available index while the latest update is unavailable.</p>}
      <div className="detail-columns"><article>
        <div className="tag-list">{game.categories.map(category => <Link key={category} className="pill" href={`/explore?category=${encodeURIComponent(category)}`}>{category}</Link>)}</div>
        <h2>About this game</h2><p className="description">{game.description || 'A description is not included in this index entry.'}</p>
        <h2>System requirements</h2><p className="description requirements">{game.requirements || 'System requirements are not provided for this game.'}</p>
      </article><aside className="info-panel"><h2>Game information</h2><dl>
        <div><dt><HardDrive size={16} />Download size</dt><dd>{game.size || 'Not listed'}</dd></div>
        <div><dt><Tags size={16} />Version</dt><dd>{game.version || 'Not listed'}</dd></div>
        <div><dt><Globe size={16} />Online support</dt><dd>{game.online ? 'Included' : 'Not listed'}</dd></div>
        <div><dt><Package size={16} />DLC</dt><dd>{game.dlc ? 'Included' : 'Not listed'}</dd></div>
      </dl>{game.updated && <p>Last updated {game.updated}</p>}<div className="desktop-note"><strong>Ready to play?</strong><p>Open Ascendara on your desktop to install this game, then follow its progress here.</p><Link className="quiet-link" href="/dashboard">View downloads ↗</Link></div></aside></div>
    </>}
  </CompanionLayout>
}
