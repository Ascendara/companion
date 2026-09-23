'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Circle, RefreshCw, Search, Users } from 'lucide-react'
import { CompanionLayout, LoadState } from '@/components/companion-layout'
import { MenuSelect } from '@/components/ui/menu-select'
import { apiClient } from '@/lib/api'

interface Friend {
  uid: string
  displayName: string
  photoURL?: string
  status?: { status?: string; customMessage?: string }
}

function initials(name: string) {
  return name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
}

function statusLabel(status = 'offline') {
  return status === 'online' ? 'Online' : status === 'away' ? 'Away' : status === 'busy' ? 'Busy' : 'Offline'
}

export default function FriendsPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | undefined>(undefined)
  const [disconnected, setDisconnected] = useState(false)
  const [attempt, setAttempt] = useState(0)

  // Note: this intentionally uses apiClient.getFriends() (POST /get-friends),
  // not the generic useCompanion('friends') hook - there is no GET
  // /companion/friends route on monitor-api.py, only POST /get-friends, so
  // that hook always 404s here.
  const load = useCallback(async () => {
    setLoading(true)
    setError(undefined)
    setDisconnected(false)
    const response = await apiClient.getFriends()
    if (response.success && response.data) {
      setFriends(response.data.friends)
    } else {
      setError(response.error || 'Unable to load your friends.')
      setDisconnected(!apiClient.getSessionId())
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load, attempt])

  const visibleFriends = useMemo(() => friends.filter(friend => {
    const status = friend.status?.status || 'offline'
    return friend.displayName.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || status === filter)
  }), [friends, query, filter])
  const online = friends.filter(friend => ['online', 'away', 'busy'].includes(friend.status?.status || '')).length
  const retry = () => setAttempt(n => n + 1)

  return <CompanionLayout title="Your people, in sync." eyebrow="FRIENDS" action={<button className="quiet-link" onClick={retry}><RefreshCw size={16} />Refresh</button>}>
    <p className="page-intro">See who is around and what your friends are up to in Ascendara.</p>
    <div className="stat-grid friend-stats"><div><Users /><span>Total friends</span><strong>{friends.length}</strong></div><div><Circle /><span>Online now</span><strong>{online}</strong></div><div><span>Offline</span><strong>{Math.max(0, friends.length - online)}</strong></div></div>
    <div className="section-heading"><h2>Friends list</h2><span>{online ? `${online} active now` : 'No one is active right now'}</span></div>
    <div className="catalog-controls"><label className="search-field"><Search size={18} /><input aria-label="Search friends" placeholder="Search friends…" value={query} onChange={event => setQuery(event.target.value)} /></label><MenuSelect label="Filter friends" value={filter} onChange={setFilter} options={[{ value: 'all', label: 'Everyone' }, { value: 'online', label: 'Online' }, { value: 'away', label: 'Away' }, { value: 'busy', label: 'Busy' }, { value: 'offline', label: 'Offline' }]} /></div>
    <LoadState loading={loading} error={error} disconnected={disconnected} retry={retry} />
    {!loading && !error && !visibleFriends.length && <section className="empty-state"><Users size={32} /><h2>{friends.length ? 'No matching friends' : 'Your friend list is quiet'}</h2><p>{friends.length ? 'Try a different name or status filter.' : 'Add friends in Ascendara to see their presence here.'}</p></section>}
    {!loading && !error && visibleFriends.length > 0 && <div className="friends-grid">{visibleFriends.map(friend => { const status = friend.status?.status || 'offline'; return <article className="friend-card" key={friend.uid}><div className={`friend-avatar status-${status}`}>{friend.photoURL ? <img src={friend.photoURL} alt="" onError={event => { event.currentTarget.style.display = 'none' }} /> : initials(friend.displayName)}</div><div className="friend-copy"><div className="friend-name-row"><h3>{friend.displayName}</h3><span className={`status-dot status-${status}`} aria-label={statusLabel(status)} /></div><p className="friend-status">{statusLabel(status)}{friend.status?.customMessage && status !== 'offline' ? <><span>·</span>{friend.status.customMessage}</> : null}</p></div></article> })}</div>}
  </CompanionLayout>
}
