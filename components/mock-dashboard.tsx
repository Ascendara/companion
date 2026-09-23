'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { DownloadCard } from '@/components/download-card'
import { DownloadSkeleton } from '@/components/download-skeleton'
import { Button } from '@/components/ui/button'
import { BottomNavbar } from '@/components/bottom-navbar'
import { useTheme } from '@/contexts/theme-context'
import { RefreshCw, Coffee, Code, Users, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMockDashboard } from '@/hooks/use-mock-dashboard'

export function MockDashboard() {
  const router = useRouter()
  const { themeColors } = useTheme()
  const [isRefreshing, setIsRefreshing] = React.useState(false)
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null)

  const {
    downloads,
    isLoading,
    userName,
    friends,
    loadingDownloads,
    handlePause,
    handleResume,
    handleCancel,
    refreshDownloads
  } = useMockDashboard()

  React.useEffect(() => {
    setLastUpdated(new Date())
    const interval = setInterval(() => {
      setLastUpdated(new Date())
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshDownloads()
    setIsRefreshing(false)
    setLastUpdated(new Date())
  }

  const activeDownloads = downloads.filter(d => 
    d.status === 'downloading' || d.status === 'queued' || d.status === 'extracting'
  )
  const pausedDownloads = downloads.filter(d => d.status === 'paused' || d.status === 'stopped')
  const completedDownloads = downloads.filter(d => d.status === 'completed')
  const errorDownloads = downloads.filter(d => d.status === 'error')

  return (
    <>
      <div className={cn("companion-legacy min-h-screen pb-16", themeColors.bg)}>
        <div className={cn("sticky top-0 z-10 backdrop-blur-lg border-b", themeColors.card, themeColors.border)}>
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className={cn("text-xl font-bold", themeColors.text)}>
                      {userName ? `Hey, ${userName}!` : 'Downloads'}
                    </h1>
                    <div className={cn("px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1", themeColors.secondary)}>
                      <Code className="h-3 w-3" />
                      DEV
                    </div>
                  </div>
                  {lastUpdated && (
                    <p className={cn("text-xs opacity-70", themeColors.text)}>
                      Updated {lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
                Mock downloads will appear here
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
                                    friend.status.status === 'online' && 'text-green-500',
                                    friend.status.status === 'away' && 'text-yellow-500',
                                    friend.status.status === 'busy' && 'text-red-500',
                                    friend.status.status === 'offline' && 'text-gray-400'
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

      <BottomNavbar />
    </>
  )
}
