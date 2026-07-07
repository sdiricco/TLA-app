import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type CourtTheme = 'grass' | 'hard' | 'clay'

const STORAGE_KEY = 'tla_court_theme'
const DARK_MODE_STORAGE_KEY = 'tla_dark_mode'
const themes: CourtTheme[] = ['grass', 'hard', 'clay']

function getInitialTheme(): CourtTheme {
  if (typeof localStorage === 'undefined') return 'grass'
  const stored = localStorage.getItem(STORAGE_KEY) as CourtTheme | null
  return stored && themes.includes(stored) ? stored : 'grass'
}

function getInitialDarkMode(): boolean {
  if (typeof localStorage === 'undefined') return false
  const stored = localStorage.getItem(DARK_MODE_STORAGE_KEY)
  if (stored !== null) return stored === 'true'
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

export const useThemeStore = defineStore('theme', () => {
  const courtTheme = ref<CourtTheme>(getInitialTheme())
  const isDark = ref(getInitialDarkMode())

  function syncDarkMode(enabled: boolean): void {
    document.documentElement.classList.toggle('app-dark', enabled)
    document.documentElement.dataset.colorScheme = enabled ? 'dark' : 'light'
  }

  function applyTheme(theme: CourtTheme): void {
    courtTheme.value = theme
    document.documentElement.dataset.courtTheme = theme
  }

  function toggleDarkMode(): void {
    isDark.value = !isDark.value
  }

  applyTheme(courtTheme.value)
  syncDarkMode(isDark.value)

  watch(courtTheme, (theme) => {
    document.documentElement.dataset.courtTheme = theme
    localStorage.setItem(STORAGE_KEY, theme)
  })

  watch(isDark, (enabled) => {
    syncDarkMode(enabled)
    localStorage.setItem(DARK_MODE_STORAGE_KEY, String(enabled))
  })

  return { courtTheme, isDark, applyTheme, toggleDarkMode }
})
