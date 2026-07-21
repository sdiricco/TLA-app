<script setup lang="ts">
import Avatar from 'primevue/avatar'
import type { Player } from '@/types'
import { getPlayerInitials } from '@/utils/main'

defineProps<{ player: Player }>()
defineEmits<{ open: [] }>()
</script>

<template>
  <!------------------------------>
  <!-- Section: Player list item -->
  <!------------------------------>
  <article
    class="relative grid min-h-16 cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 overflow-hidden border border-(--color-border) bg-(--color-surface-card) px-3 py-2 outline-none transition-colors before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-(--color-border-strong) before:content-[''] hover:border-primary-300 focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/20"
    tabindex="0"
    @click="$emit('open')"
    @keydown.enter="$emit('open')"
    @keydown.space.prevent="$emit('open')"
  >
    <Avatar
      class="size-11! rounded-none! bg-surface-100! text-sm! text-muted-color!"
      :label="getPlayerInitials(player)"
      :image="player.photo_url ?? undefined"
      shape="square"
    />
    <div class="min-w-0">
      <h3 class="truncate font-semibold">{{ player.name }}</h3>
      <span class="block truncate text-xs text-(--color-text-muted)">{{ player.club || 'Club non specificato' }}</span>
    </div>
    <strong v-if="player.ranking" class="text-sm text-(--color-text-muted)">#{{ player.ranking }}</strong>
    <i class="pi pi-chevron-right text-xs text-primary-700" aria-hidden="true" />
  </article>
</template>
