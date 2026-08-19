import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import { usePreferredDark } from '@vueuse/core'

export type CourtTheme = 'grass'
export type ColorSchemePreference = 'light' | 'dark' | 'system'

const THEME_STORAGE_KEY = 'tla_court_theme'
const COLOR_SCHEME_STORAGE_KEY = 'tla_color_scheme'
const LEGACY_DARK_MODE_STORAGE_KEY = 'tla_dark_mode'

function getInitialAppearance(): ColorSchemePreference {
  if (typeof localStorage === 'undefined') return 'system'

  const stored = localStorage.getItem(COLOR_SCHEME_STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored

  // Older versions exposed no working selector but may have stored an active
  // dark preference. Preserve only that explicit value; the legacy `false`
  // was written automatically and should fall back to the system preference.
  return localStorage.getItem(LEGACY_DARK_MODE_STORAGE_KEY) === 'true' ? 'dark' : 'system'
}

export const useThemeStore = defineStore('theme', () => {
  const courtTheme = ref<CourtTheme>('grass')
  const appearance = ref<ColorSchemePreference>(getInitialAppearance())
  const systemPrefersDark = usePreferredDark()
  const isDark = computed(() => appearance.value === 'dark' || (appearance.value === 'system' && systemPrefersDark.value))

  function syncDocument(enabled: boolean): void {
    if (typeof document === 'undefined') return
    document.documentElement.classList.toggle('app-dark', enabled)
    document.documentElement.dataset.colorScheme = enabled ? 'dark' : 'light'
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', enabled ? '#171e1b' : '#f5f8f7')
  }

  function applyTheme(): void {
    courtTheme.value = 'grass'
    if (typeof document !== 'undefined') document.documentElement.dataset.courtTheme = 'grass'
  }

  function setAppearance(value: ColorSchemePreference): void {
    appearance.value = value
  }

  function toggleDarkMode(): void {
    setAppearance(isDark.value ? 'light' : 'dark')
  }

  applyTheme()

  watch(appearance, (value) => {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(COLOR_SCHEME_STORAGE_KEY, value)
    localStorage.removeItem(LEGACY_DARK_MODE_STORAGE_KEY)
  }, { immediate: true })

  watch(isDark, syncDocument, { immediate: true })

  watch(courtTheme, () => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(THEME_STORAGE_KEY, 'grass')
    applyTheme()
  })

  return {
    courtTheme,
    appearance,
    isDark,
    systemPrefersDark,
    setAppearance,
    toggleDarkMode,
  }
})
