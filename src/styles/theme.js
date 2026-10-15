/**
 * Theme mode helpers for Stream Studio.
 * Visual tokens live in src/index.css as CSS variables.
 */

/**
 * Resolve themeMode to an effective color scheme.
 * @param {'dark'|'light'|'system'} themeMode
 * @param {boolean} systemPrefersDark
 * @returns {'dark'|'light'}
 */
export function resolveTheme(themeMode, systemPrefersDark) {
  if (themeMode === 'system') {
    return systemPrefersDark ? 'dark' : 'light'
  }
  return themeMode === 'light' ? 'light' : 'dark'
}

/**
 * Apply the resolved theme to the document root.
 * @param {'dark'|'light'} resolvedTheme
 */
export function applyDocumentTheme(resolvedTheme) {
  const root = document.documentElement
  if (resolvedTheme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}
