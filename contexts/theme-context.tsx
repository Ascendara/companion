'use client'

import * as React from 'react'
import { themes, getThemeColors, themeBackgroundColors, type Theme, type ThemeColors } from '@/lib/themes'

interface ThemeContextType {
  theme: Theme
  themeColors: ThemeColors
  setTheme: (themeId: string) => void
  isDark: boolean
}

const ThemeContext = React.createContext<ThemeContextType | undefined>(undefined)

const THEME_STORAGE_KEY = 'ascendara-theme'

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = React.useState<Theme>(themes[0])
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    const savedThemeId = localStorage.getItem(THEME_STORAGE_KEY)
    if (savedThemeId) {
      const savedTheme = themes.find(t => t.id === savedThemeId)
      if (savedTheme) {
        setCurrentTheme(savedTheme)
      }
    } else {
      const systemTheme = getSystemTheme()
      const matchingTheme = themes.find(t => t.id === systemTheme)
      if (matchingTheme) {
        setCurrentTheme(matchingTheme)
      }
    }
    
    setMounted(true)
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem(THEME_STORAGE_KEY)) {
        const newSystemTheme = e.matches ? 'dark' : 'light'
        const matchingTheme = themes.find(t => t.id === newSystemTheme)
        if (matchingTheme) {
          setCurrentTheme(matchingTheme)
        }
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  React.useEffect(() => {
    if (!mounted) return
    
    const isDark = currentTheme.group === 'dark'
    const htmlElement = document.documentElement
    htmlElement.dataset.theme = currentTheme.id
    
    if (isDark) {
      htmlElement.classList.add('dark')
    } else {
      htmlElement.classList.remove('dark')
    }
    
    htmlElement.style.colorScheme = isDark ? 'dark' : 'light'

    // Keep the mobile browser chrome (e.g. Safari's top bar) in sync with the
    // active theme instead of defaulting to black.
    const bgColor = themeBackgroundColors[currentTheme.id] ?? themeBackgroundColors.light
    let meta = document.querySelector('meta[name="theme-color"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.setAttribute('name', 'theme-color')
      document.head.appendChild(meta)
    }
    meta.setAttribute('content', bgColor)
  }, [currentTheme, mounted])

  const setTheme = React.useCallback((themeId: string) => {
    const newTheme = themes.find(t => t.id === themeId)
    if (newTheme) {
      setCurrentTheme(newTheme)
      if (mounted) {
        localStorage.setItem(THEME_STORAGE_KEY, themeId)
      }
    }
  }, [mounted])

  const themeColors = React.useMemo(() => getThemeColors(currentTheme.id), [currentTheme.id])
  const isDark = currentTheme.group === 'dark'

  return (
    <ThemeContext.Provider value={{ theme: currentTheme, themeColors, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = React.useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
