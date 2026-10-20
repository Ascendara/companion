'use client'

import * as React from 'react'
import { X, Smartphone, Share, Plus, MoreVertical } from 'lucide-react'

const STORAGE_KEY = 'ascendara-install-prompt-dismissed'

export function InstallPrompt() {
  const [isVisible, setIsVisible] = React.useState(false)
  const [isIOS, setIsIOS] = React.useState(false)
  const [isAndroid, setIsAndroid] = React.useState(false)

  React.useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed === 'true') {
      return
    }

    const userAgent = window.navigator.userAgent.toLowerCase()
    const ios = /iphone|ipad|ipod/.test(userAgent)
    const android = /android/.test(userAgent)

    setIsIOS(ios)
    setIsAndroid(android)

    if (ios || android) {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      const isInWebAppiOS = (window.navigator as Navigator & { standalone?: boolean }).standalone === true

      if (!isStandalone && !isInWebAppiOS) {
        setTimeout(() => setIsVisible(true), 2000)
      }
    }
  }, [])

  const handleDismiss = () => {
    setIsVisible(false)
    localStorage.setItem(STORAGE_KEY, 'true')
  }

  if (!isVisible) return null

  return (
    <div className="modal-layer">
      <div className="modal-scrim" onClick={handleDismiss} />
      <div className="modal-card" role="dialog" aria-modal="true" aria-label="Add to Home Screen">
        <header>
          <div className="stat-icon"><Smartphone size={19} /></div>
          <div>
            <h2>Add to Home Screen</h2>
            <p>Open Ascendara like an app, in one tap.</p>
          </div>
          <button type="button" className="icon-btn ghost" aria-label="Dismiss" onClick={handleDismiss}><X size={18} /></button>
        </header>

        {isIOS && (
          <ol className="install-steps">
            <li><span>Tap the <Share size={16} /> <strong>Share</strong> button at the bottom of Safari</span></li>
            <li><span>Scroll down and tap <Plus size={15} /> <strong>Add to Home Screen</strong></span></li>
            <li><span>Tap <strong>Add</strong> in the top right corner</span></li>
          </ol>
        )}

        {isAndroid && (
          <ol className="install-steps">
            <li><span>Tap the <MoreVertical size={16} /> menu button (three dots)</span></li>
            <li><span>Select <strong>Add to Home screen</strong> or <strong>Install app</strong></span></li>
            <li><span>Tap <strong>Add</strong> or <strong>Install</strong></span></li>
          </ol>
        )}

        <button type="button" className="btn btn-secondary btn-block" style={{ marginTop: 22 }} onClick={handleDismiss}>
          Got it, thanks!
        </button>
      </div>
    </div>
  )
}
