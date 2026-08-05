<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Drawer from 'primevue/drawer'
import Select from 'primevue/select'
import OrganizationFilter from '@/components/filters/OrganizationFilter.vue'
import type { TournamentCategory } from '@/types'
import type { TournamentFilterOption, TournamentFilters } from './tournamentFilters'

const props = defineProps<{
  categoryOptions: TournamentFilterOption<TournamentCategory>[]
}>()

const visible = defineModel<boolean>('visible', { required: true })
const filters = defineModel<TournamentFilters>('filters', { required: true })
defineEmits<{ reset: []; apply: [] }>()

const selectedCategoryOption = computed(() =>
  props.categoryOptions.find((option) => option.value === filters.value.category)
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
          :options="categoryOptions"
          option-label="label"
          option-value="value"
          fluid
        >
          <template #value>
            <span v-if="selectedCategoryOption" class="flex items-center gap-2">
              <IconifyIcon :icon="selectedCategoryOption.icon" class="shrink-0" />
              <span>{{ selectedCategoryOption.label }}</span>
            </span>
          </template>
          <template #option="{ option }">
            <span class="flex items-center gap-2">
              <IconifyIcon :icon="option.icon" class="shrink-0" />
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
          label="Azzera"
          icon="pi pi-refresh"
          severity="secondary"
          outlined
          @click="$emit('reset')"
        />
        <Button
          label="Mostra risultati"
          icon="pi pi-check"
          @click="$emit('apply')"
        />
      </div>
    </template>
  </Drawer>
</template>
