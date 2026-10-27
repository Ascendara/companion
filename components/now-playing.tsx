'use client'

import { useEffect, useState } from 'react'
import { Gamepad2, Square, LoaderCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { companionFetch, companionPost } from '@/lib/companion'
import { useGameArtwork } from '@/hooks/use-game-artwork'

type Session = { gameId: string; sessionId: string; name: string; startedAt: number; canStop: boolean }
type Activity = { sessions: Session[]; online: boolean }

export function NowPlaying() {
  const pathname = usePathname()
  const [activity, setActivity] = useState<Activity>({ sessions: [], online: false })
  const [now, setNow] = useState(0)
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [owner, setOwner] = useState<string | null>(null)
  const artwork = useGameArtwork(activity.sessions.map(game => game.name))

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const controller = new AbortController()
    async function poll() {
      const session = apiClient.getSessionId()
      if (!session) {
        setActivity({ sessions: [], online: false })
        setOwner(null)
      } else if (document.visibilityState === 'visible') {
        try {
          const data = await companionFetch<Activity>('activity', AbortSignal.any([controller.signal, AbortSignal.timeout(10000)]))
          if (active && session === apiClient.getSessionId()) { setActivity(data); setOwner(session) }
        } catch {
          if (active) setActivity(previous => ({ ...previous, online: false }))
        }
      }
      if (active) timer = setTimeout(poll, 3000)
    }
    void poll()
    const clock = setInterval(() => setNow(Date.now()), 1000)
    return () => { active = false; controller.abort(); clearTimeout(timer); clearInterval(clock) }
  }, [pathname])

  async function stop(game: Session) {
    if (!window.confirm(`Stop ${game.name}? The game will be force closed. Unsaved progress may be lost.`)) return
    const session = apiClient.getSessionId()
    setPending(game.sessionId)
    setError('')
    try {
      const { commandId } = await companionPost<{ commandId: string }>('library/stop', game)
      const deadline = Date.now() + 100000
      while (Date.now() < deadline && session === apiClient.getSessionId()) {
        await new Promise(resolve => setTimeout(resolve, 2000))
        if (session !== apiClient.getSessionId()) return
        const result = await companionFetch<{ status: string; error?: string }>(`library/commands/${commandId}`, AbortSignal.timeout(10000))
        if (result.status === 'completed') return
        if (result.status === 'failed' || result.status === 'expired') throw new Error(result.error || 'Stop request expired. Try again.')
      }
      throw new Error('Could not confirm the game stopped. Check your desktop.')
    } catch (cause) {
      if (session === apiClient.getSessionId()) setError(cause instanceof Error ? cause.message : 'Unable to stop game.')
    } finally { setPending(null) }
  }

  if (pathname === '/' || !owner || owner !== apiClient.getSessionId() || !activity.sessions.length) return null
  return <aside className="now-playing" aria-label="Now playing on your desktop">
    {activity.sessions.map(game => {
      const seconds = Math.max(0, Math.floor(((now || game.startedAt) - game.startedAt) / 1000))
      const elapsed = `${Math.floor(seconds / 3600) ? `${Math.floor(seconds / 3600)}:` : ''}${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
      return <div className="now-playing-row" key={game.sessionId}>
        <div className="now-playing-art">{artwork[game.name] ?
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artwork[game.name]!} alt="" /> : <Gamepad2 size={26} />}</div>
        <div className="now-playing-copy">
          <span className="now-playing-label"><i className={activity.online ? 'live' : ''} />{activity.online ? 'Playing on your PC' : 'Desktop disconnected'}</span>
          <strong>{game.name}</strong>
          <span className="now-playing-time">{activity.online ? `${elapsed} this session` : 'Waiting for live status'}</span>
        </div>
        <button className="now-playing-stop" disabled={!activity.online || !game.canStop || pending !== null} onClick={() => void stop(game)} aria-label={`Stop ${game.name}`} title={game.canStop ? 'Stop game' : 'Update the desktop game helper and relaunch to enable stop'}>
          {pending === game.sessionId ? <LoaderCircle size={19} className="spin" /> : <Square size={17} fill="currentColor" />}
        </button>
      </div>
    })}
    {error && <p className="now-playing-error" role="alert">{error}</p>}
  </aside>
}
