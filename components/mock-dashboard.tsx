'use client'

import * as React from 'react'
import { DownloadsView } from '@/components/downloads-view'
import { useMockDashboard } from '@/hooks/use-mock-dashboard'

export function MockDashboard() {
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

  return (
    <DownloadsView
      devMode
      userName={userName}
      lastUpdated={lastUpdated}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      onRefresh={handleRefresh}
      downloads={downloads}
      friends={friends}
      loadingDownloads={loadingDownloads}
      onPause={handlePause}
      onResume={handleResume}
      onCancel={handleCancel}
    />
  )
}
