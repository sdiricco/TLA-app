<script setup lang="ts">
import Select from 'primevue/select'
import { computed } from 'vue'
import { useOrganizationsStore } from '../../stores/organizations'
import type { OrganizationFilter } from '../../types'

const model = defineModel<OrganizationFilter>({ default: 'mine' })
const organizations = useOrganizationsStore()

const options = computed(() => [
  { label: 'I miei contenuti', value: 'mine' as OrganizationFilter, icon: 'mdi:account-group-outline' },
  { label: 'Solo contenuti globali', value: 'global' as OrganizationFilter, icon: 'mdi:earth' },
  ...organizations.organizations.map((organization) => ({
    label: organization.name,
    value: organization.id,
    icon: 'mdi:office-building-outline',
  })),
])

const selectedOption = computed(() => options.value.find((option) => option.value === model.value))
</script>

<template>
  <Select v-model="model" :options="options" option-label="label" option-value="value" fluid>
    <template #value="{ placeholder }">
      <span v-if="selectedOption" class="flex items-center gap-2">
        <IconifyIcon :icon="selectedOption.icon" class="shrink-0 text-primary" />
        <span>{{ selectedOption.label }}</span>
      </span>
      <span v-else>{{ placeholder }}</span>
    </template>
    <template #option="{ option }">
      <span class="flex items-center gap-2">
        <IconifyIcon :icon="option.icon" class="shrink-0 text-primary" />
        <span>{{ option.label }}</span>
      </span>
    </template>
  </Select>
</template>
