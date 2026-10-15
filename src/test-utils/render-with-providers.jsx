import { render } from '@testing-library/react'
import { ThemeProvider } from '@/components/theme-provider'
import '@/index.css'

/**
 * Renders UI with the app ThemeProvider (dark class / CSS variables).
 * @param {import('react').ReactElement} ui
 * @param {{ themeMode?: 'dark'|'light'|'system' } & import('@testing-library/react').RenderOptions} [options]
 */
export function renderWithProviders(ui, options = {}) {
  const { themeMode = 'dark', ...rest } = options
  return render(<ThemeProvider themeMode={themeMode}>{ui}</ThemeProvider>, rest)
}

/** @deprecated Prefer renderWithProviders */
export const renderWithMui = renderWithProviders
