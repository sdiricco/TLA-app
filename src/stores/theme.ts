import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type CourtTheme = 'grass'

const STORAGE_KEY = 'tla_court_theme'
const DARK_MODE_STORAGE_KEY = 'tla_dark_mode'
const themes: CourtTheme[] = ['grass']

function getInitialTheme(): CourtTheme {
  return 'grass'
}

function getInitialDarkMode(): boolean {
  return false
}

export const useThemeStore = defineStore('theme', () => {
  const courtTheme = ref<CourtTheme>(getInitialTheme())
  const isDark = ref(getInitialDarkMode())

  function syncDarkMode(enabled: boolean): void {
    document.documentElement.classList.toggle('app-dark', enabled)
    document.documentElement.dataset.colorScheme = enabled ? 'dark' : 'light'
  }

  function applyTheme(theme: CourtTheme): void {
    courtTheme.value = 'grass'
    document.documentElement.dataset.courtTheme = 'grass'
  }

  function toggleDarkMode(): void {
    isDark.value = false
  }

  applyTheme(courtTheme.value)
  syncDarkMode(isDark.value)

  watch(courtTheme, (theme) => {
    document.documentElement.dataset.courtTheme = 'grass'
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, 'grass')
  })

  watch(isDark, (enabled) => {
    syncDarkMode(false)
    if (typeof localStorage !== 'undefined') localStorage.setItem(DARK_MODE_STORAGE_KEY, 'false')
  })

  return { courtTheme, isDark, applyTheme, toggleDarkMode }
})
