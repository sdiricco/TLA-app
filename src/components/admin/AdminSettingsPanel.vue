<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import ToggleSwitch from 'primevue/toggleswitch'
import {
  tournamentCategoryDefinitions,
  tournamentFormatDefinitions,
} from '../../config/tournamentFormats'
import { useFeatureFlagsStore } from '../../stores/featureFlags'
import { useThemeStore } from '../../stores/theme'
import type { LockedTournamentFormat } from '../../config/tournamentFormats'
import type { TournamentCategory } from '../../types'

withDefaults(defineProps<{
  embedded?: boolean
}>(), {
  embedded: false,
})

const featureFlags = useFeatureFlagsStore()
const theme = useThemeStore()
const appearanceLabel = computed(() => ({ light: 'chiaro', dark: 'scuro', system: 'sistema' }[theme.appearance]))

const formatCards = computed(() =>
  tournamentFormatDefinitions.map((definition) => {
    const enabled = featureFlags.isTournamentFormatEnabled(definition.format)
    const locked = definition.locked === true
    return {
      ...definition,
      enabled,
      locked,
      selectable: !locked || enabled,
    }
  }),
)

const categoryCards = computed(() =>
  tournamentCategoryDefinitions.map((definition) => {
    const enabled = featureFlags.isTournamentCategoryEnabled(definition.category)
    return {
      ...definition,
      enabled,
    }
  }),
)

function toggleFormat(format: LockedTournamentFormat, enabled: boolean): void {
  featureFlags.setTournamentFormatEnabled(format, enabled)
}

function toggleCategory(category: TournamentCategory, enabled: boolean): void {
  featureFlags.setTournamentCategoryEnabled(category, enabled)
}
</script>

<template>
  <div class="flex flex-col gap-7">
    <div v-if="!embedded" class="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-(--color-border) bg-(--color-surface-card) p-5">
      <div>
        <h2 class="m-0 text-2xl font-bold">Configurazione tornei</h2>
        <p class="mb-0 mt-1 text-sm text-(--color-text-muted)">
          Scegli quali opzioni rendere disponibili durante la creazione dei tornei.
        </p>
      </div>

      <Button
        label="Ripristina tutto"
        icon="pi pi-refresh"
        severity="secondary"
        outlined
        @click="featureFlags.resetTournamentFormats()"
      />
    </div>

    <!-- Section: Appearance summary -->
    <section class="grid gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="m-0 text-lg font-bold">Aspetto app</h3>
          <p class="mb-0 mt-1 text-sm text-(--color-text-muted)">Configurazione visiva attualmente disponibile.</p>
        </div>
        <Tag value="Tema verde" severity="success" />
      </div>

      <article class="flex flex-col gap-4 rounded-lg border border-(--color-border) bg-(--color-surface-soft) p-4 sm:flex-row sm:items-center">
        <span class="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-100 text-primary-700">
          <i class="pi pi-palette text-lg" />
        </span>
        <div class="min-w-0 flex-1">
          <h4 class="m-0 font-bold">Erba · {{ appearanceLabel }}</h4>
          <p class="mb-0 mt-1 text-sm leading-relaxed text-(--color-text-muted)">
            L’aspetto si configura nella sezione Personalizzazione e viene applicato a tutta l’app.
          </p>
        </div>
        <Tag :value="theme.isDark ? 'Scuro' : 'Chiaro'" severity="secondary" />
      </article>
    </section>

    <!-- Section: Tournament formats -->
    <section class="grid gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="m-0 text-lg font-bold">Formati torneo</h3>
          <p class="mb-0 mt-1 text-sm text-(--color-text-muted)">Controlla i formati mostrati nel nuovo torneo.</p>
        </div>
        <Button
          label="Ripristina"
          icon="pi pi-undo"
          size="small"
          severity="secondary"
          outlined
          @click="featureFlags.resetTournamentFormats()"
        />
      </div>

      <div class="grid gap-3 lg:grid-cols-2">
        <article
          v-for="item in formatCards"
          :key="item.format"
          class="grid gap-4 rounded-lg border border-(--color-border) bg-(--color-surface-card) p-4"
        >
          <div class="flex min-w-0 items-start gap-3">
            <span
              class="grid size-10 shrink-0 place-items-center rounded-lg"
              :class="item.enabled ? 'bg-primary-100 text-primary-700' : 'bg-(--color-surface-soft) text-(--color-text-subtle)'"
            >
              <i :class="item.icon" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <h4 class="m-0 font-bold">{{ item.title }}</h4>
                <Tag :value="item.enabled ? 'Attivo' : 'Non attivo'" :severity="item.enabled ? 'success' : 'secondary'" />
              </div>
              <p class="mb-0 mt-1 text-sm leading-relaxed text-(--color-text-muted)">{{ item.description }}</p>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 border-t border-(--color-border) pt-3">
            <span class="text-xs text-(--color-text-muted)">
              {{ item.locked ? 'Disponibilità nel form' : 'Formato sempre disponibile' }}
            </span>
            <div v-if="item.locked" class="flex items-center gap-2">
              <label class="text-sm font-semibold" :for="`format-${item.format}`">{{ item.enabled ? 'Attivo' : 'Disattivato' }}</label>
              <ToggleSwitch
                :input-id="`format-${item.format}`"
                :model-value="item.enabled"
                @update:model-value="(value) => toggleFormat(item.format as LockedTournamentFormat, Boolean(value))"
              />
            </div>
            <span v-else class="text-sm font-semibold text-primary">Sempre attivo</span>
          </div>
        </article>
      </div>
    </section>

    <!-- Section: Tournament categories -->
    <section class="grid gap-3">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 class="m-0 text-lg font-bold">Categorie torneo</h3>
          <p class="mb-0 mt-1 text-sm text-(--color-text-muted)">Scegli le categorie disponibili per l’organizzazione.</p>
        </div>
        <Button
          label="Ripristina"
          icon="pi pi-undo"
          size="small"
          severity="secondary"
          outlined
          @click="featureFlags.resetTournamentCategories()"
        />
      </div>

      <div class="grid gap-3 lg:grid-cols-2">
        <article
          v-for="item in categoryCards"
          :key="item.category"
          class="grid gap-4 rounded-lg border border-(--color-border) bg-(--color-surface-card) p-4"
        >
          <div class="flex min-w-0 items-start gap-3">
            <span
              class="grid size-10 shrink-0 place-items-center rounded-lg"
              :class="item.enabled ? 'bg-primary-100 text-primary-700' : 'bg-(--color-surface-soft) text-(--color-text-subtle)'"
            >
              <i :class="item.icon" />
            </span>
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <h4 class="m-0 font-bold">{{ item.title }}</h4>
                <Tag :value="item.enabled ? 'Attiva' : 'Non attiva'" :severity="item.enabled ? 'success' : 'secondary'" />
              </div>
              <p class="mb-0 mt-1 text-sm leading-relaxed text-(--color-text-muted)">{{ item.description }}</p>
            </div>
          </div>

          <div class="flex items-center justify-between gap-3 border-t border-(--color-border) pt-3">
            <span class="text-xs text-(--color-text-muted)">Disponibilità nel form</span>
            <div class="flex items-center gap-2">
              <label class="text-sm font-semibold" :for="`category-${item.category}`">{{ item.enabled ? 'Attiva' : 'Disattivata' }}</label>
              <ToggleSwitch
                :input-id="`category-${item.category}`"
                :model-value="item.enabled"
                @update:model-value="(value) => toggleCategory(item.category, Boolean(value))"
              />
            </div>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>
