<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Drawer from 'primevue/drawer'
import Select from 'primevue/select'
import OrganizationFilter from '@/components/filters/OrganizationFilter.vue'
import type { TournamentCategory, TournamentStatus } from '@/types'
import type { TournamentFilterOption, TournamentFilters } from './tournamentFilters'

const props = defineProps<{
  categoryOptions: TournamentFilterOption<TournamentCategory>[]
  statusOptions: TournamentFilterOption<TournamentStatus>[]
}>()

const visible = defineModel<boolean>('visible', { required: true })
const filters = defineModel<TournamentFilters>('filters', { required: true })
defineEmits<{ reset: []; apply: [] }>()

const selectedCategoryOption = computed(() =>
  props.categoryOptions.find((option) => option.value === filters.value.category)
)
const selectedStatusOption = computed(() =>
  props.statusOptions.find((option) => option.value === filters.value.status)
)
</script>

<template>
  <Drawer v-model:visible="visible" position="right" header="Filtra tornei" class="w-full! sm:w-104!">
    <div class="flex flex-col gap-5">
      <div class="flex min-w-0 flex-col gap-2">
        <label for="tournament-organization-filter" class="text-xs font-bold text-(--color-text-muted)">
          Organizzazione
        </label>
        <OrganizationFilter id="tournament-organization-filter" v-model="filters.organizationId" />
      </div>

      <div class="flex min-w-0 flex-col gap-2">
        <label for="tournament-category-filter" class="text-xs font-bold text-(--color-text-muted)">
          Categoria
        </label>
        <Select
          id="tournament-category-filter"
          v-model="filters.category"
          class="h-11 rounded-none border-(--color-border) bg-(--color-surface-soft) text-sm"
          :options="categoryOptions"
          option-label="label"
          option-value="value"
          fluid
        >
          <template #value>
            <span v-if="selectedCategoryOption" class="flex items-center gap-2">
              <IconifyIcon :icon="selectedCategoryOption.icon" class="shrink-0 text-primary" />
              <span>{{ selectedCategoryOption.label }}</span>
            </span>
          </template>
          <template #option="{ option }">
            <span class="flex items-center gap-2">
              <IconifyIcon :icon="option.icon" class="shrink-0 text-primary" />
              <span>{{ option.label }}</span>
            </span>
          </template>
        </Select>
      </div>

      <div class="flex min-w-0 flex-col gap-2">
        <label for="tournament-status-filter" class="text-xs font-bold text-(--color-text-muted)">
          Stato
        </label>
        <Select
          id="tournament-status-filter"
          v-model="filters.status"
          class="h-11 rounded-none border-(--color-border) bg-(--color-surface-soft) text-sm"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          fluid
        >
          <template #value>
            <span v-if="selectedStatusOption" class="flex items-center gap-2">
              <IconifyIcon :icon="selectedStatusOption.icon" class="shrink-0 text-primary" />
              <span>{{ selectedStatusOption.label }}</span>
            </span>
          </template>
          <template #option="{ option }">
            <span class="flex items-center gap-2">
              <IconifyIcon :icon="option.icon" class="shrink-0 text-primary" />
              <span>{{ option.label }}</span>
            </span>
          </template>
        </Select>
      </div>

      <div class="flex min-w-0 flex-col gap-2">
        <label for="tournament-date-range-filter" class="text-xs font-bold text-(--color-text-muted)">
          Periodo
        </label>
        <DatePicker
          id="tournament-date-range-filter"
          v-model="filters.dateRange"
          class="w-full"
          input-class="h-11 rounded-none border-[var(--color-border)] bg-[var(--color-surface-soft)] text-sm"
          selection-mode="range"
          date-format="dd/mm/yy"
          placeholder="Dal — Al"
          show-icon
          show-button-bar
          fluid
        />
      </div>
    </div>

    <template #footer>
      <div class="grid grid-cols-1 gap-2.5 sm:grid-cols-[auto_minmax(0,1fr)]">
        <Button
          class="justify-center rounded-none"
          label="Azzera"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          @click="$emit('reset')"
        />
        <Button
          class="justify-center rounded-none"
          label="Mostra risultati"
          icon="pi pi-check"
          @click="$emit('apply')"
        />
      </div>
    </template>
  </Drawer>
</template>
