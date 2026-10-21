'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import { CompanionLayout, EmptyState, LoadState, RefreshButton, SearchField, SegmentedTabs } from '@/components/companion-layout'
import { FriendAvatar, statusLabel } from '@/components/friend-avatar'
import { apiClient } from '@/lib/api'

interface Friend {
  uid: string
  displayName: string
  photoURL?: string
  status?: { status?: string; customMessage?: string }
}

type Filter = 'all' | 'online' | 'away' | 'busy' | 'offline'
const ACTIVE = ['online', 'away', 'busy']
const presence = (friend: Friend) => ACTIVE.includes(friend.status?.status || '') ? friend.status!.status! : 'offline'

export default function FriendsPage() {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
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

  const visibleFriends = useMemo(() => friends.filter(friend =>
    friend.displayName.toLowerCase().includes(query.toLowerCase()) && (filter === 'all' || presence(friend) === filter)
  ), [friends, query, filter])
  const count = (status: string) => friends.filter(friend => presence(friend) === status).length
  const online = friends.filter(friend => ACTIVE.includes(presence(friend))).length
  const retry = () => setAttempt(n => n + 1)
  const groups = filter === 'all'
    ? [{ title: 'Active now', items: visibleFriends.filter(friend => ACTIVE.includes(presence(friend))) }, { title: 'Offline', items: visibleFriends.filter(friend => !ACTIVE.includes(presence(friend))) }]
    : [{ title: statusLabel(filter), items: visibleFriends }]

  return <CompanionLayout title="Your people" eyebrow="Friends"
    subtitle={loading || error ? 'See who’s around and what your friends are up to.' : online ? `${online} of ${friends.length} friends active right now.` : 'No one is active right now.'}
    actions={<RefreshButton label="Refresh friends" busy={loading} onClick={retry} />}>
    <div className="toolbar"><SearchField label="Search friends" placeholder="Search friends…" value={query} onChange={setQuery} /></div>
    <SegmentedTabs label="Filter friends" value={filter} onChange={setFilter} options={[
      { value: 'all', label: 'Everyone', count: friends.length },
      { value: 'online', label: 'Online', count: count('online') },
      { value: 'away', label: 'Away', count: count('away') },
      { value: 'busy', label: 'Busy', count: count('busy') },
      { value: 'offline', label: 'Offline', count: friends.length - online },
    ]} />
    <LoadState loading={loading} error={error} disconnected={disconnected} retry={retry} variant="list" />
    {!loading && !error && !visibleFriends.length && <EmptyState icon={friends.length ? Search : Users} title={friends.length ? 'No matching friends' : 'Your friend list is quiet'}>{friends.length ? 'Try a different name or status filter.' : 'Add friends in Ascendara to see their presence here.'}</EmptyState>}
    {!loading && !error && groups.filter(group => group.items.length).map(group => <section key={group.title} className="section">
      <div className="section-head"><h2>{group.title}<span className="count-badge">{group.items.length}</span></h2></div>
      <div className="friend-list">{group.items.map(friend => {
        const status = presence(friend)
        const message = friend.status?.customMessage && status !== 'offline' ? friend.status.customMessage : ''
        return <article className={`friend-card ${status}`} key={friend.uid}>
          <FriendAvatar name={friend.displayName} photoURL={friend.photoURL} status={status} />
          <div className="friend-copy"><strong>{friend.displayName}</strong><span>{message || statusLabel(status)}</span></div>
          {message && <span className={`presence-label ${status}`}>{statusLabel(status)}</span>}
        </article>
      })}</div>
    </section>)}
  </CompanionLayout>
}
