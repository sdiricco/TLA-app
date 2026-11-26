<script setup lang="ts">
// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------
import { computed } from 'vue'
import Button from 'primevue/button'
import ToggleSwitch from 'primevue/toggleswitch'
import SettingsGroup from '@/components/settings/SettingsGroup.vue'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import {
  tournamentCategoryDefinitions,
  tournamentFormatDefinitions,
} from '@/config/tournamentFormats'
import { useFeatureFlagsStore } from '@/stores/featureFlags'
import type { LockedTournamentFormat } from '@/config/tournamentFormats'
import type { TournamentCategory } from '@/types'

// -----------------------------------------------------------------------------
// Derived state
// Unlocked formats are always offered, so they render as fixed rows instead of
// toggles that could never be switched off.
// -----------------------------------------------------------------------------
const featureFlags = useFeatureFlagsStore()

const formatRows = computed(() =>
  tournamentFormatDefinitions.map((definition) => ({
    ...definition,
    enabled: featureFlags.isTournamentFormatEnabled(definition.format),
    configurable: definition.locked === true,
  })),
)

const categoryRows = computed(() =>
  tournamentCategoryDefinitions.map((definition) => ({
    ...definition,
    enabled: featureFlags.isTournamentCategoryEnabled(definition.category),
  })),
)

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------
function toggleFormat(format: LockedTournamentFormat, enabled: boolean): void {
  featureFlags.setTournamentFormatEnabled(format, enabled)
}

function toggleCategory(category: TournamentCategory, enabled: boolean): void {
  featureFlags.setTournamentCategoryEnabled(category, enabled)
}
</script>

<template>
  <div class="grid gap-7">
    <!-- Section: Tournament formats -->
    <SettingsGroup title="Formati torneo" description="Formati proposti quando crei un nuovo torneo.">
      <template #actions>
        <Button
          label="Ripristina"
          icon="pi pi-undo"
          size="small"
          severity="secondary"
          text
          @click="featureFlags.resetTournamentFormats()"
        />
      </template>
      <SettingsRow
        v-for="item in formatRows"
        :key="item.format"
        :title="item.title"
        :description="item.description"
        :icon="item.icon"
        :muted="!item.enabled"
        :label-for="item.configurable ? `format-${item.format}` : undefined"
      >
        <ToggleSwitch
          v-if="item.configurable"
          :input-id="`format-${item.format}`"
          :model-value="item.enabled"
          @update:model-value="(value) => toggleFormat(item.format as LockedTournamentFormat, Boolean(value))"
        />
        <span v-else class="shrink-0 text-xs font-semibold text-(--color-text-subtle)">Sempre attivo</span>
      </SettingsRow>
    </SettingsGroup>

    <!-- Section: Tournament categories -->
    <SettingsGroup title="Categorie" description="Categorie selezionabili per i tornei.">
      <template #actions>
        <Button
          label="Ripristina"
          icon="pi pi-undo"
          size="small"
          severity="secondary"
          text
          @click="featureFlags.resetTournamentCategories()"
        />
      </template>
      <SettingsRow
        v-for="item in categoryRows"
        :key="item.category"
        :title="item.title"
        :icon="item.icon"
        :muted="!item.enabled"
        :label-for="`category-${item.category}`"
      >
        <ToggleSwitch
          :input-id="`category-${item.category}`"
          :model-value="item.enabled"
          @update:model-value="(value) => toggleCategory(item.category, Boolean(value))"
        />
      </SettingsRow>
    </SettingsGroup>
  </div>
</template>
