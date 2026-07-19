<script setup lang="ts">
import Select from 'primevue/select'
import { computed } from 'vue'
import { useOrganizationsStore } from '../../stores/organizations'
import type { OrganizationFilter } from '../../types'

const model = defineModel<OrganizationFilter>({ default: 'mine' })
const organizations = useOrganizationsStore()

const options = computed(() => [
  { label: 'I miei contenuti', value: 'mine' as OrganizationFilter },
  { label: 'Solo contenuti globali', value: 'global' as OrganizationFilter },
  ...organizations.organizations.map((organization) => ({ label: organization.name, value: organization.id })),
])
</script>

<template>
  <Select v-model="model" :options="options" option-label="label" option-value="value" fluid />
</template>
