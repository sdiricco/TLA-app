<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Checkbox from 'primevue/checkbox'
import Tag from 'primevue/tag'
import {
  tournamentCategoryDefinitions,
  tournamentFormatDefinitions,
} from '../config/tournamentFormats'
import { useFeatureFlagsStore } from '../stores/featureFlags'
import type { LockedTournamentFormat } from '../config/tournamentFormats'
import type { TournamentCategory } from '../types'

const featureFlags = useFeatureFlagsStore()

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
  <div class="flex flex-col gap-5">
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 class="m-0 text-2xl">Admin</h2>
        <p class="mt-1 mb-0 text-sm text-muted-color">
          Feature flags per formati e categorie torneo. Eliminazione diretta e girone all'italiana restano sempre attivi.
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

    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h3 class="m-0 text-lg font-semibold">Formati torneo</h3>
        <Button
          label="Ripristina formati"
          icon="pi pi-undo"
          severity="secondary"
          text
          @click="featureFlags.resetTournamentFormats()"
        />
      </div>
      <div class="grid gap-4 lg:grid-cols-2">
        <Card
          v-for="item in formatCards"
          :key="item.format"
          class="overflow-hidden"
          :class="{
            'border-primary-200 bg-primary-50/40': item.enabled,
            'opacity-90': !item.enabled,
          }"
        >
          <template #content>
            <div class="flex items-start gap-4">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                :class="item.enabled ? 'bg-primary-100 text-primary-600' : 'bg-surface-100 text-muted-color'"
              >
                <i :class="[item.icon, 'text-xl']" />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h3 class="m-0 text-base font-semibold">{{ item.title }}</h3>
                    <p class="mt-1 mb-0 text-sm text-muted-color leading-relaxed">
                      {{ item.description }}
                    </p>
                  </div>

                  <Tag :value="item.enabled ? 'Attivo' : 'Coming soon'" :severity="item.enabled ? 'success' : 'secondary'" />
                </div>

                <div class="mt-5 flex items-center justify-between gap-3">
                  <span class="text-sm text-muted-color">
                    {{ item.locked ? 'Bloccato finché non lo abilitiamo da qui' : 'Sempre disponibile' }}
                  </span>

                  <div v-if="item.locked" class="flex items-center gap-2">
                    <Checkbox
                      :binary="true"
                      :modelValue="item.enabled"
                      @update:modelValue="(value) => toggleFormat(item.format as LockedTournamentFormat, Boolean(value))"
                    />
                    <span class="text-sm font-medium">{{ item.enabled ? 'On' : 'Off' }}</span>
                  </div>

                  <span v-else class="text-sm font-semibold text-primary-600">Sempre attivo</span>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>

    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <h3 class="m-0 text-lg font-semibold">Categorie torneo</h3>
        <Button
          label="Ripristina categorie"
          icon="pi pi-undo"
          severity="secondary"
          text
          @click="featureFlags.resetTournamentCategories()"
        />
      </div>

      <div class="grid gap-4 lg:grid-cols-2">
        <Card
          v-for="item in categoryCards"
          :key="item.category"
          class="overflow-hidden"
          :class="{
            'border-primary-200 bg-primary-50/40': item.enabled,
            'opacity-90': !item.enabled,
          }"
        >
          <template #content>
            <div class="flex items-start gap-4">
              <div
                class="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                :class="item.enabled ? 'bg-primary-100 text-primary-600' : 'bg-surface-100 text-muted-color'"
              >
                <i :class="[item.icon, 'text-xl']" />
              </div>

              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h3 class="m-0 text-base font-semibold">{{ item.title }}</h3>
                    <p class="mt-1 mb-0 text-sm text-muted-color leading-relaxed">
                      {{ item.description }}
                    </p>
                  </div>

                  <Tag :value="item.enabled ? 'Attiva' : 'Coming soon'" :severity="item.enabled ? 'success' : 'secondary'" />
                </div>

                <div class="mt-5 flex items-center justify-between gap-3">
                  <span class="text-sm text-muted-color">
                    {{ item.enabled ? 'Disponibile nel form torneo' : 'Nascosta nelle creazioni' }}
                  </span>

                  <div class="flex items-center gap-2">
                    <Checkbox
                      :binary="true"
                      :modelValue="item.enabled"
                      @update:modelValue="(value) => toggleCategory(item.category, Boolean(value))"
                    />
                    <span class="text-sm font-medium">{{ item.enabled ? 'On' : 'Off' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>
