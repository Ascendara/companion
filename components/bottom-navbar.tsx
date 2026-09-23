'use client'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Compass, Library, Download, Users, UserRound, Settings } from 'lucide-react'

const links = [
  { href: '/explore', label: 'Discover', icon: Compass },
  { href: '/library', label: 'Library', icon: Library },
  { href: '/dashboard', label: 'Downloads', icon: Download },
  { href: '/friends', label: 'Friends', icon: Users },
  { href: '/profile', label: 'Profile', icon: UserRound },
]
export function BottomNavbar() {
  const pathname = usePathname()
  return <aside className="companion-nav">
    <Link className="companion-brand" href="/explore"><Image src="/icon.png" width={34} height={34} alt="" /><span>Ascendara</span></Link>
    <div className="nav-caption">COMPANION</div>
    <nav aria-label="Main navigation">{links.map(({ href, label, icon: Icon }) => {
      const active = pathname === href || (href === '/explore' && pathname.startsWith('/games/'))
      return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={active ? 'active' : ''}><Icon size={20} /><span>{label}</span></Link>
    })}</nav>
    <div className="nav-foot"><Link href="/profile#settings" className="nav-settings"><Settings size={18} /><span>Appearance & connection</span></Link></div>
  </aside>
}
