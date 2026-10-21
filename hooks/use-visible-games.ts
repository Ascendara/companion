'use client'

import { useEffect, useRef, useState } from 'react'

// Resolve covers near the viewport, rather than making visible games wait
// behind offscreen requests when navigating a large catalog page.
export function useVisibleGames(names: string[]) {
  const gridRef = useRef<HTMLDivElement>(null)
  const key = JSON.stringify(names)
  const [visible, setVisible] = useState<{ key: string; names: string[] }>()
  useEffect(() => {
    const grid = gridRef.current
    if (!grid || !('IntersectionObserver' in window)) return
    const nearby = new Set<Element>()
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) nearby.add(entry.target)
        else nearby.delete(entry.target)
      }
      const ordered: string[] = JSON.parse(key)
      const visibleNames = new Set([...nearby].map(tile => (tile as HTMLElement).dataset.gameName))
      setVisible({ key, names: ordered.filter(name => visibleNames.has(name)) })
    }, { rootMargin: '300px 0px' })
    grid.querySelectorAll('[data-game-name]').forEach(tile => observer.observe(tile))
    return () => observer.disconnect()
  }, [key])
  const supported = typeof window !== 'undefined' && 'IntersectionObserver' in window
  return { gridRef, names: !supported ? names : visible?.key === key ? visible.names : names.slice(0, 4) }
}
