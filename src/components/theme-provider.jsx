import { useEffect, useState } from 'react'
import { applyDocumentTheme, resolveTheme } from '@/styles/theme'

/**
 * Applies dark/light CSS class based on themeMode and system preference.
 * @param {{ themeMode: 'dark'|'light'|'system', children: import('react').ReactNode }} props
 */
export function ThemeProvider({ themeMode = 'dark', children }) {
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : true
  )

  useEffect(() => {
    if (themeMode !== 'system') return undefined
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event) => setSystemPrefersDark(event.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [themeMode])

  useEffect(() => {
    applyDocumentTheme(resolveTheme(themeMode, systemPrefersDark))
  }, [themeMode, systemPrefersDark])

  return children
}
