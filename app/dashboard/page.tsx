'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { DownloadsView } from '@/components/downloads-view'
import { InstallPrompt } from '@/components/install-prompt'
import { ConnectionGuard } from '@/components/connection-guard'
import { apiClient, Download } from '@/lib/api'
import { connectionState } from '@/lib/connection-state'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle } from 'lucide-react'
import { config } from '@/lib/config'
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
  const [downloads, setDownloads] = React.useState<Download[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)
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
              if (Number.isFinite(download.progress)) {
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
              !apiDownloadIds.has(d.id) && response.data!.newDownloadIds.includes(d.id) && d.status === 'queued' && d.eta === 'Calculating...'
            )
            return [...downloadsWithCache, ...preservedPlaceholders]
          })
          setLastUpdated(response.data.lastUpdated ? new Date(response.data.lastUpdated) : null)
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
      const response = await connectionState.fetchWithDedup('downloads', () => apiClient.getDownloads(), true)
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
            if (Number.isFinite(download.progress)) {
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
        setLastUpdated(response.data.lastUpdated ? new Date(response.data.lastUpdated) : null)
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

  return (
    <>
      <DownloadsView
        userName={userName}
        lastUpdated={lastUpdated}
        isLoading={isLoading}
        isRefreshing={isRefreshing}
        onRefresh={refreshDownloads}
        downloads={downloads}
        friends={friends}
        loadingDownloads={loadingDownloads}
        onPause={handlePause}
        onResume={handleResume}
        onCancel={handleCancel}
      />

      <AlertDialog
        open={showSessionExpiredDialog}
        onOpenChange={setShowSessionExpiredDialog}
      >
        <AlertDialogContent className="max-w-[92vw] sm:max-w-md p-5 sm:p-6 gap-3 rounded-2xl">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-11 h-11 rounded-xl bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <AlertDialogTitle className="text-lg">Session expired</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-sm">
              Your session was revoked or expired. This can happen when you disconnect from another device, the session times out, or the connection code expires.
              <span className="block mt-3 font-medium text-foreground">Please reconnect with a new code.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogAction
              onClick={() => {
                apiClient.clearSession()
                setShowSessionExpiredDialog(false)
                router.push('/')
              }}
              className="w-full sm:w-auto"
            >
              Reconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InstallPrompt />
    </>
  )
}
