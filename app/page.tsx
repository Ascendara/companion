'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CodeInput } from '@/components/code-input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeSelectorModal } from '@/components/theme-selector-modal'
import { ThemeButton } from '@/components/theme-button'
import { apiClient } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from '@/contexts/theme-context'
import { Loader, Loader2, Unplug, Code } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction } from '@/components/ui/alert-dialog'
import { isDevMode, DEV_MOCK_CODE } from '@/lib/dev-mode'

export default function Home() {
  const router = useRouter()
  const { toast } = useToast()
  const { themeColors } = useTheme()
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState(false)
  const [showThemeSelector, setShowThemeSelector] = React.useState(false)
  const [initialCode, setInitialCode] = React.useState<string>('')
  const [autoConnecting, setAutoConnecting] = React.useState(false)
  const [monitorOffline, setMonitorOffline] = React.useState(false)
  const [checkingMonitor, setCheckingMonitor] = React.useState(true)
  const hasCheckedMonitor = React.useRef(false)
  const isProcessingCode = React.useRef(false)

  React.useEffect(() => {
    if (isDevMode()) {
      console.log('[Monitor] Dev mode detected, skipping monitor check')
      setCheckingMonitor(false)
      sessionStorage.setItem('monitor_status', 'online')
      return
    }

    if (hasCheckedMonitor.current) {
      const cachedStatus = sessionStorage.getItem('monitor_status')
      if (cachedStatus === 'online') {
        setCheckingMonitor(false)
        return
      } else if (cachedStatus === 'offline') {
        setMonitorOffline(true)
        setCheckingMonitor(false)
        return
      }
    }

    const checkMonitorEndpoint = async () => {
      if (hasCheckedMonitor.current) return
      hasCheckedMonitor.current = true

      try {
        console.log('[Monitor] Checking monitor endpoint...')
        const response = await fetch('https://monitor.ascendara.app', {
          method: 'GET',
          cache: 'no-cache',
        })
        
        if (response.status === 429) {
          console.log('[Monitor] Rate limited (429) - treating as online')
          sessionStorage.setItem('monitor_status', 'online')
          setCheckingMonitor(false)
          return
        }
        
        if (!response.ok || response.status === 1033 || response.status === 502) {
          console.error('[Monitor] Endpoint offline or returned 1033')
          sessionStorage.setItem('monitor_status', 'offline')
          setMonitorOffline(true)
          setCheckingMonitor(false)
          return
        }
        
        console.log('[Monitor] Endpoint is online')
        sessionStorage.setItem('monitor_status', 'online')
        setCheckingMonitor(false)
      } catch (error) {
        console.warn('[Monitor] CORS/Network error (treating as online):', error)
        sessionStorage.setItem('monitor_status', 'online')
        setCheckingMonitor(false)
      }
    }

    checkMonitorEndpoint()
  }, [])

  React.useEffect(() => {
    if (checkingMonitor || monitorOffline) {
      return
    }

    const existingSession = apiClient.getSessionId()
    if (existingSession && !new URLSearchParams(window.location.search).has('reconnect')) {
      console.log('[Connection] Existing session found, redirecting to dashboard')
          router.push('/library')
      return
    }

    const searchParams = new URLSearchParams(window.location.search)
    const codeParam = searchParams.get('code')
    
    if (codeParam && /^\d{6}$/.test(codeParam)) {
      console.log('[Connection] 6-digit code found in URL:', codeParam)
      setInitialCode(codeParam)
      setAutoConnecting(true)
      handleCodeComplete(codeParam)
    }
  }, [router, checkingMonitor, monitorOffline])

  const handleCodeComplete = async (code: string) => {
    if (isProcessingCode.current) {
      console.log('[Connection] Already processing a code, ignoring duplicate call')
      return
    }
    
    isProcessingCode.current = true
    console.log('[Connection] Code input completed:', code)
    console.log('[Connection] Code length:', code.length)
    console.log('[Connection] Code is numeric:', /^\d+$/.test(code))
    
    if (isDevMode() && code === DEV_MOCK_CODE) {
      console.log('[Connection] Dev mock code detected, routing to mock dashboard')
      setIsLoading(true)
      
      localStorage.setItem('mock_mode', 'true')
      
      toast({
        title: 'Dev Mode Activated',
        description: 'Connected to mock dashboard',
      })
      
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
      return
    }
    
    setIsLoading(true)
    setError(false)

    try {
      console.log('[Connection] Calling API to verify code...')
      const response = await apiClient.verifyCode(code)
      console.log('[Connection] API response:', response)

      if (response.success && response.data) {
        console.log('[Connection] Verification successful!')
        console.log('[Connection] Session ID:', response.data.sessionId)
        console.log('[Connection] Display name:', response.data.displayName)
        
        apiClient.setSessionId(response.data.sessionId)
        console.log('[Connection] Session ID saved to localStorage')
        
        toast({
          title: 'Connected',
          description: `Connected to ${response.data.displayName}`,
        })
        
        console.log('[Connection] Redirecting to discovery...')
        localStorage.removeItem('mock_mode')
        sessionStorage.removeItem('session_error')
        router.push('/library')
      } else {
        console.error('[Connection] Verification failed:', response.error)
        setError(true)
        setAutoConnecting(false)
        isProcessingCode.current = false
        toast({
          title: 'Connection Failed',
          description: response.error || 'Invalid or expired code',
          variant: 'destructive',
        })
        setIsLoading(false)
      }
    } catch (err) {
      console.error('[Connection] Exception caught:', err)
      console.error('[Connection] Error details:', err instanceof Error ? err.message : 'Unknown error')
      setError(true)
      setAutoConnecting(false)
      isProcessingCode.current = false
      toast({
        title: 'Connection Error',
        description: 'Unable to connect to Ascendara',
        variant: 'destructive',
      })
      setIsLoading(false)
    }
  }

  if (checkingMonitor) {
    return (
      <div className={cn("flex min-h-screen items-center justify-center bg-gradient-to-br p-4", themeColors.bg)}>
        <Card className={cn("w-full max-w-md shadow-lg border", themeColors.card)}>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center space-y-6">
              <Loader className={cn("h-8 w-8 animate-spin", themeColors.accent)} />
              <p className={cn("text-sm opacity-70", themeColors.text)}>
                Checking service status...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (autoConnecting) {
    return (
      <div className={cn("flex min-h-screen items-center justify-center bg-gradient-to-br p-4", themeColors.bg)}>
        <Card className={cn("w-full max-w-md shadow-lg border", themeColors.card)}>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="relative">
                <div className={cn("w-24 h-24 rounded-full flex items-center justify-center", themeColors.secondary)}>
                  <Unplug className={cn("h-12 w-12", themeColors.accent)} />
                </div>
                <div className={cn("absolute inset-0 rounded-full animate-ping opacity-20", themeColors.secondary)} />
              </div>
              
              <div className="text-center space-y-2">
                <h2 className={cn("text-2xl font-bold", themeColors.text)}>
                  Connecting to Ascend
                </h2>
                <p className={cn("text-sm opacity-70", themeColors.text)}>
                  Please wait while we start the session...
                </p>
              </div>
              
              <Loader className={cn("h-8 w-8 animate-spin", themeColors.accent)} />
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className={cn("flex min-h-screen items-center justify-center bg-gradient-to-br p-4", themeColors.bg)}>
        <div className="absolute top-4 right-4">
          <ThemeButton onClick={() => setShowThemeSelector(true)} />
        </div>
        
        {isDevMode() && (
          <div className="fixed bottom-4 left-4 z-50">
            <div className={cn(
              "px-3 py-2 rounded-lg border backdrop-blur-lg shadow-lg",
              "bg-purple-500/10 border-purple-500/20"
            )}>
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-purple-500" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-purple-600 dark:text-purple-400 leading-none">
                    Developer Mode
                  </span>
                  <span className="text-[10px] text-purple-600/70 dark:text-purple-400/70 leading-none mt-0.5">
                    Use code: 123456
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <Card className={cn("w-full max-w-md shadow-lg border", themeColors.card)}>
          <CardHeader className="text-center space-y-4">
            <div>
              <CardTitle className={cn("text-2xl font-bold", themeColors.text)}>
                Ascendara Companion
              </CardTitle>
              <CardDescription className="mt-2">
                Discover games, explore your library, and keep up with your desktop.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <p className="text-center text-sm">Enter the 6-digit code displayed in Ascendara</p>
              <CodeInput
                length={6}
                onComplete={handleCodeComplete}
                disabled={isLoading}
                error={error}
                initialValue={initialCode}
              />
              {error && (
                <div className="flex items-center justify-center gap-2 text-sm text-red-500">
                  <span>Invalid or expired code. Please try again.</span>
                </div>
              )}
            </div>
            {isLoading && (
              <div className={cn("flex items-center justify-center gap-2 text-sm opacity-70", themeColors.text)}>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Connecting...</span>
              </div>
            )}
            <div className={cn("text-center text-sm opacity-70", themeColors.text)}>
              <p>Open Ascendara on your desktop and navigate to</p>
              <p className="font-semibold mt-1">Ascend → Companion</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <ThemeSelectorModal 
        isOpen={showThemeSelector} 
        onClose={() => setShowThemeSelector(false)} 
      />

      <AlertDialog open={monitorOffline} onOpenChange={setMonitorOffline}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Service Unavailable</AlertDialogTitle>
            <AlertDialogDescription>
              The monitor endpoint is offline and Webview cannot be accessed at this time. Please join our Discord for more information and updates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => window.open('https://discord.gg/ascendara', '_blank')}>
              Join Discord
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
