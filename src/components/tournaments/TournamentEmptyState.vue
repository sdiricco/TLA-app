<script setup lang="ts">
import Button from 'primevue/button'

defineProps<{
  filtered: boolean
  canCreate: boolean
}>()

defineEmits<{
  reset: []
  create: []
}>()
</script>

<template>
  <div
    class="flex min-h-72 flex-col items-center justify-center border border-dashed border-(--color-border) bg-(--color-surface-card) px-5 py-10 text-center"
  >
    <span class="grid size-14 place-items-center rounded-full bg-primary-50 text-primary">
      <IconifyIcon icon="mdi:trophy-outline" class="size-6" />
    </span>
    <h3 class="mb-1 mt-4 text-lg font-bold">
      {{ filtered ? 'Nessun torneo corrisponde ai filtri selezionati' : 'Nessun torneo disponibile' }}
    </h3>
    <p class="max-w-md text-sm text-(--color-text-muted)">
      {{ filtered ? 'Prova ad ampliare la ricerca o ad azzerare i filtri.' : 'Crea la prima competizione della tua organizzazione.' }}
    </p>
    <div v-if="filtered || canCreate" class="mt-5 flex flex-wrap justify-center gap-2">
      <Button
        v-if="filtered"
        label="Azzera filtri"
        icon="pi pi-filter-slash"
        severity="secondary"
        outlined
        @click="$emit('reset')"
      />
      <Button
        v-if="canCreate"
        label="Crea un torneo"
        icon="pi pi-plus"
        @click="$emit('create')"
      />
    </div>
  </div>
</template>
