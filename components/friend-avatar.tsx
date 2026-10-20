'use client'

export function initials(name: string) {
  return name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase()
}

export function statusLabel(status = 'offline') {
  return status === 'online' ? 'Online' : status === 'away' ? 'Away' : status === 'busy' ? 'Busy' : 'Offline'
}

export function FriendAvatar({ name, photoURL, status, size }: { name: string; photoURL?: string; status?: string; size?: number }) {
  return <div className="friend-avatar">
    <div className="friend-avatar-img" style={size ? { ['--size' as string]: `${size}px` } : undefined}>
      {photoURL
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={photoURL} alt="" onError={event => { event.currentTarget.style.display = 'none' }} />
        : initials(name || '?')}
    </div>
    {status && <span className={`status-dot ${status}`} aria-label={statusLabel(status)} />}
  </div>
}
