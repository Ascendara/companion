export const config = {
  apiBaseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || 'https://monitor.ascendara.app',
  pollingInterval: 10000,
  appName: 'Ascendara Monitor',
} as const

// Log configuration on load
if (typeof window !== 'undefined') {
  console.log('[Config] Application configuration loaded:')
  console.log('[Config] API Base URL:', config.apiBaseUrl)
  console.log('[Config] Polling Interval:', config.pollingInterval)
  console.log('[Config] App Name:', config.appName)
  console.log('[Config] Current origin:', window.location.origin)
}
