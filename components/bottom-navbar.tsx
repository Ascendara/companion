'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Library, Download, Users, UserRound, Palette, Cloud } from 'lucide-react'

const links = [
  { href: '/explore', label: 'Discover', icon: Compass },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/dashboard', label: 'Downloads', icon: Download },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/profile', label: 'Profile', icon: UserRound },
]

function isActive(pathname: string, href: string) {
  if (pathname === href) return true
  if (href === '/explore') return pathname.startsWith('/games/')
  if (href === '/library') return pathname === '/cloud-library'
  return false
}

export function BottomNavbar() {
  const pathname = usePathname()
  return <aside className="app-nav">
    <Link className="app-brand" href="/explore"><Image src="/icon.png" width={36} height={36} alt="" /><div><strong>Ascendara</strong><small>Companion</small></div></Link>
    <nav className="app-nav-links" aria-label="Main navigation">{links.map(({ href, label, icon: Icon }) => {
      const active = isActive(pathname, href)
      return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={active ? 'active' : ''}><span className="nav-icon"><Icon size={20} strokeWidth={active ? 2.3 : 2} /></span><span>{label}</span></Link>
    })}</nav>
    <div className="app-nav-foot">
      <Link href="/cloud-library"><Cloud size={17} />Cloud collection</Link>
      <Link href="/profile#settings"><Palette size={17} />Appearance & connection</Link>
    </div>
  </aside>
}
