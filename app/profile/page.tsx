'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, MapPin, Shield, Trophy, Palette, RefreshCw } from 'lucide-react'
import { CompanionLayout, LoadState } from '@/components/companion-layout'
import { ThemeSelectorModal } from '@/components/theme-selector-modal'
import { useCompanion } from '@/hooks/use-companion'
import { Account, playtime } from '@/lib/companion'
import { apiClient } from '@/lib/api'

export default function Profile() {
  const state = useCompanion<Account>('account')
  const router = useRouter()
  const [themeOpen, setThemeOpen] = useState(false)
  const [disconnecting, setDisconnecting] = useState(false)
  const profile = state.data?.profile
  return <CompanionLayout title="Make yourself at home." eyebrow="PROFILE" action={<button className="quiet-link" onClick={state.retry}><RefreshCw size={16} />Refresh</button>}>
    <LoadState {...state} />{profile && <><section className="profile-banner"><div className="profile-avatar">{(profile.displayName || 'A').slice(0, 1).toUpperCase()}</div><div><p className="eyebrow">YOUR ASCENDARA PROFILE</p><h2>{profile.displayName || 'Ascendara player'}</h2><p>{profile.bio || 'Every great game is another story.'}</p><div className="tag-list">{profile.country && <span className="pill"><MapPin size={14} />{profile.country}</span>}<span className="pill"><Shield size={14} />{profile.private ? 'Private profile' : 'Public profile'}</span></div></div></section>
    <div className="stat-grid"><div><Trophy /><span>Profile level</span><strong>{profile.profileStats?.level ?? '—'}</strong></div><div><span>Total playtime</span><strong>{playtime(state.data?.library.totalPlaytime)}</strong></div><div><span>Games in your collection</span><strong>{state.data?.library.games?.length || 0}</strong></div></div></>}
    <section id="settings" className="settings-panel"><div><div><h2>Appearance</h2><p>Choose a theme for every page of your companion.</p></div><button className="companion-button secondary" onClick={() => setThemeOpen(true)}><Palette size={16} />Change theme</button></div><div><div><h2>Desktop connection</h2><p>Disconnect this browser from your Ascendara account.</p></div><button className="companion-button secondary" disabled={disconnecting} onClick={async () => { setDisconnecting(true); localStorage.removeItem('mock_mode'); await apiClient.disconnect(); router.replace('/?reconnect=1') }}><LogOut size={16} />{disconnecting ? 'Disconnecting…' : 'Disconnect'}</button></div></section>
    <ThemeSelectorModal isOpen={themeOpen} onClose={() => setThemeOpen(false)} />
  </CompanionLayout>
}
