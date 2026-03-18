'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { DownloadCard } from '@/components/download-card'
import { DownloadSkeleton } from '@/components/download-skeleton'
import { Button } from '@/components/ui/button'
import { ThemeSelectorModal } from '@/components/theme-selector-modal'
import { ThemeButton } from '@/components/theme-button'
import { InstallPrompt } from '@/components/install-prompt'
import { BottomNavbar } from '@/components/bottom-navbar'
import { ConnectionGuard } from '@/components/connection-guard'
import { apiClient, Download } from '@/lib/api'
import { connectionState } from '@/lib/connection-state'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from '@/contexts/theme-context'
import { RefreshCw, LogOut, Download as DownloadIcon, Inbox, AlertTriangle, Users, Circle, Coffee } from 'lucide-react'
import { config } from '@/lib/config'
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
import { isDevMode } from '@/lib/dev-mode'
import { MockDashboard } from '@/components/mock-dashboard'

export default function Dashboard() {
  const router = useRouter()
  const [isMockMode, setIsMockMode] = React.useState(false)
  const [isChecking, setIsChecking] = React.useState(true)
  
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const mockMode = localStorage.getItem('mock_mode') === 'true'
      const inMockMode = isDevMode() && mockMode
      setIsMockMode(inMockMode)
      
      if (!inMockMode) {
        const sessionId = apiClient.getSessionId()
        if (!sessionId) {
          console.log('[Dashboard] No session found, redirecting to connection page')
          router.push('/')
          return
        }
      }
      
      setIsChecking(false)
    }
  }, [router])
  
  if (isChecking) {
    return null
  }
  
  if (isMockMode) {
    return <MockDashboard />
  }
  
  return (
    <ConnectionGuard>
      <RealDashboard />
    </ConnectionGuard>
  )
}

function RealDashboard() {
  const router = useRouter()
  const { toast } = useToast()
  const { themeColors } = useTheme()
  const [downloads, setDownloads] = React.useState<Download[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)
  const [showThemeSelector, setShowThemeSelector] = React.useState(false)
  const [showSessionExpiredDialog, setShowSessionExpiredDialog] = React.useState(false)
  const [loadingDownloads, setLoadingDownloads] = React.useState<Set<string>>(new Set())
  const [userName, setUserName] = React.useState<string>('')
  const [friends, setFriends] = React.useState<Array<{
    uid: string;
    displayName: string;
    photoURL: string;
    status: { status: string; customMessage: string };
  }>>([])
  const CACHE_KEY = 'ascendara_paused_downloads_cache'
  
  // Initialize cache from localStorage
  const initialCache = React.useMemo(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(CACHE_KEY)
        if (stored) {
          const parsed = JSON.parse(stored)
          console.log('[Dashboard] Loaded cache from localStorage:', parsed)
          return new Map(Object.entries(parsed))
        }
      } catch (error) {
        console.error('[Dashboard] Error loading cache from localStorage:', error)
      }
    }
    return new Map()
  }, [])
  
  const pausedDownloadCache = React.useRef<Map<string, { progress: number; downloaded: string }>>(initialCache)
  
  const previousDownloadsRef = React.useRef<Map<string, Download>>(new Map())
  const pollingIntervalRef = React.useRef<NodeJS.Timeout | null>(null)
  
  // Helper to save cache to localStorage
  const saveCacheToLocalStorage = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        const cacheObj = Object.fromEntries(pausedDownloadCache.current)
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObj))
        console.log('[Dashboard] Saved cache to localStorage:', cacheObj)
      } catch (error) {
        console.error('[Dashboard] Error saving cache to localStorage:', error)
      }
    }
  }, [])

  React.useEffect(() => {
    // Clear any previous session error flag on mount
    sessionStorage.removeItem('session_error')

    let isMounted = true
    console.log('[Dashboard] Effect running, isMounted:', isMounted)
    console.log('[Dashboard] Setting up polling with interval:', config.pollingInterval, 'ms')
    console.log('[Dashboard] This equals', config.pollingInterval / 1000, 'seconds')
    
    const fetchUserName = async () => {
      try {
        const response = await connectionState.fetchWithDedup(
          'userName',
          async () => {
            const res = await apiClient.getUserName()
            if (res.success && res.data) {
              return res.data.displayName
            }
            return ''
          }
        )
        if (response) {
          setUserName(response)
        }
      } catch (error) {
        console.error('[Dashboard] Error fetching username:', error)
      }
    }
    
    const fetchFriends = async () => {
      try {
        const response = await connectionState.fetchWithDedup(
          'friends',
          async () => {
            const res = await apiClient.getFriends()
            if (res.success && res.data) {
              return res.data.friends
            }
            return []
          }
        )
        setFriends(response)
      } catch (error) {
        console.error('[Dashboard] Error fetching friends:', error)
      }
    }
    
    const fetchDownloads = async (showLoading = false) => {
      if (!isMounted) {
        console.log('[Dashboard] Component unmounted, skipping fetch')
        return
      }
      
      const now = new Date();
      console.log(`[Dashboard] fetchDownloads called at ${now.toLocaleTimeString()}.${now.getMilliseconds()}`)
      
      if (showLoading) setIsRefreshing(true)

      try {
        const response = await connectionState.fetchWithDedup(
          'downloads',
          () => apiClient.getDownloads(),
          showLoading
        )

        if (!isMounted) return

        if (response.success && response.data) {
          // Clear session error flag on successful fetch
          sessionStorage.removeItem('session_error')
          
          // Check if there are new downloads and show immediate feedback
          if (response.data.hasNewDownloads && response.data.newDownloadsInfo && response.data.newDownloadsInfo.length > 0) {
            console.log('[Dashboard] New downloads detected:', response.data.newDownloadsInfo)
            
            // Create placeholder downloads for instant feedback
            const placeholderDownloads: Download[] = response.data.newDownloadsInfo.map(downloadInfo => {
              // Check if this download is already in the response
              const existingDownload = response.data!.downloads.find(d => d.id === downloadInfo.id)
              if (existingDownload) {
                return existingDownload
              }
              
              // Create placeholder for downloads not yet in the list with actual name
              return {
                id: downloadInfo.id,
                name: downloadInfo.name,
                status: 'queued' as const,
                progress: 0,
                downloaded: '0 B',
                size: 'Unknown',
                speed: '0 B/s',
                eta: 'Calculating...',
                error: null,
                paused: false,
                stopped: false,
                timestamp: new Date().toISOString()
              }
            })
            
            // Add placeholders immediately
            setDownloads(prev => {
              const existingIds = new Set(prev.map(d => d.id))
              const newPlaceholders = placeholderDownloads.filter(p => !existingIds.has(p.id))
              return [...newPlaceholders, ...prev]
            })
          }
          
          let cacheUpdated = false
          
          const downloadsWithCache = response.data.downloads.map(download => {
            const previousDownload = previousDownloadsRef.current.get(download.id)
            
            // Update previousDownloadsRef for actively downloading items BEFORE processing paused state
            // This ensures we capture the last known good state before any transition
            if ((download.status === 'downloading' || download.status === 'queued' || download.status === 'extracting') && download.progress > 0) {
              previousDownloadsRef.current.set(download.id, download)
              
              // Also continuously update the pause cache for active downloads
              // This ensures we always have the latest progress to restore if paused
              pausedDownloadCache.current.set(download.id, {
                progress: download.progress,
                downloaded: download.downloaded
              })
              cacheUpdated = true
            }
            
            // Detect transition from downloading/queued to paused/stopped
            if ((download.status === 'paused' || download.status === 'stopped')) {
              console.log(`[Dashboard] Processing paused download ${download.id}, current API values:`, { 
                progress: download.progress, 
                downloaded: download.downloaded,
                hasCache: pausedDownloadCache.current.has(download.id)
              })
              
              // Cache on transition: if previous was downloading/queued and had progress
              if (previousDownload && 
                  (previousDownload.status === 'downloading' || previousDownload.status === 'queued') &&
                  previousDownload.progress > 0) {
                pausedDownloadCache.current.set(download.id, {
                  progress: previousDownload.progress,
                  downloaded: previousDownload.downloaded
                })
                saveCacheToLocalStorage()
                console.log(`[Dashboard] ✓ Cached on transition for ${download.id}:`, { 
                  progress: previousDownload.progress, 
                  downloaded: previousDownload.downloaded 
                })
              }
              
              // If API still has progress (shouldn't happen but handle it), cache it
              if (download.progress > 0 && !pausedDownloadCache.current.has(download.id)) {
                pausedDownloadCache.current.set(download.id, {
                  progress: download.progress,
                  downloaded: download.downloaded
                })
                saveCacheToLocalStorage()
                console.log(`[Dashboard] Cached from API for ${download.id}:`, { 
                  progress: download.progress, 
                  downloaded: download.downloaded 
                })
              }
              
              // Apply cached values
              const cached = pausedDownloadCache.current.get(download.id)
              if (cached) {
                console.log(`[Dashboard] ✓ Applying cache for ${download.id}:`, cached)
                return { ...download, progress: cached.progress, downloaded: cached.downloaded }
              } else {
                console.warn(`[Dashboard] ⚠ No cache for paused ${download.id}!`)
              }
            }
            
            // Clear cache when download resumes
            if (download.status === 'downloading' || download.status === 'queued') {
              if (pausedDownloadCache.current.has(download.id)) {
                console.log(`[Dashboard] Clearing cache for resumed ${download.id}`)
                pausedDownloadCache.current.delete(download.id)
                saveCacheToLocalStorage()
              }
            }
            
            return download
          })
          
          // Save cache to localStorage if it was updated
          if (cacheUpdated) {
            saveCacheToLocalStorage()
          }
          
          // Update previousDownloadsRef with DISPLAYED data (with cache applied)
          // This ensures we have the correct values to cache on the next transition
          downloadsWithCache.forEach(download => {
            previousDownloadsRef.current.set(download.id, download)
          })
          
          // Merge with existing downloads to preserve placeholders that haven't appeared in API yet
          setDownloads(prev => {
            const apiDownloadIds = new Set(downloadsWithCache.map(d => d.id))
            const preservedPlaceholders = prev.filter(d => 
              !apiDownloadIds.has(d.id) && d.status === 'queued' && d.eta === 'Calculating...'
            )
            return [...downloadsWithCache, ...preservedPlaceholders]
          })
          setLastUpdated(new Date())
        } else {
          if (response.error?.includes('Unauthorized') || response.error?.includes('session')) {
            // Session was revoked or expired - show alert dialog
            console.warn('[Dashboard] Session expired or revoked:', response.error)
            sessionStorage.setItem('session_error', 'true')
            window.dispatchEvent(new Event('session-error'))
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }
            setShowSessionExpiredDialog(true)
          } else {
            toast({
              title: 'Failed to fetch downloads',
              description: response.error,
              variant: 'destructive',
            })
          }
        }
      } catch (error) {
        if (!isMounted) return
        console.error('[Dashboard] Fetch error:', error)
        toast({
          title: 'Connection Error',
          description: 'Unable to reach Ascendara',
          variant: 'destructive',
        })
      } finally {
        if (isMounted) {
          setIsLoading(false)
          setIsRefreshing(false)
        }
      }
    }
    
    fetchUserName()
    fetchFriends()
    fetchDownloads()

    if (pollingIntervalRef.current) {
      console.log('[Dashboard] Clearing existing interval before creating new one')
      clearInterval(pollingIntervalRef.current)
    }

    pollingIntervalRef.current = setInterval(() => {
      console.log('[Dashboard] Polling interval triggered')
      fetchDownloads(false)
      fetchFriends()
    }, config.pollingInterval)
    
    console.log('[Dashboard] Polling interval created with ID:', pollingIntervalRef.current)

    return () => {
      console.log('[Dashboard] Cleanup function called')
      isMounted = false
      if (pollingIntervalRef.current) {
        console.log('[Dashboard] Clearing interval:', pollingIntervalRef.current)
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [])

  const refreshDownloads = React.useCallback(async () => {
    setIsRefreshing(true)
    try {
      const response = await apiClient.getDownloads()
      if (response.success && response.data) {
        let cacheUpdated = false
        
        const downloadsWithCache = response.data.downloads.map(download => {
          const previousDownload = previousDownloadsRef.current.get(download.id)
          
          // Update previousDownloadsRef for actively downloading items BEFORE processing paused state
          if ((download.status === 'downloading' || download.status === 'queued' || download.status === 'extracting') && download.progress > 0) {
            previousDownloadsRef.current.set(download.id, download)
            
            // Also continuously update the pause cache for active downloads
            pausedDownloadCache.current.set(download.id, {
              progress: download.progress,
              downloaded: download.downloaded
            })
            cacheUpdated = true
          }
          
          if ((download.status === 'paused' || download.status === 'stopped')) {
            console.log(`[Dashboard/Refresh] Processing paused download ${download.id}, current API values:`, { 
              progress: download.progress, 
              downloaded: download.downloaded,
              hasCache: pausedDownloadCache.current.has(download.id)
            })
            
            // Cache on transition: if previous was downloading/queued and had progress
            if (previousDownload && 
                (previousDownload.status === 'downloading' || previousDownload.status === 'queued') &&
                previousDownload.progress > 0) {
              pausedDownloadCache.current.set(download.id, {
                progress: previousDownload.progress,
                downloaded: previousDownload.downloaded
              })
              saveCacheToLocalStorage()
              console.log(`[Dashboard/Refresh] ✓ Cached on transition for ${download.id}:`, { 
                progress: previousDownload.progress, 
                downloaded: previousDownload.downloaded 
              })
            }
            
            // If API still has progress (shouldn't happen but handle it), cache it
            if (download.progress > 0 && !pausedDownloadCache.current.has(download.id)) {
              pausedDownloadCache.current.set(download.id, {
                progress: download.progress,
                downloaded: download.downloaded
              })
              saveCacheToLocalStorage()
              console.log(`[Dashboard/Refresh] Cached from API for ${download.id}:`, { 
                progress: download.progress, 
                downloaded: download.downloaded 
              })
            }
            
            const cached = pausedDownloadCache.current.get(download.id)
            if (cached) {
              console.log(`[Dashboard/Refresh] ✓ Applying cache for ${download.id}:`, cached)
              return { ...download, progress: cached.progress, downloaded: cached.downloaded }
            } else {
              console.warn(`[Dashboard/Refresh] ⚠ No cache for paused ${download.id}!`)
            }
          }
          
          if (download.status === 'downloading' || download.status === 'queued') {
            if (pausedDownloadCache.current.has(download.id)) {
              console.log(`[Dashboard/Refresh] Clearing cache for resumed ${download.id}`)
              pausedDownloadCache.current.delete(download.id)
              saveCacheToLocalStorage()
            }
          }
          
          return download
        })
        
        // Save cache to localStorage if it was updated
        if (cacheUpdated) {
          saveCacheToLocalStorage()
        }
        
        // Update previousDownloadsRef with DISPLAYED data (with cache applied)
        downloadsWithCache.forEach(download => {
          previousDownloadsRef.current.set(download.id, download)
        })
        
        setDownloads(downloadsWithCache)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('[Dashboard] Error refreshing downloads:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  const handlePause = async (id: string) => {
    setLoadingDownloads(prev => new Set(prev).add(id))
    try {
      console.log('[Dashboard] Pausing download:', id)
      
      // Fetch fresh download data from API to get current progress before pausing
      console.log('[Dashboard] Fetching fresh download data before pause...')
      const freshDataResponse = await apiClient.getDownloads()
      
      let downloadToCache = null
      
      if (freshDataResponse.success && freshDataResponse.data) {
        const freshDownload = freshDataResponse.data.downloads.find(d => d.id === id)
        if (freshDownload && freshDownload.progress > 0) {
          downloadToCache = freshDownload
          console.log('[Dashboard] Found fresh download data from API:', {
            progress: freshDownload.progress,
            downloaded: freshDownload.downloaded,
            status: freshDownload.status
          })
        }
      }
      
      // Fallback to previousDownloadsRef or current state if API didn't have progress
      if (!downloadToCache) {
        const previousDownload = previousDownloadsRef.current.get(id)
        const currentDownload = downloads.find(d => d.id === id)
        downloadToCache = (previousDownload && previousDownload.progress > 0) ? previousDownload : currentDownload
        console.log('[Dashboard] Using fallback data source:', {
          source: downloadToCache === previousDownload ? 'previousRef' : 'currentState',
          progress: downloadToCache?.progress,
          downloaded: downloadToCache?.downloaded
        })
      }
      
      // Cache the progress data
      if (downloadToCache && downloadToCache.progress > 0) {
        pausedDownloadCache.current.set(id, {
          progress: downloadToCache.progress,
          downloaded: downloadToCache.downloaded
        })
        saveCacheToLocalStorage()
        console.log(`[Dashboard] ✓ Cached progress before pause for ${id}:`, { 
          progress: downloadToCache.progress, 
          downloaded: downloadToCache.downloaded
        })
      } else {
        console.error(`[Dashboard] ✗ Could not cache - no valid progress data for ${id}`)
      }
      
      const response = await apiClient.pauseDownload(id)
      console.log('[Dashboard] Pause command sent:', response)
      
      if (response.success) {
        toast({
          title: 'Pause Command Sent',
          description: 'Download will pause shortly',
        })
      } else {
        toast({
          title: 'Failed to pause',
          description: response.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('[Dashboard] Error pausing download:', error)
      toast({
        title: 'Failed to pause',
        description: 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoadingDownloads(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleResume = async (id: string) => {
    setLoadingDownloads(prev => new Set(prev).add(id))
    try {
      console.log('[Dashboard] Resuming download:', id)
      const response = await apiClient.resumeDownload(id)
      console.log('[Dashboard] Resume command sent:', response)
      
      if (response.success) {
        if (pausedDownloadCache.current.has(id)) {
          console.log(`[Dashboard] Clearing cached progress for resumed download ${id}`)
          pausedDownloadCache.current.delete(id)
          saveCacheToLocalStorage()
        }
        
        toast({
          title: 'Resume Command Sent',
          description: 'Download will resume shortly',
        })
      } else {
        toast({
          title: 'Failed to resume',
          description: response.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('[Dashboard] Error resuming download:', error)
      toast({
        title: 'Failed to resume',
        description: 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoadingDownloads(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleCancel = async (id: string) => {
    setLoadingDownloads(prev => new Set(prev).add(id))
    try {
      console.log('[Dashboard] Killing download:', id)
      const response = await apiClient.cancelDownload(id)
      console.log('[Dashboard] Kill command sent:', response)
      
      if (response.success) {
        if (pausedDownloadCache.current.has(id)) {
          pausedDownloadCache.current.delete(id)
          saveCacheToLocalStorage()
        }
        
        setDownloads(prev => prev.filter(d => d.id !== id))
        previousDownloadsRef.current.delete(id)

        toast({
          title: 'Kill Command Sent',
          description: 'Download will be removed shortly',
        })
      } else {
        toast({
          title: 'Failed to kill',
          description: response.error,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('[Dashboard] Error killing download:', error)
      toast({
        title: 'Failed to kill',
        description: 'An error occurred',
        variant: 'destructive',
      })
    } finally {
      setLoadingDownloads(prev => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleDisconnect = async () => {
    console.log('[Dashboard] Disconnect button clicked')
    
    try {
      const response = await apiClient.disconnect()
      
      if (response.success) {
        toast({
          title: 'Disconnected',
          description: 'Device has been removed from your account',
        })
      } else {
        console.warn('[Dashboard] Disconnect failed:', response.error)
        toast({
          title: 'Disconnected Locally',
          description: 'Session cleared from this device',
        })
      }
    } catch (error) {
      console.error('[Dashboard] Disconnect error:', error)
      toast({
        title: 'Disconnected Locally',
        description: 'Session cleared from this device',
      })
    }
    
    router.push('/')
  }

  // Filter ghost downloads
  const validDownloads = downloads.filter(d => {
    const isGhost = d.progress === 0 && 
                   (d.downloaded === '0 B' || d.downloaded === '0') && 
                   ['paused', 'stopped', 'error'].includes(d.status);
    
    return !isGhost; // Kepp only real downloads
  });

  const activeDownloads = validDownloads.filter(d => 
    d.status === 'downloading' || d.status === 'queued' || d.status === 'extracting'
  )
  const pausedDownloads = validDownloads.filter(d => d.status === 'paused' || d.status === 'stopped')
  const completedDownloads = validDownloads.filter(d => d.status === 'completed')
  const errorDownloads = validDownloads.filter(d => d.status === 'error')

  return (
    <>
      <div className={cn("min-h-screen bg-gradient-to-br pb-16", themeColors.bg)}>
        <div className={cn("sticky top-0 z-10 backdrop-blur-lg border-b", themeColors.card, themeColors.border)}>
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <h1 className={cn("text-xl font-bold", themeColors.text)}>
                    {userName ? `Hey, ${userName}!` : 'Downloads'}
                  </h1>
                  {lastUpdated && (
                    <p className={cn("text-xs opacity-70", themeColors.text)}>
                      Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <ThemeButton onClick={() => setShowThemeSelector(true)} />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshDownloads}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
                <Button
                  variant="ghost"
                  className={cn(themeColors.text)}
                  size="sm"
                  onClick={handleDisconnect}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </div>
            </div>
          </div>
        </div>

      <div className="container mx-auto px-4 py-6 space-y-8">
        {isLoading ? (
          <div className="space-y-4">
            <DownloadSkeleton />
            <DownloadSkeleton />
            <DownloadSkeleton />
          </div>
        ) : downloads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-4", themeColors.secondary)}>
              <Coffee className={cn("h-10 w-10 opacity-50", themeColors.text)} />
            </div>
            <h2 className={cn("text-2xl font-semibold mb-2", themeColors.text)}>Hm... Relaxing...</h2>
            <p className={cn("max-w-md opacity-70", themeColors.text)}>
              Start a download in Ascendara to monitor it here
            </p>
          </div>
        ) : (
          <>
            {activeDownloads.length > 0 && (
              <div className="space-y-4">
                <h2 className={cn("text-lg font-semibold flex items-center gap-2", themeColors.text)}>
                  <div className={cn("w-2 h-2 rounded-full animate-pulse", themeColors.primary)} />
                  Active Downloads ({activeDownloads.length})
                </h2>
                <div className="space-y-4">
                  {activeDownloads.map((download) => (
                    <DownloadCard
                      key={download.id}
                      download={download}
                      onPause={handlePause}
                      onResume={handleResume}
                      onCancel={handleCancel}
                      disabled={loadingDownloads.has(download.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {pausedDownloads.length > 0 && (
              <div className="space-y-4">
                <h2 className={cn("text-lg font-semibold", themeColors.text)}>
                  Paused Downloads ({pausedDownloads.length})
                </h2>
                <div className="space-y-4">
                  {pausedDownloads.map((download) => (
                    <DownloadCard
                      key={download.id}
                      download={download}
                      onPause={handlePause}
                      onResume={handleResume}
                      onCancel={handleCancel}
                      disabled={loadingDownloads.has(download.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {errorDownloads.length > 0 && (
              <div className="space-y-4">
                <h2 className={cn("text-lg font-semibold", themeColors.text)}>
                  Failed Downloads ({errorDownloads.length})
                </h2>
                <div className="space-y-4">
                  {errorDownloads.map((download) => (
                    <DownloadCard
                      key={download.id}
                      download={download}
                      onPause={handlePause}
                      onResume={handleResume}
                      onCancel={handleCancel}
                      disabled={loadingDownloads.has(download.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {completedDownloads.length > 0 && (
              <div className="space-y-4">
                <h2 className={cn("text-lg font-semibold", themeColors.text)}>
                  Completed ({completedDownloads.length})
                </h2>
                <div className="space-y-4">
                  {completedDownloads.map((download) => (
                    <DownloadCard
                      key={download.id}
                      download={download}
                      onPause={handlePause}
                      onResume={handleResume}
                      onCancel={handleCancel}
                      disabled={loadingDownloads.has(download.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {friends.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className={cn("text-lg font-semibold flex items-center gap-2", themeColors.text)}>
                    <Users className="h-5 w-5" />
                    Friends ({friends.filter(f => f.status.status !== 'offline').length} online)
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => router.push('/friends')}
                    className={cn("text-xs", themeColors.text)}
                  >
                    View All
                  </Button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {friends
                    .filter(f => f.status.status !== 'offline')
                    .slice(0, 6)
                    .map((friend) => (
                      <div
                        key={friend.uid}
                        className={cn(
                          "rounded-lg p-3 transition-all duration-200 hover:scale-[1.02] border",
                          themeColors.card,
                          themeColors.border
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative flex-shrink-0">
                            {friend.photoURL ? (
                              <img 
                                src={friend.photoURL} 
                                alt={friend.displayName}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                                {friend.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                              </div>
                            )}
                            <div className="absolute -bottom-0.5 -right-0.5">
                              <Circle
                                className={cn(
                                  'h-3 w-3 rounded-full border-2',
                                  friend.status.status === 'online' && 'bg-green-500',
                                  friend.status.status === 'away' && 'bg-yellow-500',
                                  friend.status.status === 'busy' && 'bg-red-500'
                                )}
                                style={{ borderColor: themeColors.card.split(' ')[0].includes('bg-') ? '#ffffff' : themeColors.card }}
                                fill="currentColor"
                              />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={cn("font-medium text-sm truncate", themeColors.text)}>
                              {friend.displayName}
                            </h3>
                            {friend.status.customMessage && (
                              <p className={cn("text-xs opacity-70 truncate", themeColors.text)}>
                                {friend.status.customMessage}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    
    <ThemeSelectorModal 
      isOpen={showThemeSelector} 
      onClose={() => setShowThemeSelector(false)} 
    />

    <AlertDialog 
      open={showSessionExpiredDialog}
      onOpenChange={setShowSessionExpiredDialog}
    >
      <AlertDialogContent className="max-w-[90vw] sm:max-w-md p-4 sm:p-6 gap-3">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-base sm:text-lg">Session Expired</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-xs sm:text-sm">
            Your session was revoked or expired.
            <ul className="list-disc list-inside mt-2 space-y-0.5 text-xs sm:text-sm">
              <li>Disconnected from another device</li>
              <li>Session timed out</li>
              <li>Connection code expired</li>
            </ul>
            <p className="mt-2 sm:mt-3 font-medium text-xs sm:text-sm">
              Please reconnect with a new code.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-2">
          <AlertDialogAction
            onClick={() => {
              apiClient.clearSession()
              setShowSessionExpiredDialog(false)
              router.push('/')
            }}
            className="w-full sm:w-auto text-sm"
          >
            Reconnect
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <InstallPrompt />
    <BottomNavbar />
  </>
  )
}
