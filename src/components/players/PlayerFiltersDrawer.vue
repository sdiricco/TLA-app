<script setup lang="ts">
import Button from 'primevue/button'
import Drawer from 'primevue/drawer'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import OrganizationFilter from '@/components/filters/OrganizationFilter.vue'
import type { PlayerSortField, SortOrder } from '@/types'
import type { PlayerFilterOption, PlayerFilters } from './playerFilters'

defineProps<{
  sortFieldOptions: PlayerFilterOption<PlayerSortField>[]
  sortOrderOptions: PlayerFilterOption<SortOrder>[]
}>()

const visible = defineModel<boolean>('visible', { required: true })
const filters = defineModel<PlayerFilters>('filters', { required: true })
defineEmits<{ reset: []; apply: [] }>()
</script>

<template>
  <Drawer v-model:visible="visible" position="right" header="Filtra giocatori" class="w-full! sm:w-104!">
    <div class="flex flex-col gap-5">
      <div class="flex min-w-0 flex-col gap-2">
        <label for="player-club-filter" class="text-xs font-bold text-(--color-text-muted)">
          Club
        </label>
        <InputText
          id="player-club-filter"
          v-model="filters.club"
          placeholder="Es. TC Milano"
          fluid
        />
      </div>

      <div class="flex min-w-0 flex-col gap-2">
        <label for="player-organization-filter" class="text-xs font-bold text-(--color-text-muted)">
          Organizzazione
        </label>
        <OrganizationFilter id="player-organization-filter" v-model="filters.organizationId" />
      </div>

      <div class="flex min-w-0 flex-col gap-2">
        <label for="player-sort-field" class="text-xs font-bold text-(--color-text-muted)">
          Ordina per
        </label>
        <Select
          id="player-sort-field"
          v-model="filters.sortBy"
          :options="sortFieldOptions"
          option-label="label"
          option-value="value"
          fluid
        />
      </div>

      <div class="flex min-w-0 flex-col gap-2">
        <label for="player-sort-order" class="text-xs font-bold text-(--color-text-muted)">
          Direzione
        </label>
        <Select
          id="player-sort-order"
          v-model="filters.sortOrder"
          :options="sortOrderOptions"
          option-label="label"
          option-value="value"
          fluid
        />
      </div>
    </div>

    <template #footer>
      <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-[auto_minmax(0,1fr)]">
        <Button
          label="Azzera"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          @click="$emit('reset')"
        />
        <Button label="Mostra risultati" icon="pi pi-check" @click="$emit('apply')" />
      </div>
    </template>
  </Drawer>
</template>
