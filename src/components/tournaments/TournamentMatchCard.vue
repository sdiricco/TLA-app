<script setup lang="ts">
// PrimeVue components and domain types.
import Avatar from 'primevue/avatar'
import type { Match, MatchSlot, Player } from '@/types'
import { getPlayerInitials } from '@/utils/main'

// Public component contract.
const props = defineProps<{
  match: Match
  playersById: Map<string, Player>
  seedsByPlayerId: Map<string, number>
  heading?: string
  showPendingStatus?: boolean
}>()

defineEmits<{ open: [] }>()

// Match presentation helpers.
function player(slot: MatchSlot): Player | null {
  const playerId = props.match[slot]
  return playerId ? props.playersById.get(playerId) ?? null : null
}

function seed(slot: MatchSlot): number | null {
  const playerId = props.match[slot]
  return playerId ? props.seedsByPlayerId.get(playerId) ?? null : null
}

function isBye(slot: MatchSlot): boolean {
  return !props.match[slot] && props.match.status === 'completed' && props.match.result === 'BYE'
}

function isEmpty(slot: MatchSlot): boolean {
  return !props.match[slot] && !isBye(slot)
}

function slotLabel(slot: MatchSlot): string {
  if (player(slot)) return player(slot)?.name ?? 'Giocatore sconosciuto'
  return isBye(slot) ? 'BYE' : 'TBD'
}

function isWinner(slot: MatchSlot): boolean {
  return Boolean(props.match.winner_id && props.match.winner_id === props.match[slot])
}
</script>

<template>
  <!------------------------------>
  <!-- Section: Match card -->
  <!------------------------------>
  <article
    class="flex min-h-32 cursor-pointer flex-col overflow-hidden border border-surface-200 bg-surface-0 outline-none transition-colors hover:border-primary-300 focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/20"
    tabindex="0"
    @click="$emit('open')"
    @keydown.enter="$emit('open')"
    @keydown.space.prevent="$emit('open')"
  >
    <header class="flex min-h-8 items-center justify-between gap-3 border-b border-surface-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-muted-color">
      <span>{{ heading }}</span>
      <span v-if="match.result" class="text-primary-700">{{ match.result }}</span>
      <span v-else-if="showPendingStatus">Da giocare</span>
    </header>

    <div
      v-for="slot in (['player1_id', 'player2_id'] as MatchSlot[])"
      :key="slot"
      class="flex flex-1 items-center justify-between gap-2 px-3 py-2 text-(--color-text) first:border-0 last:border-t last:border-surface-100"
      :class="{
        'bg-primary-50': isWinner(slot),
        'text-muted-color': isBye(slot) || isEmpty(slot),
      }"
    >
      <div class="flex min-w-0 items-center gap-2">
        <Avatar
          v-if="player(slot)"
          class="size-8! shrink-0 rounded-none! bg-surface-50! text-xs! text-muted-color!"
          :label="getPlayerInitials(player(slot)!)"
          :image="player(slot)?.photo_url ?? undefined"
          shape="square"
        />
        <span v-else class="size-8 shrink-0 bg-surface-50" />
        <div class="flex min-w-0 flex-col">
          <span class="truncate text-sm" :class="{ 'font-bold': seed(slot) }">{{ slotLabel(slot) }}</span>
          <span v-if="seed(slot)" class="text-xs font-semibold uppercase tracking-wide text-muted-color">Seed {{ seed(slot) }}</span>
        </div>
      </div>
      <i v-if="isWinner(slot)" class="pi pi-check text-sm text-primary-600" />
    </div>
  </article>
</template>
