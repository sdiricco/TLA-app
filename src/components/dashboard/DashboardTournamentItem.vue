<script setup lang="ts">
import moment from 'moment'
import 'moment/locale/it.js'
import Tag from 'primevue/tag'
import { tournamentFormatLabels } from '@/config/tournamentFormats'
import type { Tournament, TournamentStatus } from '@/types'

defineProps<{ tournament: Tournament }>()

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Data da definire'
  const date = moment(value, moment.ISO_8601, true)
  return date.isValid() ? date.locale('it').format('D MMM YYYY') : 'Data da definire'
}

function statusLabel(status: TournamentStatus): string {
  return { upcoming: 'In programma', ongoing: 'In corso', completed: 'Completato' }[status]
}

function statusSeverity(status: TournamentStatus): 'success' | 'info' | 'secondary' {
  if (status === 'ongoing') return 'success'
  if (status === 'upcoming') return 'info'
  return 'secondary'
}
</script>

<template>
  <RouterLink
    :to="{ name: 'tournament-detail', params: { id: tournament.id } }"
    class="group grid min-h-20 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-(--color-border) px-4 py-3.5 text-inherit no-underline transition-colors last:border-b-0 hover:bg-(--color-surface-soft) focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary sm:px-5"
  >
    <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary" aria-hidden="true">
      <i :class="tournament.status === 'ongoing' ? 'pi pi-play-circle' : 'pi pi-calendar'" />
    </span>
    <span class="grid min-w-0 gap-1">
      <strong class="truncate text-sm transition-colors group-hover:text-primary sm:text-base">{{ tournament.name }}</strong>
      <small class="flex min-w-0 items-center gap-1.5 truncate text-xs text-(--color-text-muted)">
        <span class="truncate">{{ formatDate(tournament.start_date) }}</span>
        <span aria-hidden="true">·</span>
        <span class="truncate">{{ tournamentFormatLabels[tournament.format] ?? tournament.format }}</span>
      </small>
    </span>
    <span class="flex items-center gap-2">
      <Tag class="hidden sm:inline-flex" :value="statusLabel(tournament.status)" :severity="statusSeverity(tournament.status)" />
      <i class="pi pi-chevron-right text-xs text-(--color-text-subtle) transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
    </span>
  </RouterLink>
</template>
