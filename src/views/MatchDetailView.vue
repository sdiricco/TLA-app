<script setup lang="ts">
// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'
import { useLayoutStore } from '@/stores/layout'
import { useMatchesStore } from '@/stores/matches'
import { usePlayersStore } from '@/stores/players'
import { useTournamentsStore } from '@/stores/tournaments'
import type { Match, Player, TournamentWithPlayers } from '@/types'
import { getPlayerInitials } from '@/utils/main'

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const layout = useLayoutStore()
const tournamentsStore = useTournamentsStore()
const playersStore = usePlayersStore()
const matchesStore = useMatchesStore()
const toast = useToast()
const tournament = ref<TournamentWithPlayers | null>(null)
const players = ref<Player[]>([])
const loading = ref(true)
const savingResult = ref(false)
const resultValue = ref('')
const winnerId = ref<string | null>(null)

// -----------------------------------------------------------------------------
// Derived state
// -----------------------------------------------------------------------------
const canModify = computed(() => tournament.value?.can_manage === true && !auth.isGuest)
const match = computed<Match | null>(() =>
  matchesStore.matches.find((entry) => entry.id === route.params['matchId']) ?? null,
)
const hasBye = computed(() => Boolean(match.value && (!match.value.player1_id || !match.value.player2_id)))
const isCompleted = computed(() => match.value?.status === 'completed')
const playerById = computed(() => new Map(players.value.map((player) => [player.id, player])))
const phase = computed(() =>
  tournament.value?.phases?.find((entry) => entry.id === match.value?.phase_id) ?? null,
)
const roundLabel = computed(() =>
  matchesStore.rounds.find((round) => round.index === match.value?.round_index)?.name ?? 'Turno',
)
// Phase and group only add information when the tournament has more than one.
const contextLabel = computed(() => {
  const parts: string[] = []
  if ((tournament.value?.phases?.length ?? 0) > 1 && phase.value) parts.push(phase.value.name)
  const group = phase.value?.groups.find((entry) => entry.id === match.value?.group_id)
  if (group && (phase.value?.groups.length ?? 0) > 1) parts.push(group.name)
  return parts.join(' · ')
})

// Tennis scores are written from the winner's point of view ("6-4 3-6 7-5"),
// so the first number of each set belongs to the winner. Without a winner the
// score is read from player 1's side.
const sets = computed<{ first: number; second: number; tiebreak: string | null }[]>(() =>
  [...(match.value?.result ?? '').matchAll(/(\d+)\s*-\s*(\d+)\s*(\(\s*\d+(?:\s*-\s*\d+)?\s*\))?/g)].map((entry) => ({
    first: Number(entry[1]),
    second: Number(entry[2]),
    tiebreak: entry[3]?.replace(/[()\s]/g, '') ?? null,
  })),
)
const scoreboard = computed(() => {
  if (!match.value) return []
  const slots = [match.value.player1_id, match.value.player2_id]
  const perspectiveId = match.value.winner_id ?? match.value.player1_id
  return slots.map((id) => {
    const ownSide = id !== null && id === perspectiveId
    return {
      id,
      player: id ? playerById.value.get(id) ?? null : null,
      isWinner: Boolean(id && match.value?.winner_id === id),
      isLoser: Boolean(id && match.value?.winner_id && match.value.winner_id !== id),
      games: sets.value.map((set) => {
        const own = ownSide ? set.first : set.second
        const other = ownSide ? set.second : set.first
        return { value: own, won: own > other }
      }),
    }
  })
})
const winnerOptions = computed(() =>
  scoreboard.value
    .filter((slot) => slot.id)
    .map((slot) => ({ label: slot.player?.name ?? 'Giocatore', value: slot.id })),
)
const formDirty = computed(() =>
  resultValue.value.trim() !== (match.value?.result ?? '') || winnerId.value !== (match.value?.winner_id ?? null),
)

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function playerMeta(player: Player | null): string {
  if (!player) return ''
  return [player.club, player.ranking ? `#${player.ranking}` : null].filter(Boolean).join(' · ')
}

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------
// Matches are loaded per phase: look in the default phase first, then in the
// other phases, so matches from any phase of the tournament can be opened.
async function loadMatch(loadedTournament: TournamentWithPlayers, matchId: string): Promise<boolean> {
  await matchesStore.loadForTournament(loadedTournament.id)
  if (matchesStore.matches.some((entry) => entry.id === matchId)) return true
  for (const candidate of loadedTournament.phases ?? []) {
    if (candidate.id === matchesStore.activePhaseId) continue
    await matchesStore.loadForTournament(loadedTournament.id, candidate.id)
    if (matchesStore.matches.some((entry) => entry.id === matchId)) return true
  }
  return false
}

async function loadPage(): Promise<void> {
  loading.value = true
  try {
    const tournamentId = route.params['id'] as string
    const loadedTournament = await tournamentsStore.getById(tournamentId)
    tournament.value = loadedTournament
    layout.setTopbarContext({
      title: 'Dettaglio incontro',
      backTo: `/tournaments/${tournamentId}/draw`,
      backLabel: `Torna a ${loadedTournament.name}`,
    })
    if (!(await loadMatch(loadedTournament, route.params['matchId'] as string)) || !match.value) {
      throw new Error('Match not found')
    }
    const ids = [match.value.player1_id, match.value.player2_id].filter((id): id is string => Boolean(id))
    const loadedPlayers = await Promise.all(ids.map(async (playerId) => {
      try { return await playersStore.getById(playerId) } catch { return null }
    }))
    players.value = loadedPlayers.filter((player): player is Player => Boolean(player))
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
  if (!canModify.value || !match.value || !resultValue.value.trim() || !winnerId.value) return
  savingResult.value = true
  try {
    await matchesStore.enterResult(match.value.id, { result: resultValue.value.trim(), winner_id: winnerId.value })
    await loadPage()
    toast.add({ severity: 'success', summary: 'Salvato', detail: 'Risultato aggiornato', life: 3000 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    savingResult.value = false
  }
}

// -----------------------------------------------------------------------------
// Lifecycle
// -----------------------------------------------------------------------------
watch(() => [route.params['id'], route.params['matchId']], loadPage, { immediate: true })
onBeforeUnmount(layout.clearTopbarContext)
</script>

<template>
  <div class="mx-auto flex w-full max-w-2xl flex-col gap-4 py-2 text-(--color-text)">
    <div v-if="loading" class="flex min-h-60 items-center justify-center" role="status" aria-label="Caricamento dell'incontro">
      <ProgressSpinner class="size-9" stroke-width="4" />
    </div>

    <template v-else-if="match && tournament">
      <!------------------------------>
      <!-- Section: Match context -->
      <!------------------------------>
      <header class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <RouterLink
            :to="`/tournaments/${tournament.id}/draw`"
            class="block truncate text-sm text-(--color-text-muted) hover:text-primary"
          >
            {{ tournament.name }}
          </RouterLink>
          <h1 class="mt-0.5 text-xl font-bold tracking-tight">{{ roundLabel }}</h1>
          <p v-if="contextLabel" class="mt-0.5 text-sm text-(--color-text-muted)">{{ contextLabel }}</p>
        </div>
        <Tag
          :value="hasBye ? 'Passaggio diretto' : isCompleted ? 'Concluso' : 'Da giocare'"
          :severity="isCompleted ? 'success' : 'secondary'"
          class="shrink-0"
        />
      </header>

      <!------------------------------>
      <!-- Section: Scoreboard -->
      <!------------------------------>
      <section
        class="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-card)"
        aria-label="Segnapunti"
      >
        <div
          v-for="(slot, index) in scoreboard"
          :key="index"
          class="flex items-center gap-3 px-4 py-3"
          :class="[index > 0 ? 'border-t border-(--color-border)' : '', slot.isLoser ? 'text-(--color-text-muted)' : '']"
        >
          <Avatar
            :label="slot.player ? getPlayerInitials(slot.player) : undefined"
            :icon="slot.player ? undefined : 'pi pi-user'"
            :image="slot.player?.photo_url ?? undefined"
            shape="circle"
            class="size-10! shrink-0 text-sm!"
            :class="slot.isLoser ? 'opacity-60' : ''"
          />
          <div class="min-w-0 flex-1">
            <RouterLink
              v-if="slot.player"
              :to="{ name: 'player-detail', params: { id: slot.player.id } }"
              class="flex items-center gap-1.5 truncate font-semibold hover:text-primary"
            >
              <span class="truncate">{{ slot.player.name }}</span>
              <i v-if="slot.isWinner" class="pi pi-trophy text-xs text-primary" aria-label="Vincitore" />
            </RouterLink>
            <p v-else class="font-semibold text-(--color-text-muted)">{{ slot.id ? 'Giocatore non trovato' : hasBye ? 'Bye' : 'Da definire' }}</p>
            <p v-if="playerMeta(slot.player)" class="truncate text-xs text-(--color-text-muted)">{{ playerMeta(slot.player) }}</p>
          </div>
          <ol v-if="slot.games.length" class="flex shrink-0 gap-1" aria-label="Game per set">
            <li
              v-for="(game, setIndex) in slot.games"
              :key="setIndex"
              class="w-6 text-center text-lg tabular-nums"
              :class="game.won ? 'font-bold text-(--color-text)' : 'text-(--color-text-muted)'"
            >
              {{ game.value }}
            </li>
          </ol>
        </div>
        <p
          v-if="!match.result && !hasBye"
          class="border-t border-(--color-border) bg-(--color-surface-muted) px-4 py-2 text-xs text-(--color-text-muted)"
        >
          Risultato non ancora inserito
        </p>
      </section>

      <!------------------------------>
      <!-- Section: Result entry -->
      <!------------------------------>
      <form
        v-if="canModify && !hasBye"
        class="flex flex-col gap-4 rounded-xl border border-(--color-border) bg-(--color-surface-card) p-4"
        @submit.prevent="saveResult"
      >
        <h2 class="font-semibold">{{ match.result ? 'Modifica risultato' : 'Inserisci risultato' }}</h2>
        <div class="flex flex-col gap-1.5">
          <label for="match-result" class="text-sm font-medium text-(--color-text-muted)">Punteggio</label>
          <InputText id="match-result" v-model="resultValue" placeholder="es. 6-3 4-6 7-5" fluid />
          <small class="text-xs text-(--color-text-muted)">Dal punto di vista del vincitore, un set alla volta.</small>
        </div>
        <div class="flex flex-col gap-1.5">
          <span id="match-winner-label" class="text-sm font-medium text-(--color-text-muted)">Vincitore</span>
          <SelectButton
            v-model="winnerId"
            :options="winnerOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            aria-labelledby="match-winner-label"
            class="w-full"
            :pt="{ pcToggleButton: { root: { class: 'flex-1 min-w-0' }, label: { class: 'truncate' } } }"
          />
        </div>
        <div class="flex items-center justify-between gap-3">
          <small class="text-xs text-(--color-text-muted)">Il vincitore passa al turno successivo.</small>
          <Button
            type="submit"
            label="Salva"
            icon="pi pi-check"
            :loading="savingResult"
            :disabled="!resultValue.trim() || !winnerId || !formDirty"
          />
        </div>
      </form>
    </template>
  </div>
</template>
