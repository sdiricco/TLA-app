import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { defaultTournamentFeatureFlags, type LockedTournamentFormat } from '../config/tournamentFormats'
import type { TournamentCategory, TournamentFormat } from '../types'

const FEATURE_FLAGS_STORAGE_KEY = 'tla_feature_flags'

type TournamentFeatureFlags = {
  formats: Record<LockedTournamentFormat, boolean>
  categories: Record<TournamentCategory, boolean>
}

function readTournamentFeatureFlags(): TournamentFeatureFlags {
  if (typeof localStorage === 'undefined') {
    return {
      formats: { ...defaultTournamentFeatureFlags.formats },
      categories: { ...defaultTournamentFeatureFlags.categories },
    }
  }

  try {
    const raw = localStorage.getItem(FEATURE_FLAGS_STORAGE_KEY)
    if (!raw) {
      return {
        formats: { ...defaultTournamentFeatureFlags.formats },
        categories: { ...defaultTournamentFeatureFlags.categories },
      }
    }

    const parsed = JSON.parse(raw) as Partial<TournamentFeatureFlags> & Record<string, boolean> | null
    const formatSource = parsed?.formats ?? parsed
    const categorySource = parsed?.categories ?? parsed
    return {
      formats: {
        double_elimination:
          formatSource?.double_elimination ?? defaultTournamentFeatureFlags.formats.double_elimination,
        round_robin_elimination:
          formatSource?.round_robin_elimination ??
          defaultTournamentFeatureFlags.formats.round_robin_elimination,
      },
      categories: {
        maschile: categorySource?.maschile ?? defaultTournamentFeatureFlags.categories.maschile,
        femminile: categorySource?.femminile ?? defaultTournamentFeatureFlags.categories.femminile,
      },
    }
  } catch {
    return {
      formats: { ...defaultTournamentFeatureFlags.formats },
      categories: { ...defaultTournamentFeatureFlags.categories },
    }
  }
}

function persistTournamentFeatureFlags(flags: TournamentFeatureFlags): void {
  localStorage.setItem(FEATURE_FLAGS_STORAGE_KEY, JSON.stringify(flags))
}

export const useFeatureFlagsStore = defineStore('featureFlags', () => {
  const tournamentFormats = ref<TournamentFeatureFlags>(readTournamentFeatureFlags())

  const enabledTournamentFormats = computed<TournamentFormat[]>(() => [
    'single_elimination',
    'round_robin',
    ...(Object.entries(tournamentFormats.value.formats)
      .filter(([, enabled]) => enabled)
      .map(([format]) => format) as LockedTournamentFormat[]),
  ])

  const enabledTournamentCategories = computed<TournamentCategory[]>(() =>
    Object.entries(tournamentFormats.value.categories)
      .filter(([, enabled]) => enabled)
      .map(([category]) => category as TournamentCategory),
  )

  function isTournamentFormatEnabled(format: TournamentFormat): boolean {
    return format === 'single_elimination' || format === 'round_robin' || tournamentFormats.value.formats[format]
  }

  function setTournamentFormatEnabled(format: LockedTournamentFormat, enabled: boolean): void {
    tournamentFormats.value = {
      ...tournamentFormats.value,
      formats: {
        ...tournamentFormats.value.formats,
        [format]: enabled,
      },
    }
    persistTournamentFeatureFlags(tournamentFormats.value)
  }

  function resetTournamentFormats(): void {
    tournamentFormats.value = {
      formats: { ...defaultTournamentFeatureFlags.formats },
      categories: { ...defaultTournamentFeatureFlags.categories },
    }
    persistTournamentFeatureFlags(tournamentFormats.value)
  }

  function isTournamentCategoryEnabled(category: TournamentCategory): boolean {
    return tournamentFormats.value.categories[category]
  }

  function setTournamentCategoryEnabled(category: TournamentCategory, enabled: boolean): void {
    tournamentFormats.value = {
      ...tournamentFormats.value,
      categories: {
        ...tournamentFormats.value.categories,
        [category]: enabled,
      },
    }
    persistTournamentFeatureFlags(tournamentFormats.value)
  }

  function resetTournamentCategories(): void {
    tournamentFormats.value = {
      ...tournamentFormats.value,
      categories: { ...defaultTournamentFeatureFlags.categories },
    }
    persistTournamentFeatureFlags(tournamentFormats.value)
  }

  return {
    tournamentFormats,
    enabledTournamentFormats,
    enabledTournamentCategories,
    isTournamentFormatEnabled,
    setTournamentFormatEnabled,
    resetTournamentFormats,
    isTournamentCategoryEnabled,
    setTournamentCategoryEnabled,
    resetTournamentCategories,
  }
})
