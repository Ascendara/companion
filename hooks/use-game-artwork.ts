'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { companionFetch, CompanionError } from '@/lib/companion'

type Artwork = Record<string, string | null>
const cache = new Map<string, { url: string | null; expires: number }>()
const pending = new Map<string, { task: Promise<Artwork>; consumers: Set<() => boolean> }>()
let queue: Promise<unknown> = Promise.resolve()

function fetchBatch(names: string[], session: string, active: () => boolean) {
  const key = JSON.stringify([session, names])
  const existing = pending.get(key)
  if (existing) {
    existing.consumers.add(active)
    return existing.task
  }
  const consumers = new Set([active])
  const wanted = () => [...consumers].some(consumer => consumer()) && apiClient.getSessionId() === session
  const task = queue.catch(() => undefined).then(async () => {
    if (!wanted()) return {}
    let missing = names.filter(name => (cache.get(JSON.stringify([session, name]))?.expires || 0) <= Date.now())
    for (let attempt = 0; missing.length && attempt < 4 && wanted(); attempt++) {
      const params = new URLSearchParams()
      missing.forEach(name => params.append('q', name))
      try {
        const response = await companionFetch<{ artwork: Artwork; pending?: string[] }>(`artwork?${params}`, AbortSignal.timeout(20_000))
        for (const name of missing) {
          if (!Object.hasOwn(response.artwork, name)) continue
          const url = response.artwork[name] || null
          cache.set(JSON.stringify([session, name]), { url, expires: Date.now() + (url ? 86_400_000 : 60_000) })
        }
        missing = missing.filter(name => response.pending?.includes(name))
      } catch (error) {
        if (!(error instanceof CompanionError) || ![429, 503].includes(error.status)) throw error
        if (attempt === 3) throw error
      }
      if (missing.length && attempt < 3) {
        const until = Date.now() + 3000 * (attempt + 1)
        while (wanted() && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    while (cache.size > 1000) cache.delete(cache.keys().next().value!)
    return Object.fromEntries(names.map(name => [name, cache.get(JSON.stringify([session, name]))?.url || null]))
  }).finally(() => pending.delete(key))
  pending.set(key, { task, consumers })
  queue = task
  return task
}

// Only resolve the current page. Share requests across Strict Mode mounts and
// detail navigation; don't block the index while SteamGrid searches for covers.
export function useGameArtwork(names: string[]) {
  const namesKey = JSON.stringify([...new Set(names)])
  const [artwork, setArtwork] = useState<Artwork>({})
  useEffect(() => {
    let active = true
    const session = apiClient.getSessionId()
    if (!session) return
    const currentNames: string[] = JSON.parse(namesKey)
    async function load() {
      for (let index = 0; active && index < currentNames.length; index += 2) {
        try {
          const result = await fetchBatch(currentNames.slice(index, index + 2), session!, () => active)
          if (active) setArtwork(previous => ({ ...previous, ...result }))
        } catch {
          // Keep placeholders when artwork is temporarily unavailable.
          if (active) setArtwork(previous => ({ ...Object.fromEntries(currentNames.slice(index).map(name => [name, null])), ...previous }))
          break
        }
      }
    }
    void load()
    return () => { active = false }
  }, [namesKey])
  return artwork
}
