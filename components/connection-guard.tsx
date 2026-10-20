'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api'
import { WifiOff } from 'lucide-react'

export function ConnectionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isChecking, setIsChecking] = React.useState(true)
  const [isDisconnected, setIsDisconnected] = React.useState(false)

  React.useEffect(() => {
    const checkConnection = () => {
      const sessionError = sessionStorage.getItem('session_error')
      const sessionId = apiClient.getSessionId()
      
      if (sessionError === 'true' || !sessionId) {
        setIsDisconnected(true)
        setIsChecking(false)
        return false
      }
      
      setIsDisconnected(false)
      setIsChecking(false)
      return true
    }

    checkConnection()

    const handleSessionError = () => {
      console.log('[ConnectionGuard] Session error detected')
      setIsDisconnected(true)
    }

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ascendara_session_id' || e.key === null) {
        checkConnection()
      }
    }

    window.addEventListener('session-error', handleSessionError)
    window.addEventListener('storage', handleStorageChange)

    const interval = setInterval(checkConnection, 1000)

    return () => {
      window.removeEventListener('session-error', handleSessionError)
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  if (isChecking) {
    return (
      <div className="center-screen">
        <div className="loader-ring" aria-label="Checking connection" />
      </div>
    )
  }

  if (isDisconnected) {
    return (
      <div className="center-screen">
        <div className="state-card">
          <div className="empty-icon danger"><WifiOff size={26} /></div>
          <h1>Connection lost</h1>
          <p>Your session has expired or been disconnected. Reconnect with a new code from Ascendara to continue.</p>
          <ul>
            <li>Session expired</li>
            <li>Disconnected from another device</li>
            <li>Connection code revoked</li>
          </ul>
          <div className="state-actions">
            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => {
                apiClient.clearSession()
                sessionStorage.removeItem('session_error')
                router.push('/')
              }}
            >
              Reconnect
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
