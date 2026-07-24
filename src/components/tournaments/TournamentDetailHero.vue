<script setup lang="ts">
// Moment and PrimeVue dependencies.
import moment from 'moment'
import 'moment/locale/it.js'
import Button from 'primevue/button'
import type { MenuItem } from 'primevue/menuitem'
import SplitButton from 'primevue/splitbutton'

// Tournament configuration and domain types.
import { tournamentFormatLabels } from '@/config/tournamentFormats'
import type { TournamentStatus, TournamentWithPlayers } from '@/types'

// Public component contract.
defineProps<{
  tournament: TournamentWithPlayers
  enrolledPlayersCount: number
  canModify: boolean
  canViewAdmin: boolean
  guest: boolean
  updatingStatus: boolean
  downloadingRegulation: boolean
  actions: MenuItem[]
}>()

defineEmits<{
  back: []
  edit: []
  downloadRegulation: []
  statusChange: [status: TournamentStatus]
}>()

// Presentation helpers.
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
  return date ? moment(date).locale('it').format('DD MMM YYYY') : '—'
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value)
}

function phaseFlowLabel(tournament: TournamentWithPlayers): string {
  const counts = [
    tournament.participant_limit ?? tournament.playerIds?.length ?? 0,
    ...(tournament.phases ?? []).map((phase) => phase.output_count),
  ]
  return counts.join(' → ')
}
</script>

<template>
  <!------------------------------>
  <!-- Section: Tournament hero -->
  <!------------------------------>
  <header class="overflow-hidden rounded-lg bg-linear-to-b from-(--color-sidebar-start) to-(--color-sidebar-end) p-4 text-white sm:p-6 lg:p-8">
    <a
      href="/tournaments"
      class="inline-flex items-center gap-2 text-sm font-semibold text-white/65 transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
      @click.prevent="$emit('back')"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
      <span>Tutti i tornei</span>
    </a>

    <div class="mt-3 flex flex-col justify-between gap-4 sm:mt-5 sm:flex-row sm:items-end sm:gap-8">
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white/80">
            <i
              class="size-1.5 rounded-full bg-current"
              :class="tournament.status === 'ongoing' ? 'animate-pulse bg-(--color-accent) motion-reduce:animate-none' : ''"
            />
            {{ statusLabel(tournament.status) }}
          </span>
          <span class="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white/80">
            <i :class="tournament.published ? 'pi pi-eye' : 'pi pi-eye-slash'" />
            {{ tournament.published ? 'Pubblicato' : 'Nascosto' }}
          </span>
        </div>

        <p class="mt-4 hidden text-xs font-extrabold tracking-[0.16em] text-primary-200 sm:block">
          CONTROL ROOM TORNEO
        </p>
        <h1 class="mt-2 truncate text-3xl font-bold leading-tight tracking-tighter sm:text-4xl lg:text-5xl">
          {{ tournament.name }}
        </h1>
        <p class="mt-2 flex items-center gap-2 text-sm text-white/70">
          <i class="pi pi-map-marker" />
          {{ tournament.location || 'Sede da definire' }}
        </p>
      </div>

      <div class="flex w-full shrink-0 gap-2 sm:w-auto sm:justify-end">
        <Button
          v-if="tournament.regulation_name && !guest"
          label="Regolamento"
          icon="pi pi-download"
          size="small"
          severity="secondary"
          :loading="downloadingRegulation"
          @click="$emit('downloadRegulation')"
        />
        <Button
          v-if="canModify && tournament.status === 'upcoming'"
          label="Avvia torneo"
          icon="pi pi-play"
          size="small"
          severity="success"
          :loading="updatingStatus"
          @click="$emit('statusChange', 'ongoing')"
        />
        <SplitButton
          v-if="canViewAdmin"
          label="Modifica torneo"
          icon="pi pi-pencil"
          size="small"
          severity="secondary"
          :model="actions"
          :disabled="guest"
          @click="$emit('edit')"
        />
      </div>
    </div>

    <!------------------------------>
    <!-- Section: Tournament summary -->
    <!------------------------------>
    <div class="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 lg:mt-7 lg:grid-cols-[1.25fr_1fr_0.7fr_0.7fr]">
      <div class="flex min-w-0 items-center gap-2">
        <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-(--color-accent) sm:size-10"><i class="pi pi-calendar" /></span>
        <p class="grid min-w-0 gap-0.5"><small class="text-xs font-extrabold tracking-wide text-white/55">PERIODO</small><strong class="truncate text-sm text-white/90">{{ formatDate(tournament.start_date) }}<template v-if="tournament.end_date"> — {{ formatDate(tournament.end_date) }}</template></strong></p>
      </div>
      <div class="flex min-w-0 items-center gap-2">
        <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-(--color-accent) sm:size-10"><i class="pi pi-sitemap" /></span>
        <p class="grid min-w-0 gap-0.5"><small class="text-xs font-extrabold tracking-wide text-white/55">FORMATO</small><strong class="truncate text-sm text-white/90">{{ tournamentFormatLabels[tournament.format] ?? tournament.format }}</strong></p>
      </div>
      <div class="flex min-w-0 items-center gap-2">
        <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-(--color-accent) sm:size-10"><i class="pi pi-users" /></span>
        <p class="grid min-w-0 gap-0.5"><small class="text-xs font-extrabold tracking-wide text-white/55">PARTECIPANTI</small><strong class="truncate text-sm text-white/90">{{ enrolledPlayersCount }} / {{ tournament.participant_limit || '∞' }}</strong></p>
      </div>
      <div class="flex min-w-0 items-center gap-2">
        <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-(--color-accent) sm:size-10"><i class="pi pi-user" /></span>
        <p class="grid min-w-0 gap-0.5"><small class="text-xs font-extrabold tracking-wide text-white/55">CATEGORIA</small><strong class="truncate text-sm text-white/90">{{ categoryLabels[tournament.category] ?? tournament.category }}</strong></p>
      </div>
    </div>

    <div
      v-if="tournament.registration_start_date || tournament.registration_end_date || tournament.game_formula || tournament.registration_fee != null"
      class="mt-4 hidden flex-wrap gap-2 sm:flex"
    >
      <span v-if="tournament.registration_start_date || tournament.registration_end_date" class="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-2.5 py-1.5 text-xs text-white/50"><i class="pi pi-user-plus" /> Iscrizioni <template v-if="tournament.registration_start_date">dal {{ formatDate(tournament.registration_start_date) }}</template><template v-if="tournament.registration_end_date"> al {{ formatDate(tournament.registration_end_date) }}</template></span>
      <span v-if="tournament.game_formula" class="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-2.5 py-1.5 text-xs text-white/50"><i class="pi pi-list-check" /> {{ tournament.game_formula }}</span>
      <span v-if="tournament.registration_fee != null" class="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-2.5 py-1.5 text-xs text-white/50"><i class="pi pi-euro" /> {{ formatCurrency(tournament.registration_fee) }}</span>
      <span v-if="(tournament.phases?.length ?? 0) > 1" class="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-2.5 py-1.5 text-xs text-white/50"><i class="pi pi-sitemap" /> {{ tournament.phases?.length }} fasi · {{ phaseFlowLabel(tournament) }} giocatori</span>
    </div>
  </header>
</template>
