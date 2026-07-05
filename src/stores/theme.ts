import { ref, watch } from 'vue'
import { defineStore } from 'pinia'

export type CourtTheme = 'grass' | 'hard' | 'clay'

const STORAGE_KEY = 'tla_court_theme'
const themes: CourtTheme[] = ['grass', 'hard', 'clay']

function getInitialTheme(): CourtTheme {
  if (typeof localStorage === 'undefined') return 'grass'
  const stored = localStorage.getItem(STORAGE_KEY) as CourtTheme | null
  return stored && themes.includes(stored) ? stored : 'grass'
}

export const useThemeStore = defineStore('theme', () => {
  const courtTheme = ref<CourtTheme>(getInitialTheme())

  function applyTheme(theme: CourtTheme): void {
    courtTheme.value = theme
    document.documentElement.dataset.courtTheme = theme
  }

  applyTheme(courtTheme.value)

  watch(courtTheme, (theme) => {
    document.documentElement.dataset.courtTheme = theme
    localStorage.setItem(STORAGE_KEY, theme)
  })

  return { courtTheme, applyTheme }
})
