'use client'

import Link from 'next/link'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="center-screen">
      <div className="state-card">
        <div className="big-code">404</div>
        <h1>Page not found</h1>
        <p>The page you’re looking for doesn’t exist or has moved.</p>
        <div className="state-actions">
          <Link className="btn btn-primary btn-block" href="/">
            <Home size={16} />
            Go home
          </Link>
          <button type="button" className="btn btn-secondary btn-block" onClick={() => window.history.back()}>
            <ArrowLeft size={16} />
            Go back
          </button>
        </div>
      </div>
    </div>
  )
}
