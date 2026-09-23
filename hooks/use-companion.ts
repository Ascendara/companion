'use client'
import { useEffect, useState } from 'react'
import { companionFetch, CompanionError } from '@/lib/companion'

export function useCompanion<T>(path: string) {
  const [result, setResult] = useState<{ path: string; data?: T; error?: string; disconnected?: boolean }>({ path: '' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    companionFetch<T>(path, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult({ path, data })
    }).catch(error => {
      if (!controller.signal.aborted) setResult({ path, error: error instanceof Error ? error.message : 'Unable to connect.', disconnected: error instanceof CompanionError && error.status === 401 })
    })
    return () => controller.abort()
  }, [path, attempt])
  return { data: result.path === path ? result.data : undefined, error: result.path === path ? result.error : undefined,
    disconnected: result.disconnected, loading: result.path !== path,
    retry: () => { setResult({ path: '' }); setAttempt(n => n + 1) } }
}
