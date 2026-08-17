<script setup lang="ts">
// Moment and PrimeVue dependencies.
import { computed, ref } from 'vue'
import moment from 'moment'
import 'moment/locale/it.js'
import { RouterLink } from 'vue-router'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import type { MenuItem } from 'primevue/menuitem'

// Tournament configuration and domain types.
import { tournamentFormatLabels } from '@/config/tournamentFormats'
import type { TournamentStatus, TournamentWithPlayers } from '@/types'

// Public component contract.
const props = defineProps<{
  tournament: TournamentWithPlayers
  enrolledPlayersCount: number
  canViewAdmin: boolean
  updatingStatus: boolean
  updatingVisibility: boolean
}>()

const emit = defineEmits<{
  statusChange: [status: TournamentStatus]
  visibilityChange: []
}>()

const statusMenu = ref<{ toggle: (event: Event) => void } | null>(null)
const statusOptions: Array<{ label: string; value: TournamentStatus; icon: string }> = [
  { label: 'In programma', value: 'upcoming', icon: 'pi pi-clock' },
  { label: 'In corso', value: 'ongoing', icon: 'pi pi-play-circle' },
  { label: 'Completato', value: 'completed', icon: 'pi pi-check-circle' },
]
const statusItems = computed<MenuItem[]>(() => statusOptions.map((option) => ({
  label: option.label,
  icon: props.tournament.status === option.value ? 'pi pi-check' : option.icon,
  disabled: props.updatingStatus || props.tournament.status === option.value,
  command: () => emit('statusChange', option.value),
})))

function toggleStatusMenu(event: Event): void {
  statusMenu.value?.toggle(event)
}

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
  <header class="overflow-hidden rounded-lg bg-linear-to-b from-(--color-sidebar-start) to-(--color-sidebar-end) p-4 text-white sm:p-6 lg:p-8">
    <div class="min-w-0">
      <h1 class="truncate text-3xl font-bold leading-tight tracking-tighter sm:text-4xl lg:text-5xl">
        {{ tournament.name }}
      </h1>
      <div class="mt-2 grid gap-1.5 text-sm text-white/70">
        <p class="flex items-center gap-2">
          <i class="pi pi-map-marker" />
          {{ tournament.location || 'Sede da definire' }}
        </p>
        <RouterLink
          v-if="tournament.organizer"
          :to="{ name: 'organizer-profile', params: { id: tournament.organizer.id } }"
          class="flex w-fit items-center gap-2 rounded-sm text-white/70 no-underline transition-colors hover:text-(--color-accent) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <i class="pi pi-user" />
          <span>Organizzato da <strong class="font-semibold text-white/90">{{ tournament.organizer.name }}</strong></span>
        </RouterLink>
      </div>
    </div>

    <!------------------------------>
    <!-- Section: Tournament state controls -->
    <!------------------------------>
    <div class="mt-5 grid w-full gap-2 sm:max-w-[50%]">
      <div class="flex min-h-14 items-center gap-3 rounded-lg bg-white/10 px-3 py-2">
        <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-(--color-accent)">
          <i class="pi" :class="tournament.status === 'ongoing' ? 'pi-play-circle' : tournament.status === 'completed' ? 'pi-check-circle' : 'pi-clock'" />
        </span>
        <p class="grid min-w-0 flex-1 gap-0.5">
          <small class="text-[0.65rem] font-extrabold uppercase tracking-wider text-white/55">Stato torneo</small>
          <strong class="truncate text-sm text-white/90">{{ statusLabel(tournament.status) }}</strong>
        </p>
        <Button
          v-if="canViewAdmin"
          :label="updatingStatus ? 'Aggiornamento…' : 'Cambia stato'"
          icon="pi pi-chevron-down"
          icon-pos="right"
          size="small"
          text
          class="shrink-0 border-transparent! bg-transparent! px-1! py-1! text-(--color-accent)! shadow-none! hover:bg-transparent!"
          :disabled="updatingStatus"
          aria-haspopup="true"
          aria-controls="tournament-status-menu"
          @click="toggleStatusMenu"
        />
        <Menu id="tournament-status-menu" ref="statusMenu" :model="statusItems" popup />
      </div>

      <div class="flex min-h-14 items-center gap-3 rounded-lg bg-white/10 px-3 py-2">
        <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-(--color-accent)">
          <i :class="tournament.published ? 'pi pi-eye' : 'pi pi-eye-slash'" />
        </span>
        <p class="grid min-w-0 flex-1 gap-0.5">
          <small class="text-[0.65rem] font-extrabold uppercase tracking-wider text-white/55">Visibilità</small>
          <strong class="truncate text-sm text-white/90">{{ tournament.published ? 'Pubblicato' : 'Nascosto' }}</strong>
        </p>
        <Button
          v-if="canViewAdmin"
          :label="updatingVisibility ? 'Aggiornamento…' : tournament.published ? 'Nascondi' : 'Pubblica'"
          :icon="tournament.published ? 'pi pi-eye-slash' : 'pi pi-eye'"
          size="small"
          text
          class="shrink-0 border-transparent! bg-transparent! px-1! py-1! text-(--color-accent)! shadow-none! hover:bg-transparent!"
          :disabled="updatingVisibility"
          @click="$emit('visibilityChange')"
        />
      </div>
    </div>

    <!------------------------------>
    <!-- Section: Tournament summary -->
    <!------------------------------>
    <div class="mt-4 grid grid-cols-2 gap-3 border-t border-white/10 pt-4 lg:mt-7 lg:grid-cols-[1.25fr_1fr_0.7fr_0.7fr]">
      <div class="flex min-w-0 items-center gap-2 p-2">
        <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-(--color-accent) sm:size-10"><i class="pi pi-calendar" /></span>
        <p class="grid min-w-0 gap-0.5"><small class="text-xs font-extrabold tracking-wide text-white/55">PERIODO</small><strong class="truncate text-sm text-white/90">{{ formatDate(tournament.start_date) }}<template v-if="tournament.end_date"> — {{ formatDate(tournament.end_date) }}</template></strong></p>
      </div>
      <div class="flex min-w-0 items-center gap-2 p-2">
        <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-(--color-accent) sm:size-10"><i class="pi pi-sitemap" /></span>
        <p class="grid min-w-0 gap-0.5"><small class="text-xs font-extrabold tracking-wide text-white/55">FORMATO</small><strong class="truncate text-sm text-white/90">{{ tournamentFormatLabels[tournament.format] ?? tournament.format }}</strong></p>
      </div>
      <RouterLink
        :to="{ name: 'tournament-players', params: { id: tournament.id } }"
        class="group flex min-w-0 items-center gap-2 rounded-lg p-2 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        :aria-label="`Apri i ${enrolledPlayersCount} giocatori iscritti`"
      >
        <span class="grid size-8 shrink-0 place-items-center rounded-lg bg-white/10 text-(--color-accent) sm:size-10"><i class="pi pi-users" /></span>
        <p class="grid min-w-0 flex-1 gap-0.5"><small class="text-xs font-extrabold tracking-wide text-white/55">PARTECIPANTI</small><strong class="truncate text-sm text-white/90">{{ enrolledPlayersCount }} / {{ tournament.participant_limit || '∞' }}</strong></p>
        <i class="pi pi-chevron-right text-xs text-white/35 transition-transform group-hover:translate-x-0.5 group-hover:text-white/70" aria-hidden="true" />
      </RouterLink>
      <div class="flex min-w-0 items-center gap-2 p-2">
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
      <span v-if="(tournament.phases?.length ?? 0) > 1" class="inline-flex items-center gap-1.5 rounded-full bg-black/10 px-2.5 py-1.5 text-xs text-white/50"><i class="pi pi-sitemap" /> {{ tournament.phases?.length }} fasi</span>
    </div>
  </header>
</template>
