'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api'
import { companionFetch, CompanionError } from '@/lib/companion'

type Artwork = Record<string, string | null>
type Entry = { url: string | null; expires: number }

// Covers are public and identical for every account, so they are cached by
// name and persisted across reloads. Revisiting a page then needs no requests.
const STORAGE_KEY = 'ascendara-artwork-cache'
const HIT_TTL = 7 * 86_400_000
const MISS_TTL = 21_600_000
// The monitor allows 30 artwork requests a minute and resolves misses a few
// at a time, so six covers per request keeps a full page well under the limit.
const BATCH_SIZE = 6
const cache = new Map<string, Entry>()
const pending = new Map<string, { task: Promise<void>; consumers: Map<() => boolean, (result: Artwork) => void> }>()
let queue: Promise<unknown> = Promise.resolve()
let hydrated = false
let persistTimer: ReturnType<typeof setTimeout> | undefined

function hydrate() {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as Record<string, Entry>
    const now = Date.now()
    for (const [name, entry] of Object.entries(stored)) if (entry.expires > now) cache.set(name, entry)
  } catch {}
}

function persist() {
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    while (cache.size > 1000) cache.delete(cache.keys().next().value!)
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(cache))) } catch {}
  }, 500)
}

function cachedArtwork(names: string[]): Artwork {
  hydrate()
  const now = Date.now()
  return Object.fromEntries(names.flatMap(name => {
    const entry = cache.get(name)
    return entry && entry.expires > now ? [[name, entry.url]] : []
  }))
}

function fetchBatch(names: string[], session: string, active: () => boolean, publish: (result: Artwork) => void) {
  const key = JSON.stringify([session, [...names].sort()])
  const existing = pending.get(key)
  if (existing) {
    existing.consumers.set(active, publish)
    return existing.task
  }
  const consumers = new Map([[active, publish]])
  const wanted = () => [...consumers.keys()].some(consumer => consumer()) && apiClient.getSessionId() === session
  const emit = (result: Artwork) => {
    for (const [consumer, notify] of consumers) if (consumer() && wanted()) notify(result)
  }
  const task = (async () => {
    let missing = names.filter(name => !Object.hasOwn(cachedArtwork(names), name))
    for (let attempt = 0; missing.length && attempt < 2 && wanted(); attempt++) {
      // The monitor accepts one batch at a time. Only the request holds the
      // queue; backoff must let other covers and newly visited pages proceed.
      const request = queue.catch(() => undefined).then(async () => {
        if (!wanted()) return
        missing = missing.filter(name => !Object.hasOwn(cachedArtwork(missing), name))
        if (!missing.length) return
        const params = new URLSearchParams()
        missing.forEach(name => params.append('q', name))
        const response = await companionFetch<{ artwork: Artwork; pending?: string[] }>(`artwork?${params}`, AbortSignal.timeout(20_000))
        for (const name of missing) {
          // Pending and omitted entries are unresolved, not negative results.
          if (response.pending?.includes(name) || !Object.hasOwn(response.artwork, name)) continue
          const url = response.artwork[name] || null
          cache.set(name, { url, expires: Date.now() + (url ? HIT_TTL : MISS_TTL) })
        }
        persist()
      })
      queue = request.catch(() => undefined)
      try {
        await request
      } catch (error) {
        if (error instanceof CompanionError && error.status !== 429 && error.status < 500) break
      }
      emit(cachedArtwork(names))
      missing = missing.filter(name => !Object.hasOwn(cachedArtwork(names), name))
      if (missing.length && attempt < 1) {
        const until = Date.now() + 1000 * 2 ** attempt
        while (wanted() && Date.now() < until) await new Promise(resolve => setTimeout(resolve, 200))
      }
    }
    // Stop the spinner after bounded retries, without caching transient failures.
    emit(Object.fromEntries(names.map(name => [name, cachedArtwork(names)[name] ?? null])))
  })().finally(() => pending.delete(key))
  pending.set(key, { task, consumers })
  return task
}

export function useGameArtwork(names: string[]) {
  const namesKey = JSON.stringify([...new Set(names)])
  const session = apiClient.getSessionId()
  const [state, setState] = useState<{ session: string | null; artwork: Artwork }>({ session: null, artwork: {} })
  useEffect(() => {
    let active = true
    if (!session) return
    const currentNames: string[] = JSON.parse(namesKey)
    const publish = (result: Artwork) => {
      if (active && apiClient.getSessionId() === session) setState(previous => ({
        session, artwork: { ...(previous.session === session ? previous.artwork : {}), ...result },
      }))
    }
    const load = () => {
      // Only uncached names are requested, so cached covers never wait in the queue.
      const known = cachedArtwork(currentNames)
      const missing = currentNames.filter(name => !Object.hasOwn(known, name))
      for (let index = 0; index < missing.length; index += BATCH_SIZE) {
        void fetchBatch(missing.slice(index, index + BATCH_SIZE), session, () => active, publish)
      }
    }
    load()
    window.addEventListener('online', load)
    // Retry transient proxy failures while the view stays open. Cached covers
    // and confirmed misses are skipped, so this does not poll every tile.
    const retryInterval = window.setInterval(load, 60_000)
    return () => { active = false; window.removeEventListener('online', load); window.clearInterval(retryInterval) }
  }, [namesKey, session])
  return { ...(state.session === session ? state.artwork : {}), ...(session ? cachedArtwork(names) : {}) }
}
