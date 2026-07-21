<script setup lang="ts">
import moment from 'moment'
import 'moment/locale/it.js'
import { tournamentFormatLabels } from '@/config/tournamentFormats'
import type { Tournament, TournamentStatus } from '@/types'

defineProps<{ tournament: Tournament }>()
defineEmits<{ open: [] }>()

const categoryLabels: Record<string, string> = {
  maschile: 'Maschile',
  femminile: 'Femminile',
  singles: 'Maschile',
  doubles: 'Femminile',
}

function statusLabel(status: TournamentStatus): string {
  return { upcoming: 'In programma', ongoing: 'In corso', completed: 'Completato' }[status]
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return moment(date).locale('it').format('DD MMM YYYY')
}
</script>

<template>
  <article
    class="relative grid min-h-24 cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 overflow-hidden border border-(--color-border) bg-(--color-surface-card) px-3 py-2 outline-none transition-colors before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-primary-500 before:content-[''] hover:border-primary-300 focus-visible:border-primary-500 focus-visible:ring-2 focus-visible:ring-primary-500/20"
    tabindex="0"
    @click="$emit('open')"
    @keydown.enter="$emit('open')"
    @keydown.space.prevent="$emit('open')"
  >
    <div class="col-start-2 row-start-1 flex items-center justify-end">
      <span class="inline-flex items-center gap-1.5 text-xs font-extrabold text-(--color-text-muted)">
        <i
          class="size-1.5 rounded-full bg-current"
          :class="tournament.status === 'ongoing' ? 'animate-pulse bg-primary-500 motion-reduce:animate-none' : ''"
        />
        {{ statusLabel(tournament.status) }}
      </span>
    </div>

    <div class="col-start-1 row-start-1 min-w-0">
      <h3 class="truncate text-base font-bold tracking-tight">{{ tournament.name }}</h3>
      <span v-if="!tournament.published" class="text-xs font-bold text-(--color-text-subtle)">
        Bozza
      </span>
    </div>

    <div class="col-span-full row-start-2 flex items-center gap-1.5">
      <IconifyIcon icon="mdi:calendar-month-outline" class="size-4 shrink-0 text-primary-700" />
      <strong class="text-sm font-semibold text-(--color-text-muted)">
        {{ formatDate(tournament.start_date) }}
        <template v-if="tournament.end_date">— {{ formatDate(tournament.end_date) }}</template>
      </strong>
    </div>

    <div class="col-span-full row-start-3 flex min-w-0 gap-3 text-sm text-(--color-text-muted)">
      <div class="flex min-w-0 items-center gap-1.5">
        <IconifyIcon icon="mdi:account-tree-outline" class="size-4 shrink-0 text-primary-300" />
        <span class="truncate">
          {{ tournamentFormatLabels[tournament.format] ?? tournament.format }}
        </span>
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <IconifyIcon icon="mdi:account-group-outline" class="size-4 shrink-0 text-primary-300" />
        <span class="truncate">
          {{ categoryLabels[tournament.category] ?? tournament.category }}
        </span>
      </div>
    </div>
  </article>
</template>
