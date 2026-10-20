'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="center-screen">
      <div className="state-card">
        <div className="empty-icon danger"><AlertCircle size={26} /></div>
        <h1>Something went wrong</h1>
        <p>An unexpected error occurred. Try again, and if it keeps happening, reconnect from Ascendara.</p>
        {error.message && <div className="error-detail">{error.message}</div>}
        <div className="state-actions">
          <button type="button" className="btn btn-primary btn-block" onClick={reset}>
            <RefreshCw size={16} />
            Try again
          </button>
        </div>
      </div>
    </div>
  )
}
