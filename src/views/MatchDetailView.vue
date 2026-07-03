<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../stores/auth'
import { useMatchesStore } from '../stores/matches'
import { usePlayersStore } from '../stores/players'
import { useTournamentsStore } from '../stores/tournaments'
import type { Match, Player, TournamentWithPlayers } from '../types'
import { formatAge, getPlayerInitials } from '@/utils/main'

/**
 * Stores and router
 */
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tournamentsStore = useTournamentsStore()
const playersStore = usePlayersStore()
const matchesStore = useMatchesStore()
const toast = useToast()

/**
 * Local state
 */
const tournament = ref<TournamentWithPlayers | null>(null)
const enrolledPlayers = ref<Player[]>([])
const loading = ref(true)
const savingAssignments = ref(false)
const savingResult = ref(false)
const player1Id = ref<string | null>(null)
const player2Id = ref<string | null>(null)
const resultValue = ref('')
const winnerId = ref<string | null>(null)

/**
 * Computed helpers
 */
const canModify = computed(() => auth.isAdmin && !auth.isGuest)
const match = computed<Match | null>(() =>
  matchesStore.matches.find((entry) => entry.id === (route.params['matchId'] as string)) ?? null,
)
const playerById = computed(() => new Map(enrolledPlayers.value.map((player) => [player.id, player])))
const player1 = computed(() => (match.value?.player1_id ? playerById.value.get(match.value.player1_id) ?? null : null))
const player2 = computed(() => (match.value?.player2_id ? playerById.value.get(match.value.player2_id) ?? null : null))
const effectiveWinnerId = computed(() => {
  return match.value?.winner_id ?? null
})
const resultLabel = computed(() => match.value?.result ?? 'Da giocare')
const roundLabel = computed(() =>
  matchesStore.rounds.find((round) => round.index === match.value?.round_index)?.name ?? 'Turno',
)
const availablePlayer1Options = computed(() => enrolledPlayers.value.filter((player) => player.id !== player2Id.value))
const availablePlayer2Options = computed(() => enrolledPlayers.value.filter((player) => player.id !== player1Id.value))

/**
 * Function: format date for the player cards
 */
function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Function: load tournament, match list and enrolled players
 */
async function loadPage(): Promise<void> {
  loading.value = true
  try {
    const tournamentId = route.params['id'] as string
    const loadedTournament = await tournamentsStore.getById(tournamentId)
    tournament.value = loadedTournament
    await matchesStore.loadForTournament(tournamentId)

    const enrolledIds =
      loadedTournament.tournament_players
        ?.slice()
        .sort((left, right) => (left.seed ?? Number.MAX_SAFE_INTEGER) - (right.seed ?? Number.MAX_SAFE_INTEGER))
        .map((entry) => entry.player_id) ?? []

    const loadedPlayers = await Promise.all(
      enrolledIds.map(async (playerId) => {
        try {
          return await playersStore.getById(playerId)
        } catch {
          return null
        }
      }),
    )

    enrolledPlayers.value = loadedPlayers.filter((player): player is Player => Boolean(player))

    if (!match.value) {
      throw new Error('Match not found')
    }

    player1Id.value = match.value.player1_id
    player2Id.value = match.value.player2_id
    resultValue.value = match.value.result ?? ''
    winnerId.value = match.value.winner_id
  } catch {
    toast.add({ severity: 'error', summary: 'Errore', detail: 'Match non trovato', life: 3000 })
    await router.push({ name: 'tournament-detail', params: { id: route.params['id'] as string } })
  } finally {
    loading.value = false
  }
}

watch(
  () => [route.params['id'], route.params['matchId']],
  () => {
    void loadPage()
  },
  { immediate: true },
)

/**
 * Function: save both player assignments from the detail page
 */
async function saveAssignments(): Promise<void> {
  if (!canModify.value || !match.value) return
  savingAssignments.value = true
  try {
    if (player1Id.value !== match.value.player1_id) {
      await matchesStore.assignPlayer(match.value.id, {
        slot: 'player1_id',
        player_id: player1Id.value,
      })
    }

    if (player2Id.value !== match.value.player2_id) {
      await matchesStore.assignPlayer(match.value.id, {
        slot: 'player2_id',
        player_id: player2Id.value,
      })
    }

    await loadPage()
    toast.add({ severity: 'success', summary: 'Salvato', detail: 'Assegnazioni aggiornate', life: 3000 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    savingAssignments.value = false
  }
}

/**
 * Function: save result and selected winner
 */
async function saveResult(): Promise<void> {
  if (!canModify.value || !match.value || !resultValue.value || !winnerId.value) return
  savingResult.value = true
  try {
    await matchesStore.enterResult(match.value.id, {
      result: resultValue.value,
      winner_id: winnerId.value,
    })
    await loadPage()
    toast.add({ severity: 'success', summary: 'Salvato', detail: 'Risultato aggiornato', life: 3000 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    savingResult.value = false
  }
}

/**
 * Function: render slot placeholders for BYE or TBD
 */
function getSlotName(playerId: string | null): string {
  if (playerId === null) return 'TBD'
  return playerById.value.get(playerId)?.name ?? 'Giocatore non trovato'
}

/**
 * Function: return the current round label for the header
 */
</script>

<template>
  <div class="flex flex-col gap-5">
    <!-- Header -->
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <div class="flex items-center gap-2">
          <Button
            icon="pi pi-arrow-left"
            text
            rounded
            aria-label="Torna al torneo"
            @click="router.push({ name: 'tournament-detail', params: { id: route.params['id'] } })"
          />
          <h2 class="m-0 text-2xl">Dettaglio match</h2>
        </div>
        <p v-if="tournament && match" class="mt-1 mb-0 text-sm text-muted-color">
          {{ tournament.name }} · {{ roundLabel }}
        </p>
      </div>
      <Tag v-if="match" :value="resultLabel" :severity="match.result ? 'success' : 'secondary'" />
    </div>

    <!-- Loading / error states -->
    <div v-if="loading" class="flex justify-center py-10 text-muted-color">
      <i class="pi pi-spin pi-spinner text-[2rem] text-primary-500" />
    </div>

    <template v-else-if="match">
      <!-- Players comparison -->
      <div class="grid gap-5 lg:grid-cols-[1fr_auto_1fr]">
        <Card>
          <template #content>
            <div class="flex flex-col items-center gap-4 text-center">
              <Avatar
                :label="player1 ? getPlayerInitials(player1) : 'TBD'"
                :image="player1?.photo_url ?? undefined"
                shape="circle"
                class="h-24 w-24 text-xl"
              />
              <div>
                <h3 class="m-0 text-xl font-semibold" :class="{ 'text-emerald-700': effectiveWinnerId === match.player1_id && match.player1_id }">
                  {{ getSlotName(match.player1_id) }}
                </h3>
                <p class="mt-1 mb-0 text-sm text-muted-color">{{ player1?.club ?? 'Club non disponibile' }}</p>
              </div>
              <div class="grid w-full gap-2 text-sm">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-color">Ranking</span>
                  <span class="font-medium">{{ player1?.ranking ?? '—' }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-color">Età</span>
                  <span class="font-medium">{{ player1 ? formatAge(player1.birth_date) : '—' }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-color">Nascita</span>
                  <span class="font-medium">{{ player1 ? formatDate(player1.birth_date) : '—' }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-color">Contatto</span>
                  <span class="font-medium">{{ player1?.phone ?? '—' }}</span>
                </div>
              </div>
            </div>
          </template>
        </Card>

        <div class="flex items-center justify-center">
          <div class="rounded-full border border-surface-200 bg-surface-0 px-4 py-3 text-sm font-semibold text-muted-color shadow-sm">
            VS
          </div>
        </div>

        <Card>
          <template #content>
            <div class="flex flex-col items-center gap-4 text-center">
              <Avatar
                :label="player2 ? getPlayerInitials(player2) : 'TBD'"
                :image="player2?.photo_url ?? undefined"
                shape="circle"
                class="h-24 w-24 text-xl"
              />
              <div>
                <h3 class="m-0 text-xl font-semibold" :class="{ 'text-emerald-700': effectiveWinnerId === match.player2_id && match.player2_id }">
                  {{ getSlotName(match.player2_id) }}
                </h3>
                <p class="mt-1 mb-0 text-sm text-muted-color">{{ player2?.club ?? 'Club non disponibile' }}</p>
              </div>
              <div class="grid w-full gap-2 text-sm">
                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-color">Ranking</span>
                  <span class="font-medium">{{ player2?.ranking ?? '—' }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-color">Età</span>
                  <span class="font-medium">{{ player2 ? formatAge(player2.birth_date) : '—' }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-color">Nascita</span>
                  <span class="font-medium">{{ player2 ? formatDate(player2.birth_date) : '—' }}</span>
                </div>
                <div class="flex items-center justify-between gap-3">
                  <span class="text-muted-color">Contatto</span>
                  <span class="font-medium">{{ player2?.phone ?? '—' }}</span>
                </div>
              </div>
            </div>
          </template>
        </Card>
      </div>

      <!-- Match summary -->
      <Card>
        <template #title>Risultato</template>
        <template #content>
          <div class="grid gap-3 md:grid-cols-3">
            <div class="rounded-xl border border-surface-200 bg-surface-50 p-4">
              <div class="text-sm text-muted-color">Turno</div>
              <div class="mt-1 font-semibold">{{ roundLabel }}</div>
            </div>
            <div class="rounded-xl border border-surface-200 bg-surface-50 p-4">
              <div class="text-sm text-muted-color">Risultato</div>
              <div class="mt-1 font-semibold">{{ match.result ?? 'Non ancora inserito' }}</div>
            </div>
              <div class="rounded-xl border border-surface-200 bg-surface-50 p-4">
                <div class="text-sm text-muted-color">Vincitore</div>
              <div class="mt-1 font-semibold">{{ effectiveWinnerId ? getSlotName(effectiveWinnerId) : 'Da definire' }}</div>
              </div>
            </div>
        </template>
      </Card>

      <!-- Admin actions -->
      <div v-if="canModify" class="grid gap-5 lg:grid-cols-2">
        <Card>
          <template #title>Assegnazione giocatori</template>
          <template #content>
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-1.5">
                <label for="match-player-1" class="text-sm font-medium">Giocatore 1</label>
                <Select
                  id="match-player-1"
                  v-model="player1Id"
                  :options="availablePlayer1Options"
                  option-label="name"
                  option-value="id"
                  placeholder="Seleziona giocatore"
                  fluid
                />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="match-player-2" class="text-sm font-medium">Giocatore 2</label>
                <Select
                  id="match-player-2"
                  v-model="player2Id"
                  :options="availablePlayer2Options"
                  option-label="name"
                  option-value="id"
                  placeholder="Seleziona giocatore"
                  fluid
                />
              </div>

              <div class="flex justify-end">
                <Button label="Salva assegnazioni" :loading="savingAssignments" @click="saveAssignments" />
              </div>
            </div>
          </template>
        </Card>

        <Card>
          <template #title>Modifica risultato</template>
          <template #content>
            <div class="flex flex-col gap-4">
              <div class="flex flex-col gap-1.5">
                <label for="match-result" class="text-sm font-medium">Risultato</label>
                <InputText id="match-result" v-model="resultValue" placeholder="es. 6-3 6-4" fluid />
              </div>

              <div class="flex flex-col gap-1.5">
                <label for="match-winner" class="text-sm font-medium">Vincitore</label>
                <Select
                  id="match-winner"
                  v-model="winnerId"
                  :options="[player1, player2].filter(Boolean)"
                  option-label="name"
                  option-value="id"
                  placeholder="Seleziona vincitore"
                  fluid
                />
              </div>

              <div class="flex justify-end">
                <Button
                  label="Salva risultato"
                  :loading="savingResult"
                  :disabled="!resultValue || !winnerId"
                  @click="saveResult"
                />
              </div>
            </div>
          </template>
        </Card>
      </div>
    </template>
  </div>
</template>
