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
    class="group relative grid min-h-32 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2.5 overflow-hidden rounded-lg border border-(--color-border) bg-(--color-surface-card) px-4 py-4 transition-colors before:absolute before:inset-y-0 before:left-0 before:w-1 before:content-[''] focus-within:border-primary-500 focus-within:ring-2 focus-within:ring-primary-500/20 sm:px-5"
    :class="tournament.published ? 'before:bg-primary-500' : 'before:bg-amber-400'"
  >
    <button
      type="button"
      class="absolute inset-0 z-10 cursor-pointer focus:outline-none"
      :aria-label="`Apri il torneo ${tournament.name}`"
      @click="$emit('open')"
    />

    <div class="col-start-2 row-start-1 flex items-center justify-end">
      <span
        class="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-extrabold"
        :class="
          tournament.status === 'ongoing'
            ? 'text-primary'
            : 'text-(--color-text-muted)'
        "
      >
        <i
          class="size-1.5 rounded-full bg-current"
          :class="tournament.status === 'ongoing' ? 'animate-pulse bg-primary-500 motion-reduce:animate-none' : ''"
        />
        {{ statusLabel(tournament.status) }}
      </span>
    </div>

    <div class="col-start-1 row-start-1 min-w-0">
      <h3 class="truncate text-base font-bold tracking-tight">{{ tournament.name }}</h3>
    </div>

    <div
      class="col-span-full row-start-3 flex min-w-0 gap-4 text-sm text-(--color-text-muted)"
    >
      <div class="flex min-w-0 items-center gap-1.5">
        <i class="pi pi-sitemap shrink-0 text-sm text-primary" aria-hidden="true" />
        <span class="truncate">
          {{ tournamentFormatLabels[tournament.format] ?? tournament.format }}
        </span>
      </div>
      <div class="flex min-w-0 items-center gap-1.5">
        <IconifyIcon icon="mdi:account-group-outline" class="size-4 shrink-0 text-primary-600" />
        <span class="truncate">
          {{ categoryLabels[tournament.category] ?? tournament.category }}
        </span>
      </div>
    </div>

    <div
      class="col-span-full row-start-2 flex items-center gap-1.5"
    >
      <IconifyIcon icon="mdi:calendar-month-outline" class="size-4 shrink-0 text-primary" />
      <strong class="text-sm font-semibold text-(--color-text-muted)">
        {{ formatDate(tournament.start_date) }}
        <template v-if="tournament.end_date">— {{ formatDate(tournament.end_date) }}</template>
      </strong>
    </div>

  </article>
</template>
