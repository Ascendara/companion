'use client'

import * as React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Pause, Play, X, Download, AlertCircle, Clock, Trash2, Loader2 } from 'lucide-react'
import { Download as DownloadType } from '@/lib/api'
import { formatBytes, formatSpeed, formatETA, getStatusColor, getStatusText } from '@/lib/format'
import { useTheme } from '@/contexts/theme-context'
import { cn } from '@/lib/utils'
import {
  AlertDialog,
  AlertDialogAction,
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

export function DownloadCard({ download, onPause, onResume, onCancel, disabled = false }: DownloadCardProps) {
  const { themeColors } = useTheme()
  const [showKillDialog, setShowKillDialog] = React.useState(false)
  const [loadingAction, setLoadingAction] = React.useState<'pause' | 'resume' | 'kill' | null>(null)

  React.useEffect(() => {
    if (download.status === 'paused' || download.status === 'stopped') {
      console.log(`[DownloadCard] Rendering paused download ${download.id}:`, {
        progress: download.progress,
        downloaded: download.downloaded,
        size: download.size
      })
    }
  }, [download])

  React.useEffect(() => {
    setLoadingAction(null)
  }, [download.status])

  const progress = Number.isFinite(download.progress) ? Math.min(100, Math.max(0, download.progress)) : 0

  const getStatusIcon = () => {
    switch (download.status) {
      case 'updating':
      case 'downloading':
        return <Download className="h-4 w-4" />
      case 'verifying':
      case 'extracting':
        return <Loader2 className="h-4 w-4 animate-spin" />
      case 'paused':
      case 'stopped':
        return <Pause className="h-4 w-4" />
      case 'completed':
        return <Download className="h-4 w-4" />
      case 'actionRequired':
      case 'error':
        return <AlertCircle className="h-4 w-4" />
      case 'queued':
        return <Clock className="h-4 w-4" />
      default:
        return null
    }
  }

  return (
    <Card className={cn("overflow-hidden transition-all border", themeColors.card, themeColors.cardHover, disabled && "opacity-60")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className={cn("text-lg font-semibold line-clamp-2", themeColors.text)}>
            {download.name}
          </CardTitle>
          <div className={cn('flex items-center gap-1 text-sm font-medium whitespace-nowrap', getStatusColor(download.status))}>
            {getStatusIcon()}
            <span>{getStatusText(download.status)}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className={cn("opacity-70", themeColors.text)}>Progress</span>
            <span className={cn("font-semibold", themeColors.text)}>{progress.toFixed(1)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className={cn("flex items-center justify-between text-xs opacity-70", themeColors.text)}>
            <span>{download.downloaded} / {download.size}</span>
          </div>
        </div>

        {download.status === 'downloading' && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className={cn("opacity-70", themeColors.text)}>Speed</div>
              <div className={cn("font-semibold", themeColors.text)}>{download.speed}</div>
            </div>
            <div>
              <div className={cn("opacity-70", themeColors.text)}>ETA</div>
              <div className={cn("font-semibold", themeColors.text)}>{download.eta}</div>
            </div>
          </div>
        )}

        {download.status === 'actionRequired' && (
          <div>Continue installation or recovery in the desktop app.</div>
        )}
        {download.status === 'extracting' && (
          <div>{download.speed} · {download.eta !== '-' ? download.eta : 'Extracting files'}</div>
        )}

        {download.status === 'error' && download.error && (
          <div className="rounded-md bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-800 dark:text-red-200">
            {download.error}
          </div>
        )}

        <div className="flex gap-2">
          {download.status === 'downloading' && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                setLoadingAction('pause')
                onPause(download.id)
              }}
              disabled={disabled || loadingAction !== null}
            >
              {loadingAction === 'pause' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Pause className="h-4 w-4 mr-2" />
              )}
              Pause
            </Button>
          )}
          {(download.status === 'paused' || download.status === 'stopped') && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => {
                setLoadingAction('resume')
                onResume(download.id)
              }}
              disabled={disabled || loadingAction !== null}
            >
              {loadingAction === 'resume' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Resume
            </Button>
          )}
          {(download.status === 'downloading' || download.status === 'paused' || download.status === 'stopped' || download.status === 'queued') && (
            <Button
              variant="destructive"
              size="sm"
              className="flex-1"
              onClick={() => setShowKillDialog(true)}
              disabled={disabled || loadingAction !== null}
            >
              {loadingAction === 'kill' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Kill
            </Button>
          )}
        </div>
      </CardContent>

      <AlertDialog open={showKillDialog} onOpenChange={setShowKillDialog}>
        <AlertDialogContent className="max-w-[90vw] sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Kill Download?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to kill <strong>{download.name}</strong>?
              <br />
              <br />
              This will permanently stop and delete the download. This action cannot be undone.
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
              Kill Download
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
