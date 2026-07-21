<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import moment from 'moment'
import 'moment/locale/it.js'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'
import { useMatchesStore } from '@/stores/matches'
import { usePlayersStore } from '@/stores/players'
import { useTournamentsStore } from '@/stores/tournaments'
import type { Match, Player, TournamentWithPlayers } from '@/types'
import { getPlayerInitials } from '@/utils/main'

// Route services, stores and editable result state.
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tournamentsStore = useTournamentsStore()
const playersStore = usePlayersStore()
const matchesStore = useMatchesStore()
const toast = useToast()
const tournament = ref<TournamentWithPlayers | null>(null)
const enrolledPlayers = ref<Player[]>([])
const loading = ref(true)
const savingResult = ref(false)
const resultValue = ref('')
const winnerId = ref<string | null>(null)

// Derived match and player data used by the arena.
const canModify = computed(() => auth.isAdmin && !auth.isGuest)
const match = computed<Match | null>(() =>
  matchesStore.matches.find((entry) => entry.id === route.params['matchId']) ?? null,
)
const hasBye = computed(() => Boolean(match.value && (!match.value.player1_id || !match.value.player2_id)))
const playerById = computed(() => new Map(enrolledPlayers.value.map((player) => [player.id, player])))
const player1 = computed(() => match.value?.player1_id ? playerById.value.get(match.value.player1_id) ?? null : null)
const player2 = computed(() => match.value?.player2_id ? playerById.value.get(match.value.player2_id) ?? null : null)
const effectiveWinnerId = computed(() => match.value?.winner_id ?? null)
const roundLabel = computed(() =>
  matchesStore.rounds.find((round) => round.index === match.value?.round_index)?.name ?? 'Turno',
)
const arenaPlayers = computed(() => match.value ? [
  { id: match.value.player1_id, player: player1.value },
  { id: match.value.player2_id, player: player2.value },
] : [])

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = moment(value, moment.ISO_8601, true)
  return date.isValid() ? date.locale('it').format('DD MMM YYYY') : '—'
}

function formatAge(value: string | null | undefined): string {
  if (!value) return '—'
  const date = moment(value, moment.ISO_8601, true)
  return date.isValid() ? `${moment().diff(date, 'years')} anni` : '—'
}

function getSlotName(playerId: string | null): string {
  if (!playerId) return 'TBD'
  return playerById.value.get(playerId)?.name ?? 'Giocatore non trovato'
}

// Tournament, draw and enrolled-player metadata are loaded together for the route.
async function loadPage(): Promise<void> {
  loading.value = true
  try {
    const tournamentId = route.params['id'] as string
    const loadedTournament = await tournamentsStore.getById(tournamentId)
    tournament.value = loadedTournament
    await matchesStore.loadForTournament(tournamentId)
    const enrolledIds = [...(loadedTournament.tournament_players ?? [])]
      .sort((left, right) => (left.seed ?? Number.MAX_SAFE_INTEGER) - (right.seed ?? Number.MAX_SAFE_INTEGER))
      .map((entry) => entry.player_id)
    const loadedPlayers = await Promise.all(enrolledIds.map(async (playerId) => {
      try { return await playersStore.getById(playerId) } catch { return null }
    }))
    enrolledPlayers.value = loadedPlayers.filter((player): player is Player => Boolean(player))
    if (!match.value) throw new Error('Match not found')
    resultValue.value = match.value.result ?? ''
    winnerId.value = match.value.winner_id
  } catch {
    toast.add({ severity: 'error', summary: 'Errore', detail: 'Match non trovato', life: 3000 })
    await router.push({ name: 'tournament-detail', params: { id: route.params['id'] as string } })
  } finally {
    loading.value = false
  }
}

async function saveResult(): Promise<void> {
  if (!canModify.value || !match.value || !resultValue.value || !winnerId.value) return
  savingResult.value = true
  try {
    await matchesStore.enterResult(match.value.id, { result: resultValue.value, winner_id: winnerId.value })
    await loadPage()
    toast.add({ severity: 'success', summary: 'Salvato', detail: 'Risultato aggiornato', life: 3000 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    savingResult.value = false
  }
}

watch(() => [route.params['id'], route.params['matchId']], loadPage, { immediate: true })
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <div class="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 text-(--color-text) sm:gap-6">
    <!-- Section: Header -->
    <header class="flex items-end justify-between gap-4">
      <div>
        <Button class="-ml-3 mb-2" label="Torna al torneo" icon="pi pi-arrow-left" text severity="secondary" @click="router.push({ name: 'tournament-detail', params: { id: route.params['id'] } })" />
        <p class="mb-2 hidden text-xs font-extrabold tracking-[0.16em] text-primary-700 sm:block">MATCH CENTER</p>
        <h1 class="text-3xl font-bold tracking-tight sm:text-5xl">Dettaglio incontro</h1>
        <p v-if="tournament && match" class="mt-3 hidden text-(--color-text-muted) sm:block">{{ tournament.name }} · {{ roundLabel }}</p>
      </div>
      <span v-if="match" class="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-extrabold uppercase" :class="match.status === 'completed' ? 'bg-primary-50 text-primary-700' : 'bg-(--color-surface-muted) text-(--color-text-muted)'"><i class="size-1.5 rounded-full bg-current" />{{ match.status === 'completed' ? 'Completato' : 'Da giocare' }}</span>
    </header>

    <div v-if="loading" class="flex min-h-90 flex-col items-center justify-center gap-3 text-xs text-(--color-text-muted)" role="status"><ProgressSpinner class="size-9" stroke-width="4" /><span>Prepariamo il match…</span></div>

    <template v-else-if="match">
      <!------------------------------>
      <!-- Section: Match arena -->
      <!------------------------------>
      <section class="overflow-hidden bg-linear-to-br from-primary-900 to-primary-800 p-4 text-white shadow-xl sm:p-8">
        <div class="flex items-center justify-between gap-4 border-b border-white/10 pb-4 text-xs font-bold text-white/50"><span class="flex items-center gap-2"><i class="pi pi-calendar" /> {{ roundLabel }}</span><strong v-if="match.result" class="rounded-full bg-(--color-accent) px-3 py-1.5 text-(--color-sidebar-on-accent)">{{ match.result }}</strong><span v-else>Risultato da inserire</span></div>

        <div class="grid items-center gap-4 py-5 md:grid-cols-[1fr_auto_1fr] md:gap-8">
          <template v-for="(slot, index) in arenaPlayers" :key="index">
            <article class="relative flex min-w-0 flex-col items-center text-center">
              <span v-if="effectiveWinnerId === slot.id && slot.id" class="mb-3 inline-flex items-center gap-1 rounded-full bg-(--color-accent) px-2 py-1 text-xs font-extrabold text-(--color-sidebar-on-accent)"><i class="pi pi-trophy" /> VINCITORE</span>
              <Avatar :label="slot.player ? getPlayerInitials(slot.player) : 'TBD'" :image="slot.player?.photo_url ?? undefined" shape="circle" class="size-20! border-4! border-white/15! bg-surface-100! text-xl! text-(--color-text-muted)! shadow-xl sm:size-32!" :class="effectiveWinnerId === slot.id && slot.id ? 'ring-4 ring-(--color-accent)' : ''" />
              <h2 class="mt-4 max-w-full truncate text-xl font-bold tracking-tight sm:text-3xl">{{ getSlotName(slot.id) }}</h2>
              <p class="mt-2 flex items-center gap-2 text-xs text-white/50"><i class="pi pi-building-columns" /> {{ slot.player?.club ?? 'Club non disponibile' }}</p>
              <div class="mt-4 grid w-full max-w-sm grid-cols-3 gap-1">
                <div v-for="stat in [{ label: 'RANKING', value: `#${slot.player?.ranking ?? '—'}` }, { label: 'ETÀ', value: slot.player ? formatAge(slot.player.birth_date) : '—' }, { label: 'NASCITA', value: slot.player ? formatDate(slot.player.birth_date) : '—' }]" :key="stat.label" class="grid gap-1 bg-white/5 px-1 py-3"><small class="text-[0.6rem] font-extrabold tracking-wide text-white/35">{{ stat.label }}</small><strong class="truncate text-xs text-white/80">{{ stat.value }}</strong></div>
              </div>
            </article>
            <div v-if="index === 0" class="grid size-12 place-items-center justify-self-center rounded-full border border-white/15 bg-white/10 text-xs font-black text-(--color-accent)">VS</div>
          </template>
        </div>

        <div class="grid grid-cols-3 gap-1 border-t border-white/10 pt-4">
          <div v-for="summary in [{ icon: 'pi pi-sitemap', label: 'TURNO', value: roundLabel }, { icon: 'pi pi-chart-bar', label: 'RISULTATO', value: match.result ?? 'Non ancora inserito' }, { icon: 'pi pi-trophy', label: 'VINCITORE', value: effectiveWinnerId ? getSlotName(effectiveWinnerId) : 'Da definire' }]" :key="summary.label" class="grid min-w-0 justify-items-center gap-2 border-r border-white/10 px-1 text-center last:border-0 sm:flex sm:items-center sm:justify-start sm:text-left"><span class="grid size-8 place-items-center bg-white/10 text-xs text-(--color-accent)"><i :class="summary.icon" /></span><p class="grid min-w-0"><small class="text-[0.6rem] font-extrabold tracking-wide text-white/35">{{ summary.label }}</small><strong class="truncate text-xs text-white/80">{{ summary.value }}</strong></p></div>
        </div>
      </section>

      <!------------------------------>
      <!-- Section: Match management -->
      <!------------------------------>
      <section v-if="canModify && !hasBye" class="flex flex-col gap-4">
        <header class="flex items-center gap-3"><span class="grid size-10 place-items-center bg-primary-50 text-primary-700"><i class="pi pi-sliders-h" /></span><div><p class="text-[0.65rem] font-extrabold tracking-[0.12em] text-primary-700">GESTIONE INCONTRO</p><h2 class="mt-1 font-bold">Aggiorna il match</h2></div></header>
        <form class="flex max-w-2xl flex-col gap-4 border border-(--color-border) bg-(--color-surface-card) p-4 shadow-sm sm:p-5" @submit.prevent="saveResult">
          <header class="flex items-center gap-3 border-b border-(--color-surface-muted) pb-4"><span class="grid size-9 place-items-center bg-(--color-surface-muted) text-primary-700"><i class="pi pi-flag" /></span><div><h3 class="font-bold">Risultato finale</h3><p class="mt-1 text-xs text-(--color-text-subtle)">Inserisci il punteggio e indica chi ha vinto.</p></div></header>
          <label for="match-result" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Risultato<InputText id="match-result" v-model="resultValue" placeholder="es. 6-3 6-4" fluid /></label>
          <label for="match-winner" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Vincitore<Select id="match-winner" v-model="winnerId" :options="[player1, player2].filter(Boolean)" option-label="name" option-value="id" placeholder="Seleziona vincitore" fluid /></label>
          <footer class="flex flex-col items-stretch justify-between gap-3 border-t border-(--color-surface-muted) pt-4 sm:flex-row sm:items-center"><span class="text-xs text-(--color-text-subtle)">Il vincitore avanzerà automaticamente</span><Button type="submit" label="Salva risultato" icon="pi pi-trophy" :loading="savingResult" :disabled="!resultValue || !winnerId" /></footer>
        </form>
      </section>
    </template>
  </div>
</template>
