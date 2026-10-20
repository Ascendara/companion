'use client'

import * as React from 'react'
import Link from 'next/link'
import { ChevronRight, Code, Coffee, Users } from 'lucide-react'
import { CompanionLayout, EmptyState, RefreshButton, SegmentedTabs } from '@/components/companion-layout'
import { DownloadCard } from '@/components/download-card'
import { FriendAvatar, statusLabel } from '@/components/friend-avatar'
import type { Download } from '@/lib/api'

export interface DashboardFriend {
  uid: string
  displayName: string
  photoURL: string
  status: { status: string; customMessage: string }
}

type Filter = 'all' | 'active' | 'paused' | 'error' | 'completed'

interface DownloadsViewProps {
  userName: string
  lastUpdated: Date | null
  isLoading: boolean
  isRefreshing: boolean
  onRefresh: () => void
  downloads: Download[]
  friends: DashboardFriend[]
  loadingDownloads: Set<string>
  onPause: (id: string) => void
  onResume: (id: string) => void
  onCancel: (id: string) => void
  devMode?: boolean
}

// Shared presentation for the live and dev-mode dashboards.
export function DownloadsView({ userName, lastUpdated, isLoading, isRefreshing, onRefresh, downloads, friends, loadingDownloads, onPause, onResume, onCancel, devMode = false }: DownloadsViewProps) {
  const [filter, setFilter] = React.useState<Filter>('all')

  const groups: { id: Exclude<Filter, 'all'>; title: string; items: Download[] }[] = [
    { id: 'active', title: 'Active', items: downloads.filter(d => ['downloading', 'queued', 'extracting', 'verifying', 'updating', 'actionRequired'].includes(d.status)) },
    { id: 'paused', title: 'Paused', items: downloads.filter(d => d.status === 'paused' || d.status === 'stopped') },
    { id: 'error', title: 'Failed', items: downloads.filter(d => d.status === 'error') },
    { id: 'completed', title: 'Completed', items: downloads.filter(d => d.status === 'completed') },
  ]
  const visibleGroups = groups.filter(group => group.items.length && (filter === 'all' || filter === group.id))
  const onlineFriends = friends.filter(f => f.status.status !== 'offline')

  const card = (download: Download) => <DownloadCard
    key={download.id}
    download={download}
    onPause={onPause}
    onResume={onResume}
    onCancel={onCancel}
    disabled={loadingDownloads.has(download.id)}
  />

  return (
    <CompanionLayout
      eyebrow={<>Downloads{devMode && <span className="dev-badge"><Code size={11} />DEV</span>}</>}
      title={userName ? `${userName}’s desktop` : 'Desktop activity'}
      subtitle={lastUpdated ? <>Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · refreshes automatically</> : 'Follow downloads and extractions, wherever you are.'}
      actions={<RefreshButton label="Refresh downloads" busy={isRefreshing} onClick={onRefresh} />}
    >
      <div className="split-layout">
        <div>
          {isLoading ? (
            <div className="stack" aria-busy="true" aria-label="Loading downloads">
              {Array.from({ length: 3 }, (_, i) => <div key={i} className="skeleton skeleton-row" />)}
            </div>
          ) : downloads.length === 0 ? (
            <EmptyState icon={Coffee} title="Your desktop is all caught up">Start a download in Ascendara to monitor it here.</EmptyState>
          ) : (
            <>
              <SegmentedTabs label="Filter downloads" value={filter} onChange={setFilter} options={[
                { value: 'all', label: 'All', count: downloads.length },
                ...groups.map(group => ({ value: group.id, label: group.title, count: group.items.length })),
              ]} />
              {visibleGroups.length === 0 && <EmptyState icon={Coffee} title={`Nothing ${filter === 'error' ? 'failed' : filter} right now`}>Downloads in this state will show up here.</EmptyState>}
              {visibleGroups.map(group => (
                <section key={group.id} className="section">
                  <div className="section-head">
                    <h2>
                      {group.id === 'active' && <span className="status-dot online live" />}
                      {group.title}
                      <span className="count-badge">{group.items.length}</span>
                    </h2>
                  </div>
                  <div className="stack">{group.items.map(card)}</div>
                </section>
              ))}
            </>
          )}
        </div>

        <aside>
          <section className="panel">
            <div className="panel-head">
              <h2><Users size={17} />Friends online</h2>
              <Link className="text-link" href="/friends">View all <ChevronRight size={14} /></Link>
            </div>
            {onlineFriends.length ? (
              <div className="friend-mini-list">
                {onlineFriends.slice(0, 6).map(friend => (
                  <div key={friend.uid} className="friend-mini">
                    <FriendAvatar name={friend.displayName} photoURL={friend.photoURL} status={friend.status.status} size={38} />
                    <div className="friend-copy">
                      <strong>{friend.displayName}</strong>
                      <span>{friend.status.customMessage || statusLabel(friend.status.status)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="panel-empty">{friends.length ? 'None of your friends are online right now.' : 'Add friends in Ascendara to see who’s around.'}</p>
            )}
          </section>
        </aside>
      </div>
    </CompanionLayout>
  )
}
