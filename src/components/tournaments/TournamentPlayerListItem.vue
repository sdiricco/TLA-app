<script setup lang="ts">
// PrimeVue components and domain types.
import Avatar from 'primevue/avatar'
import Checkbox from 'primevue/checkbox'
import type { Player } from '@/types'
import { getPlayerInitials } from '@/utils/main'

// Public component contract.
defineProps<{
  player: Player
  seed?: number | null
  selectable?: boolean
  selected?: boolean
  disabled?: boolean
}>()

defineEmits<{
  open: []
  selectedChange: [selected: boolean]
}>()
</script>

<template>
  <!------------------------------>
  <!-- Section: Enrolled player -->
  <!------------------------------>
  <article
    class="relative grid min-h-16 cursor-pointer grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] items-center gap-2 overflow-hidden rounded-lg border border-(--color-border) bg-(--color-surface-card) px-2.5 py-2 outline-none transition-colors before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-(--color-border-strong) before:content-[''] focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/20"
    tabindex="0"
    @click="$emit('open')"
    @keydown.enter="$emit('open')"
    @keydown.space.prevent="$emit('open')"
  >
    <span v-if="selectable" class="col-start-1" @click.stop>
      <Checkbox
        :binary="true"
        :model-value="selected"
        :disabled="disabled"
        @update:model-value="$emit('selectedChange', $event)"
      />
    </span>

    <Avatar
      class="col-start-2 size-11!"
      :label="getPlayerInitials(player)"
      :image="player.photo_url ?? undefined"
      shape="square"
    />

    <div class="col-start-3 min-w-0">
      <h3 class="truncate text-base font-semibold">{{ player.name }}</h3>
      <span class="truncate text-xs text-muted-color">{{ player.club || 'Club non specificato' }}</span>
    </div>

    <div class="col-start-4 flex flex-col items-end tabular-nums">
      <span v-if="seed" class="text-xs font-extrabold text-primary">TDS {{ seed }}</span>
      <span v-if="player.ranking" class="text-sm font-extrabold text-muted-color">#{{ player.ranking }}</span>
    </div>

    <span class="col-start-5 grid size-8 place-items-center text-primary">
      <i class="pi pi-chevron-right text-xs" />
    </span>
  </article>
</template>
