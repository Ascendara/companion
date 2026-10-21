'use client'
import { useEffect, useRef, useState } from 'react'
import { apiClient } from '@/lib/api'
import { companionFetch, CompanionError, type Catalog } from '@/lib/companion'

const cache = new Map<string, { data: unknown; expires: number }>()
const pending = new Map<string, Promise<unknown>>()

function load(path: string, session: string, refresh: boolean) {
  const key = JSON.stringify([session, path])
  const entry = cache.get(key)
  if (!refresh && entry && entry.expires > Date.now()) return Promise.resolve(entry.data)
  const existing = pending.get(key)
  if (existing) return existing
  // Share the request across navigation and Strict Mode mounts. A departing
  // consumer must not abort a request that the next view can reuse.
  const task = companionFetch<unknown>(path, AbortSignal.timeout(20_000)).then(data => {
    if (apiClient.getSessionId() === session) {
      cache.set(key, { data, expires: Date.now() + (path.startsWith('games') ? 60_000 : 15_000) })
      if (path.startsWith('games?')) {
        const catalog = data as Catalog
        // Catalog entries contain the same public fields as the detail route.
        for (const game of catalog.games) {
          cache.set(JSON.stringify([session, `games/${encodeURIComponent(game.id)}`]), {
            data: { game, stale: catalog.stale }, expires: Date.now() + 60_000,
          })
        }
      }
      while (cache.size > 100) cache.delete(cache.keys().next().value!)
    }
    return data
  }).finally(() => pending.delete(key))
  pending.set(key, task)
  return task
}

export function useCompanion<T>(path: string) {
  const session = apiClient.getSessionId()
  const key = JSON.stringify([session, path])
  const [result, setResult] = useState<{ key: string; data?: T; error?: string; disconnected?: boolean }>(() => {
    const cached = cache.get(key)
    return cached && cached.expires > Date.now() ? { key, data: cached.data as T } : { key: '' }
  })
  const [attempt, setAttempt] = useState(0)
  const handledAttempt = useRef(0)
  useEffect(() => {
    let active = true
    const refresh = handledAttempt.current !== attempt
    handledAttempt.current = attempt
    load(path, session || '', refresh).then(data => {
      if (active && apiClient.getSessionId() === session) setResult({ key, data: data as T })
    }).catch(error => {
      if (active) setResult({ key, error: error instanceof Error ? error.message : 'Unable to connect.', disconnected: error instanceof CompanionError && error.status === 401 })
    })
    return () => { active = false }
  }, [path, session, key, attempt])
  const data = result.key === key ? result.data : undefined
  return { data, error: result.key === key ? result.error : undefined,
    disconnected: result.key === key ? result.disconnected : undefined, loading: result.key !== key && data === undefined,
    retry: () => { setResult({ key: '' }); setAttempt(n => n + 1) } }
}
