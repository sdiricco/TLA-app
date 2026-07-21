<script setup lang="ts">
// Vue, Moment and PrimeVue dependencies.
import { ref } from 'vue'
import moment from 'moment'
import 'moment/locale/it.js'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import type { MenuItem } from 'primevue/menuitem'

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
  actions: MenuItem[]
}>()

defineEmits<{
  back: []
  edit: []
  statusChange: [status: TournamentStatus]
}>()

// Local menu state.
const actionsMenu = ref<{ toggle: (event: Event) => void } | null>(null)

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
</script>

<template>
  <!------------------------------>
  <!-- Section: Tournament hero -->
  <!------------------------------>
  <header class="overflow-hidden bg-primary-800 p-4 text-white shadow-lg sm:p-6 lg:p-8">
    <Button
      class="-ml-3 rounded-none text-xs! text-white/60! hover:text-white!"
      label="Tutti i tornei"
      icon="pi pi-arrow-left"
      text
      @click="$emit('back')"
    />

    <div class="mt-3 flex flex-col justify-between gap-4 lg:mt-5 lg:flex-row lg:items-start lg:gap-8">
      <div class="min-w-0">
        <div class="flex flex-wrap gap-2">
          <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white/75">
            <i
              class="size-1.5 rounded-full bg-current"
              :class="tournament.status === 'ongoing' ? 'animate-pulse bg-(--color-accent) motion-reduce:animate-none' : ''"
            />
            {{ statusLabel(tournament.status) }}
          </span>
          <span class="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white/75">
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
        <p class="mt-2 flex items-center gap-2 text-sm text-white/60">
          <i class="pi pi-map-marker" />
          {{ tournament.location || 'Sede da definire' }}
        </p>
      </div>

      <div class="flex w-full gap-2 overflow-x-auto pb-1 lg:w-auto lg:max-w-md lg:flex-wrap lg:justify-end">
        <Button
          v-if="canModify && tournament.status === 'upcoming'"
          class="h-10 shrink-0 rounded-none border-(--color-accent)! bg-(--color-accent)! font-extrabold text-(--color-sidebar-on-accent)!"
          label="Avvia torneo"
          icon="pi pi-play"
          size="small"
          :loading="updatingStatus"
          @click="$emit('statusChange', 'ongoing')"
        />
        <Button
          v-if="canModify && tournament.status === 'ongoing'"
          class="h-10 shrink-0 rounded-none"
          label="Chiudi torneo"
          icon="pi pi-check"
          size="small"
          :loading="updatingStatus"
          @click="$emit('statusChange', 'completed')"
        />
        <Button
          v-if="canViewAdmin"
          class="h-10 shrink-0 rounded-none border-white/20! bg-white/10! text-white!"
          label="Modifica"
          icon="pi pi-pencil"
          size="small"
          outlined
          :disabled="guest"
          @click="$emit('edit')"
        />
        <Button
          v-if="canViewAdmin"
          class="size-10 shrink-0 rounded-none border-white/20! bg-white/10! p-0! text-white!"
          icon="pi pi-ellipsis-h"
          size="small"
          outlined
          aria-label="Altre azioni"
          aria-haspopup="true"
          :disabled="guest"
          @click="actionsMenu?.toggle($event)"
        />
        <Menu ref="actionsMenu" :model="actions" popup />
      </div>
    </div>

    <!------------------------------>
    <!-- Section: Tournament summary -->
    <!------------------------------>
    <div class="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 lg:mt-7 lg:grid-cols-[1.25fr_1fr_0.7fr_0.7fr]">
      <div class="flex min-w-0 items-center gap-2">
        <span class="grid size-8 shrink-0 place-items-center bg-white/10 text-(--color-accent) sm:size-10"><i class="pi pi-calendar" /></span>
        <p class="grid min-w-0 gap-0.5"><small class="text-xs font-extrabold tracking-wide text-white/40">PERIODO</small><strong class="truncate text-sm text-white/85">{{ formatDate(tournament.start_date) }}<template v-if="tournament.end_date"> — {{ formatDate(tournament.end_date) }}</template></strong></p>
      </div>
      <div class="flex min-w-0 items-center gap-2">
        <span class="grid size-8 shrink-0 place-items-center bg-white/10 text-(--color-accent) sm:size-10"><i class="pi pi-sitemap" /></span>
        <p class="grid min-w-0 gap-0.5"><small class="text-xs font-extrabold tracking-wide text-white/40">FORMATO</small><strong class="truncate text-sm text-white/85">{{ tournamentFormatLabels[tournament.format] ?? tournament.format }}</strong></p>
      </div>
      <div class="flex min-w-0 items-center gap-2">
        <span class="grid size-8 shrink-0 place-items-center bg-white/10 text-(--color-accent) sm:size-10"><i class="pi pi-users" /></span>
        <p class="grid min-w-0 gap-0.5"><small class="text-xs font-extrabold tracking-wide text-white/40">PARTECIPANTI</small><strong class="truncate text-sm text-white/85">{{ enrolledPlayersCount }} / {{ tournament.participant_limit || '∞' }}</strong></p>
      </div>
      <div class="flex min-w-0 items-center gap-2">
        <span class="grid size-8 shrink-0 place-items-center bg-white/10 text-(--color-accent) sm:size-10"><i class="pi pi-user" /></span>
        <p class="grid min-w-0 gap-0.5"><small class="text-xs font-extrabold tracking-wide text-white/40">CATEGORIA</small><strong class="truncate text-sm text-white/85">{{ categoryLabels[tournament.category] ?? tournament.category }}</strong></p>
      </div>
    </div>

    <div
      v-if="tournament.registration_start_date || tournament.registration_end_date || tournament.game_formula || tournament.registration_fee != null"
      class="mt-4 hidden flex-wrap gap-2 sm:flex"
    >
      <span v-if="tournament.registration_start_date || tournament.registration_end_date" class="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-2.5 py-1.5 text-xs text-white/50"><i class="pi pi-user-plus" /> Iscrizioni <template v-if="tournament.registration_start_date">dal {{ formatDate(tournament.registration_start_date) }}</template><template v-if="tournament.registration_end_date"> al {{ formatDate(tournament.registration_end_date) }}</template></span>
      <span v-if="tournament.game_formula" class="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-2.5 py-1.5 text-xs text-white/50"><i class="pi pi-list-check" /> {{ tournament.game_formula }}</span>
      <span v-if="tournament.registration_fee != null" class="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-2.5 py-1.5 text-xs text-white/50"><i class="pi pi-euro" /> {{ formatCurrency(tournament.registration_fee) }}</span>
      <span v-if="tournament.format === 'round_robin_elimination'" class="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-2.5 py-1.5 text-xs text-white/50"><i class="pi pi-sitemap" /> {{ tournament.group_count ?? '—' }} gironi · {{ tournament.qualifiers_per_group ?? '—' }} qualificati/girone</span>
    </div>
  </header>
</template>
