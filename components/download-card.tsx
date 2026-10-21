'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import { Pause, Play, Download, AlertCircle, Clock, Trash2, Loader2, CheckCircle2, PackageOpen, Gauge, Timer } from 'lucide-react'
import { Download as DownloadType } from '@/lib/api'
import { getStatusText } from '@/lib/format'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface DownloadCardProps {
  download: DownloadType
  onPause: (id: string) => void
  onResume: (id: string) => void
  onCancel: (id: string) => void
  disabled?: boolean
}

const STATUS_ICONS: Record<DownloadType['status'], React.ElementType> = {
  downloading: Download,
  extracting: PackageOpen,
  verifying: Loader2,
  updating: Download,
  actionRequired: AlertCircle,
  paused: Pause,
  stopped: Pause,
  completed: CheckCircle2,
  error: AlertCircle,
  queued: Clock,
}

export function DownloadCard({ download, onPause, onResume, onCancel, disabled = false }: DownloadCardProps) {
  const [showKillDialog, setShowKillDialog] = React.useState(false)
  const [loadingAction, setLoadingAction] = React.useState<'pause' | 'resume' | 'kill' | null>(null)

  React.useEffect(() => {
    setLoadingAction(null)
  }, [download.status])

  const StatusIcon = STATUS_ICONS[download.status] || Download
  const paused = download.status === 'paused' || download.status === 'stopped'
  const canKill = download.status === 'downloading' || paused || download.status === 'queued'
  const busy = disabled || loadingAction !== null
  const progress = Number.isFinite(download.progress) ? Math.min(100, Math.max(0, download.progress)) : 0

  return (
    <article className={`dl-card status-${download.status}${disabled ? ' busy' : ''}`}>
      <div className="dl-head">
        <div className="dl-icon"><StatusIcon size={20} className={download.status === 'extracting' ? 'spin' : undefined} style={download.status === 'extracting' ? { animationDuration: '2.4s' } : undefined} /></div>
        <div className="dl-title">
          <h3>{download.name}</h3>
          <p>{download.downloaded} / {download.size}</p>
        </div>
        <span className="status-pill">{getStatusText(download.status)}</span>
      </div>

      {download.status !== 'completed' && (
        <div className="dl-progress">
          <div className="progress-track" role="progressbar" aria-label={`${download.name} progress`} aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${progress}%` }} /></div>
          <strong>{progress.toFixed(1)}%</strong>
        </div>
      )}

      {download.status === 'error' && download.error && (
        <div className="callout danger"><AlertCircle size={16} /><div>{download.error}</div></div>
      )}

      {download.status === 'actionRequired' && (
        <div className="callout"><AlertCircle size={16} /><div>Continue installation or recovery in the desktop app.</div></div>
      )}
      {download.status === 'extracting' && (
        <div className="dl-meta"><span>{download.speed}</span><span>{download.eta !== '-' ? download.eta : 'Extracting files'}</span></div>
      )}

      {canKill && (
        <div className="dl-foot">
          {download.status === 'downloading' ? (
            <div className="dl-meta">
              <span><Gauge size={14} /><strong>{download.speed}</strong></span>
              <span><Timer size={14} />ETA <strong>{download.eta}</strong></span>
            </div>
          ) : <div className="dl-meta">{paused ? <span>Paused at {download.progress.toFixed(1)}%</span> : download.status === 'queued' ? <span>Waiting in queue</span> : null}</div>}
          <div className="dl-actions">
            {download.status === 'downloading' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setLoadingAction('pause')
                  onPause(download.id)
                }}
                disabled={busy}
              >
                {loadingAction === 'pause' ? <Loader2 size={15} className="spin" /> : <Pause size={15} />}
                Pause
              </button>
            )}
            {paused && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => {
                  setLoadingAction('resume')
                  onResume(download.id)
                }}
                disabled={busy}
              >
                {loadingAction === 'resume' ? <Loader2 size={15} className="spin" /> : <Play size={15} />}
                Resume
              </button>
            )}
            {canKill && (
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => setShowKillDialog(true)}
                disabled={busy}
              >
                {loadingAction === 'kill' ? <Loader2 size={15} className="spin" /> : <Trash2 size={15} />}
                Kill
              </button>
            )}
          </div>
        </div>
      )}

      <AlertDialog open={showKillDialog} onOpenChange={setShowKillDialog}>
        <AlertDialogContent className="max-w-[92vw] sm:max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Kill download?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently stops and deletes <strong>{download.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowKillDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowKillDialog(false)
                setLoadingAction('kill')
                onCancel(download.id)
              }}
              className="w-full sm:w-auto"
            >
              Kill download
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  )
}
