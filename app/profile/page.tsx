'use client'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Clock3, Cloud, Gamepad2, LogOut, MapPin, MonitorSmartphone, Shield, Trophy, Info } from 'lucide-react'
import { CompanionLayout, LoadState, RefreshButton, Stat } from '@/components/companion-layout'
import { FriendAvatar } from '@/components/friend-avatar'
import { ThemeSwatches } from '@/components/theme-selector'
import { Button } from '@/components/ui/button'
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useCompanion } from '@/hooks/use-companion'
import { Account, playtime } from '@/lib/companion'
import { apiClient } from '@/lib/api'
import { VERSION } from '@/lib/version'

export default function Profile() {
  const state = useCompanion<Account>('account')
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const profile = state.data?.profile
  const level = profile?.profileStats?.level

  async function disconnect() {
    setDisconnecting(true)
    localStorage.removeItem('mock_mode')
    await apiClient.disconnect()
    router.replace('/?reconnect=1')
  }

  return <CompanionLayout title="Profile" eyebrow="Account" actions={<RefreshButton busy={state.loading} onClick={state.retry} />}>
    <LoadState {...state} variant="detail" />
    {profile && <>
      <section className="profile-hero">
        <FriendAvatar name={profile.displayName || 'A'} photoURL={profile.photoURL} />
        <div>
          <h2>{profile.displayName || 'Ascendara player'}</h2>
          <p>{profile.bio || 'Every great game is another story.'}</p>
          <div className="chip-row">
            {level !== undefined && <span className="chip accent"><Trophy size={13} />Level {level}</span>}
            {profile.country && <span className="chip"><MapPin size={13} />{profile.country}</span>}
            <span className="chip"><Shield size={13} />{profile.private ? 'Private profile' : 'Public profile'}</span>
          </div>
        </div>
      </section>
      <div className="stat-strip">
        <Stat icon={Trophy} label="Profile level">{level ?? '—'}</Stat>
        <Stat icon={Clock3} label="Total playtime">{playtime(state.data?.library.totalPlaytime)}</Stat>
        <Stat icon={Gamepad2} label="Games">{state.data?.library.games?.length || 0}</Stat>
      </div>
      <Link className="promo-card" style={{ marginTop: 0 }} href="/cloud-library"><div className="stat-icon"><Cloud size={19} /></div><div><strong>Cloud collection</strong><span>Your synced games, playtime and achievements.</span></div><ChevronRight size={18} /></Link>
    </>}

    <div id="settings">
      <section className="settings-group">
        <h2>Appearance</h2>
        <div className="panel"><ThemeSwatches /></div>
      </section>

      <section className="settings-group">
        <h2>Connection</h2>
        <div className="panel settings-list">
          <div className="settings-row">
            <div className="stat-icon"><MonitorSmartphone size={19} /></div>
            <div><strong>Desktop session</strong><span>This browser is linked to your Ascendara desktop.</span></div>
            <span className="status-chip"><span className={`status-dot${state.data ? ' online' : state.disconnected ? ' busy' : ''}`} />{state.data ? 'Connected' : state.disconnected ? 'Not connected' : 'Checking…'}</span>
          </div>
          <div className="settings-row">
            <div className="stat-icon"><LogOut size={19} /></div>
            <div><strong>Disconnect</strong><span>Unlink this browser. You’ll need a new code to reconnect.</span></div>
            <button className="btn btn-danger btn-sm" disabled={disconnecting} onClick={() => setConfirming(true)}><LogOut size={15} />{disconnecting ? 'Disconnecting…' : 'Disconnect'}</button>
          </div>
        </div>
      </section>

      <section className="settings-group">
        <h2>About</h2>
        <div className="panel settings-list">
          <div className="settings-row">
            <div className="stat-icon"><Info size={19} /></div>
            <div><strong>Ascendara Companion</strong><span>Monitor v{VERSION.monitor} · API v{VERSION.api}</span></div>
          </div>
        </div>
      </section>
    </div>

    <AlertDialog open={confirming} onOpenChange={setConfirming}>
      <AlertDialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle>Disconnect this browser?</AlertDialogTitle>
          <AlertDialogDescription>You’ll be signed out of the companion here. Your desktop and library stay as they are.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" className="w-full sm:w-auto" onClick={() => setConfirming(false)}>Cancel</Button>
          <Button variant="destructive" className="w-full sm:w-auto" onClick={() => { setConfirming(false); void disconnect() }}>Disconnect</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </CompanionLayout>
}
