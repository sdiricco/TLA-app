<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTournamentsStore } from '../stores/tournaments'
import { usePlayersStore } from '../stores/players'
import { useMatchesStore } from '../stores/matches'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import Select from 'primevue/select'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import type { Match, MatchSet, Player, TournamentWithPlayers } from '../types'
import { countSetsWon, formatMatchScore } from '../utils/matches'

interface EditableSet {
  p1: number | null
  p2: number | null
}

type MatchSlot = 'player1_id' | 'player2_id'

const route = useRoute()
const router = useRouter()
const tournamentsStore = useTournamentsStore()
const playersStore = usePlayersStore()
const matchesStore = useMatchesStore()
const confirm = useConfirm()
const toast = useToast()

const tournament = ref<TournamentWithPlayers | null>(null)
const loading = ref(true)
const addPlayerVisible = ref(false)
const selectedPlayerId = ref<string | null>(null)
const addingPlayer = ref(false)
const savingSeeds = ref(false)
const generatingDraw = ref(false)
const resettingDraw = ref(false)
const savingResult = ref(false)

const localOrder = ref<Player[]>([])
const dragIndex = ref<number | null>(null)

const scoreDialogVisible = ref(false)
const selectedMatch = ref<Match | null>(null)
const editSets = ref<EditableSet[]>([{ p1: null, p2: null }])

const formatLabels: Record<string, string> = {
  single_elimination: 'Eliminazione diretta',
  double_elimination: 'Doppia eliminazione',
  round_robin: "Girone all'italiana",
  round_robin_elimination: 'Gironi + finale',
}

const categoryLabels: Record<string, string> = { singles: 'Singolo', doubles: 'Doppio' }

async function loadTournament(): Promise<void> {
  tournament.value = await tournamentsStore.getById(route.params['id'] as string)
}

async function loadPage(): Promise<void> {
  loading.value = true
  try {
    const tournamentId = route.params['id'] as string
    const [loadedTournament] = await Promise.all([
      tournamentsStore.getById(tournamentId),
      playersStore.fetchAll(),
      matchesStore.loadForTournament(tournamentId),
    ])
    tournament.value = loadedTournament
  } catch {
    toast.add({ severity: 'error', summary: 'Errore', detail: 'Torneo non trovato', life: 3000 })
    await router.push({ name: 'tournaments' })
  } finally {
    loading.value = false
  }
}

onMounted(loadPage)

const enrolledPlayerIds = computed<string[]>(() => {
  if (!tournament.value) return []
  if (tournament.value.playerIds) return tournament.value.playerIds
  if (tournament.value.tournament_players) {
    return [...tournament.value.tournament_players]
      .sort((a, b) => (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER))
      .map((entry) => entry.player_id)
  }
  return []
})

const enrolledPlayers = computed<Player[]>(() =>
  enrolledPlayerIds.value
    .map((id) => playersStore.players.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player)),
)

watch(
  enrolledPlayers,
  (players) => {
    const latestPlayersById = new Map(players.map((player) => [player.id, player]))
    const preservedPlayers = localOrder.value
      .filter((player) => latestPlayersById.has(player.id))
      .map((player) => latestPlayersById.get(player.id)!)
    const preservedIds = new Set(preservedPlayers.map((player) => player.id))
    const appendedPlayers = players.filter((player) => !preservedIds.has(player.id))
    localOrder.value = [...preservedPlayers, ...appendedPlayers]
  },
  { immediate: true },
)

const availablePlayers = computed<Player[]>(() =>
  playersStore.players.filter((player) => !enrolledPlayerIds.value.includes(player.id)),
)

const playerById = computed(() => new Map(playersStore.players.map((player) => [player.id, player])))
const seedByPlayerId = computed(() => new Map(enrolledPlayers.value.map((player, index) => [player.id, index + 1])))
const hasMatches = computed(() => matchesStore.matches.length > 0)
const isRoundRobin = computed(
  () =>
    tournament.value?.format === 'round_robin' ||
    tournament.value?.format === 'round_robin_elimination',
)
const orderChanged = computed(
  () => localOrder.value.map((player) => player.id).join(',') !== enrolledPlayers.value.map((player) => player.id).join(','),
)
const bracketRounds = computed(() =>
  Array.from({ length: matchesStore.numRounds }, (_, index) => {
    const roundMatches = matchesStore.matchesByRound.get(index + 1) ?? []
    return roundMatches.filter((match): match is Match => Boolean(match))
  }),
)
const roundLabels = computed(() => {
  const total = matchesStore.numRounds
  return Array.from({ length: total }, (_, i) => {
    const remaining = total - i
    if (remaining === 1) return 'Finale'
    if (remaining === 2) return 'Semifinale'
    if (remaining === 3) return 'Quarti'
    return `Turno ${i + 1}`
  })
})

const normalizedSets = computed<MatchSet[]>(() =>
  editSets.value
    .filter((set) => set.p1 !== null && set.p2 !== null)
    .map((set) => ({ p1: set.p1!, p2: set.p2! })),
)
const hasIncompleteSets = computed(() => editSets.value.some((set) => set.p1 === null || set.p2 === null))
const selectedMatchPlayers = computed(() => {
  if (!selectedMatch.value) return null
  return {
    player1: selectedMatch.value.player1_id ? playerById.value.get(selectedMatch.value.player1_id) ?? null : null,
    player2: selectedMatch.value.player2_id ? playerById.value.get(selectedMatch.value.player2_id) ?? null : null,
  }
})
const computedWinnerId = computed<string | null>(() => {
  if (!selectedMatch.value || hasIncompleteSets.value || normalizedSets.value.length === 0) return null
  const wins = countSetsWon(normalizedSets.value)
  if (wins.p1 === wins.p2) return null
  return wins.p1 > wins.p2 ? selectedMatch.value.player1_id : selectedMatch.value.player2_id
})
const computedWinnerName = computed(() => {
  if (!computedWinnerId.value) return null
  return playerById.value.get(computedWinnerId.value)?.name ?? null
})
const scoreDialogTitle = computed(() => {
  const players = selectedMatchPlayers.value
  if (!players?.player1 || !players.player2) return 'Inserisci risultato'
  return `${players.player1.name} vs ${players.player2.name}`
})

function statusSeverity(status: string): string {
  return ({ upcoming: 'info', ongoing: 'success', completed: 'secondary' } as Record<string, string>)[status] ?? 'secondary'
}

function statusLabel(status: string): string {
  return ({ upcoming: 'In programma', ongoing: 'In corso', completed: 'Completato' } as Record<string, string>)[status] ?? status
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function getPlayer(playerId: string | null): Player | null {
  return playerId ? playerById.value.get(playerId) ?? null : null
}

function getSeed(playerId: string | null): number | null {
  return playerId ? seedByPlayerId.value.get(playerId) ?? null : null
}

function getOtherSlot(slot: MatchSlot): MatchSlot {
  return slot === 'player1_id' ? 'player2_id' : 'player1_id'
}

function isByeSlot(match: Match, slot: MatchSlot): boolean {
  return !match[slot] && Boolean(match[getOtherSlot(slot)])
}

function isTbdSlot(match: Match, slot: MatchSlot): boolean {
  return !match[slot] && !match[getOtherSlot(slot)]
}

function getSlotLabel(match: Match, slot: MatchSlot): string {
  const playerId = match[slot]
  if (playerId) return getPlayer(playerId)?.name ?? 'Giocatore sconosciuto'
  if (isByeSlot(match, slot)) return 'BYE'
  return 'TBD'
}

function getSlotScores(match: Match, slot: MatchSlot): string {
  if (match.sets.length === 0) return ''
  return match.sets.map((set) => (slot === 'player1_id' ? set.p1 : set.p2)).join(' ')
}

function canOpenMatch(match: Match): boolean {
  return Boolean(match.player1_id && match.player2_id)
}

function isWinner(match: Match, slot: MatchSlot): boolean {
  return Boolean(match.winner_id && match.winner_id === match[slot])
}

function isWalkoverMatch(match: Match): boolean {
  return match.status === 'completed' && match.sets.length === 0 && (!match.player1_id || !match.player2_id)
}

function getMatchSummary(match: Match): string {
  if (match.status === 'completed') {
    if (isWalkoverMatch(match)) return 'BYE'
    return formatMatchScore(match.sets)
  }
  if (canOpenMatch(match)) return 'Clicca per inserire risultato'
  return 'In attesa del turno precedente'
}

function resetScoreEditor(): void {
  selectedMatch.value = null
  editSets.value = [{ p1: null, p2: null }]
}

function closeScoreDialog(): void {
  scoreDialogVisible.value = false
  resetScoreEditor()
}

async function addPlayer(): Promise<void> {
  if (!selectedPlayerId.value || !tournament.value) return
  addingPlayer.value = true
  try {
    await tournamentsStore.addPlayer(tournament.value.id, selectedPlayerId.value)
    await loadTournament()
    addPlayerVisible.value = false
    selectedPlayerId.value = null
    toast.add({ severity: 'success', summary: 'Aggiunto', detail: 'Giocatore iscritto', life: 3000 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    addingPlayer.value = false
  }
}

function confirmRemovePlayer(player: Player): void {
  confirm.require({
    message: `Rimuovere ${player.name} da questo torneo?`,
    header: 'Conferma rimozione',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Annulla',
    acceptLabel: 'Rimuovi',
    acceptSeverity: 'danger',
    accept: async () => {
      if (!tournament.value) return
      try {
        await tournamentsStore.removePlayer(tournament.value.id, player.id)
        await loadTournament()
        toast.add({ severity: 'success', summary: 'Rimosso', detail: `${player.name} rimosso`, life: 3000 })
      } catch (error) {
        toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
      }
    },
  })
}

function onDragStart(index: number): void {
  dragIndex.value = index
}

function onDrop(targetIndex: number): void {
  if (dragIndex.value === null || dragIndex.value === targetIndex) return
  const updatedOrder = [...localOrder.value]
  const [movedPlayer] = updatedOrder.splice(dragIndex.value, 1)
  if (!movedPlayer) return
  updatedOrder.splice(targetIndex, 0, movedPlayer)
  localOrder.value = updatedOrder
  dragIndex.value = null
}

async function saveSeeds(): Promise<void> {
  if (!tournament.value || !orderChanged.value) return
  savingSeeds.value = true
  try {
    await tournamentsStore.updateSeeds(tournament.value.id, localOrder.value.map((player) => player.id))
    await loadTournament()
    toast.add({ severity: 'success', summary: 'Ordine salvato', detail: 'Le teste di serie sono state aggiornate', life: 3000 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    savingSeeds.value = false
  }
}

async function generateDraw(): Promise<void> {
  if (!tournament.value || localOrder.value.length < 2 || hasMatches.value) return
  generatingDraw.value = true
  try {
    const playerIds = localOrder.value.map((player) => player.id)
    if (orderChanged.value) {
      await tournamentsStore.updateSeeds(tournament.value.id, playerIds)
      await loadTournament()
    }
    await matchesStore.generateDraw(tournament.value.id, playerIds)
    toast.add({ severity: 'success', summary: 'Tabellone creato', detail: 'Il primo turno è stato generato', life: 3000 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    generatingDraw.value = false
  }
}

function confirmResetDraw(): void {
  if (!tournament.value) return
  confirm.require({
    message: 'Azzera il tabellone e tutti i risultati inseriti?',
    header: 'Azzera tabellone',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Annulla',
    acceptLabel: 'Azzera',
    acceptSeverity: 'danger',
    accept: async () => {
      resettingDraw.value = true
      try {
        await matchesStore.reset(tournament.value!.id)
        toast.add({ severity: 'success', summary: 'Tabellone azzerato', detail: 'Puoi generare un nuovo tabellone', life: 3000 })
      } catch (error) {
        toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
      } finally {
        resettingDraw.value = false
      }
    },
  })
}

function openScoreDialog(match: Match): void {
  if (!canOpenMatch(match)) return
  selectedMatch.value = match
  editSets.value = match.sets.length > 0 ? match.sets.map((set) => ({ ...set })) : [{ p1: null, p2: null }]
  scoreDialogVisible.value = true
}

function addSetRow(): void {
  if (editSets.value.length >= 5) return
  editSets.value = [...editSets.value, { p1: null, p2: null }]
}

function removeSetRow(index: number): void {
  if (editSets.value.length === 1) return
  editSets.value = editSets.value.filter((_, currentIndex) => currentIndex !== index)
}

async function saveResult(): Promise<void> {
  if (!selectedMatch.value) return
  if (normalizedSets.value.length === 0) {
    toast.add({ severity: 'warn', summary: 'Risultato incompleto', detail: 'Inserisci almeno un set', life: 3000 })
    return
  }
  if (hasIncompleteSets.value) {
    toast.add({ severity: 'warn', summary: 'Set incompleto', detail: 'Compila o rimuovi tutti i set', life: 3000 })
    return
  }
  if (!computedWinnerId.value) {
    toast.add({ severity: 'warn', summary: 'Vincitore non valido', detail: "Un giocatore deve vincere più set dell'altro", life: 3000 })
    return
  }

  savingResult.value = true
  try {
    await matchesStore.enterResult(selectedMatch.value.id, {
      sets: normalizedSets.value,
      winner_id: computedWinnerId.value,
    })
    toast.add({ severity: 'success', summary: 'Risultato salvato', detail: 'Il vincitore è avanzato al turno successivo', life: 3000 })
    closeScoreDialog()
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    savingResult.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-5">
    <div v-if="loading" class="flex flex-col items-center justify-center gap-3 min-h-[220px] text-center text-muted-color">
      <i class="pi pi-spin pi-spinner text-[2rem] text-primary-500" />
    </div>

    <template v-else-if="tournament">
      <div class="flex flex-col gap-3">
        <div class="flex items-center gap-3 flex-wrap">
          <Button
            icon="pi pi-arrow-left"
            text
            rounded
            aria-label="Torna ai tornei"
            @click="router.push({ name: 'tournaments' })"
          />
          <Tag :value="statusLabel(tournament.status)" :severity="statusSeverity(tournament.status)" />
        </div>

        <h2 class="m-0 text-[1.625rem]">{{ tournament.name }}</h2>

        <div class="flex items-center gap-2 flex-wrap">
          <span v-if="tournament.location" class="inline-flex items-center gap-[0.375rem] px-3 py-1 rounded-full bg-surface-100 text-sm text-color">
            <i class="pi pi-map-marker" /> {{ tournament.location }}
          </span>
          <span class="inline-flex items-center gap-[0.375rem] px-3 py-1 rounded-full bg-surface-100 text-sm text-color">
            <i class="pi pi-calendar" />
            {{ formatDate(tournament.start_date) }}
            <template v-if="tournament.end_date"> → {{ formatDate(tournament.end_date) }}</template>
          </span>
          <span class="inline-flex items-center gap-[0.375rem] px-3 py-1 rounded-full bg-surface-100 text-sm text-color">
            <i class="pi pi-sitemap" /> {{ formatLabels[tournament.format] ?? tournament.format }}
          </span>
          <span class="inline-flex items-center gap-[0.375rem] px-3 py-1 rounded-full bg-surface-100 text-sm text-color">
            <i class="pi pi-user" /> {{ categoryLabels[tournament.category] ?? tournament.category }}
          </span>
        </div>
      </div>

      <Tabs value="iscritti">
        <TabList>
          <Tab value="iscritti">
            <i class="pi pi-users mr-2" />
            Iscritti ({{ enrolledPlayers.length }})
          </Tab>
          <Tab value="tabellone">
            <i class="pi pi-sitemap mr-2" />
            Tabellone
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel value="iscritti">
            <div class="flex flex-col gap-4 py-4">
              <div class="flex items-center justify-between gap-3 flex-wrap">
                <span class="text-sm text-muted-color">{{ enrolledPlayers.length }} giocatori iscritti</span>
                <Button
                  label="Aggiungi giocatore"
                  icon="pi pi-user-plus"
                  size="small"
                  :disabled="availablePlayers.length === 0"
                  @click="addPlayerVisible = true"
                />
              </div>

              <div v-if="localOrder.length === 0" class="flex flex-col items-center justify-center gap-3 min-h-[220px] text-center text-muted-color">
                <i class="pi pi-users text-[2rem] text-muted-color" />
                <p class="m-0">Nessun giocatore iscritto.<br />Clicca <strong>Aggiungi giocatore</strong> per iniziare.</p>
              </div>

              <template v-else>
                <div class="flex flex-col gap-[0.375rem]">
                  <div
                    v-for="(player, index) in localOrder"
                    :key="player.id"
                    class="flex items-center gap-3 p-3 rounded-lg bg-surface-50 border border-surface-200 cursor-grab"
                    :class="{ 'opacity-50 cursor-grabbing': dragIndex === index }"
                    draggable="true"
                    @dragstart="onDragStart(index)"
                    @dragover.prevent
                    @dragend="dragIndex = null"
                    @drop="onDrop(index)"
                  >
                    <span class="text-muted-color cursor-grab" aria-hidden="true">
                      <i class="pi pi-bars" />
                    </span>
                    <span class="text-sm font-bold text-muted-color w-8 shrink-0">#{{ index + 1 }}</span>
                    <div class="flex-1 min-w-0">
                      <span class="block font-medium text-color">{{ player.name }}</span>
                      <span class="block text-[0.8125rem] text-muted-color">
                        <template v-if="player.club">{{ player.club }} · </template>Rank {{ player.ranking }}
                      </span>
                    </div>
                    <Button
                      icon="pi pi-times"
                      text
                      rounded
                      size="small"
                      severity="danger"
                      aria-label="Rimuovi"
                      @click="confirmRemovePlayer(player)"
                    />
                  </div>
                </div>

                <div class="flex items-center gap-2 pt-2 flex-wrap">
                  <Button
                    label="Salva ordine"
                    icon="pi pi-save"
                    outlined
                    :disabled="!orderChanged"
                    :loading="savingSeeds"
                    @click="saveSeeds"
                  />
                  <Button
                    label="Genera tabellone"
                    icon="pi pi-sitemap"
                    :disabled="localOrder.length < 2 || hasMatches || isRoundRobin"
                    :loading="generatingDraw"
                    @click="generateDraw"
                  />
                  <Button
                    v-if="hasMatches"
                    label="Azzera tabellone"
                    icon="pi pi-refresh"
                    severity="danger"
                    outlined
                    :loading="resettingDraw"
                    @click="confirmResetDraw"
                  />
                </div>

                <small v-if="isRoundRobin" class="text-sm text-muted-color">
                  La gestione del tabellone con risultati è disponibile per i tornei a eliminazione diretta.
                </small>
              </template>
            </div>
          </TabPanel>

          <TabPanel value="tabellone">
            <div class="flex flex-col gap-4 py-4">
              <div v-if="enrolledPlayers.length < 2" class="flex flex-col items-center justify-center gap-3 min-h-[220px] text-center text-muted-color">
                <i class="pi pi-sitemap text-[2rem] text-muted-color" />
                <p class="m-0">Servono almeno 2 giocatori per generare il tabellone.</p>
              </div>

              <template v-else-if="isRoundRobin">
                <div class="overflow-x-auto">
                  <table class="w-full min-w-[560px] border-collapse">
                    <thead>
                      <tr>
                        <th class="border border-surface-200 bg-surface-100 p-2.5 text-center font-semibold">#</th>
                        <th
                          v-for="player in enrolledPlayers"
                          :key="player.id"
                          class="border border-surface-200 bg-surface-100 p-2.5 text-center font-semibold"
                        >
                          <span>{{ player.name }}</span>
                        </th>
                        <th class="border border-surface-200 bg-surface-100 p-2.5 text-center font-semibold">V</th>
                        <th class="border border-surface-200 bg-surface-100 p-2.5 text-center font-semibold">P</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(rowPlayer, rowIndex) in enrolledPlayers" :key="rowPlayer.id">
                        <td class="border border-surface-200 bg-surface-100 p-2.5 text-left font-semibold">{{ rowPlayer.name }}</td>
                        <td
                          v-for="(columnPlayer, columnIndex) in enrolledPlayers"
                          :key="columnPlayer.id"
                          class="border border-surface-200 p-2.5 text-center"
                          :class="{ 'bg-surface-100': rowIndex === columnIndex }"
                        >
                          <span v-if="rowIndex !== columnIndex" class="text-muted-color">–</span>
                        </td>
                        <td class="border border-surface-200 p-2.5 text-center text-muted-color">0</td>
                        <td class="border border-surface-200 p-2.5 text-center text-muted-color">0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </template>

              <div v-else-if="!hasMatches" class="flex flex-col items-center justify-center gap-3 min-h-[220px] text-center text-muted-color">
                <i class="pi pi-sitemap text-[2rem] text-muted-color" />
                <p class="m-0">Salva l'ordine dei giocatori e clicca <strong>Genera tabellone</strong> nella tab Iscritti.</p>
              </div>

              <div v-else class="grid gap-4 items-start grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
                <div v-for="(roundMatches, roundIndex) in bracketRounds" :key="roundIndex" class="flex flex-col gap-3">
                  <div class="text-sm font-bold text-muted-color uppercase tracking-[0.04em]">{{ roundLabels[roundIndex] }}</div>
                  <div class="flex flex-col gap-3">
                    <button
                      v-for="match in roundMatches"
                      :key="match.id"
                      type="button"
                      class="appearance-none font-[inherit] text-inherit w-full flex flex-col p-0 border border-surface-200 rounded-xl bg-surface-0 text-left overflow-hidden"
                      :class="{ 'cursor-pointer hover:border-primary-300': canOpenMatch(match) }"
                      @click="openScoreDialog(match)"
                    >
                      <div
                        class="flex items-center justify-between gap-3 px-4 py-[0.85rem]"
                        :class="{
                          'bg-green-500/15': isWinner(match, 'player1_id'),
                          'text-muted-color': isByeSlot(match, 'player1_id') || isTbdSlot(match, 'player1_id'),
                        }"
                      >
                        <div class="flex items-center gap-[0.625rem] min-w-0">
                          <span v-if="getSeed(match.player1_id)" class="text-[0.75rem] font-bold text-muted-color shrink-0">#{{ getSeed(match.player1_id) }}</span>
                          <span class="font-semibold text-inherit whitespace-nowrap overflow-hidden text-ellipsis">{{ getSlotLabel(match, 'player1_id') }}</span>
                        </div>
                        <span v-if="getSlotScores(match, 'player1_id')" class="text-[0.8125rem] font-semibold text-muted-color">{{ getSlotScores(match, 'player1_id') }}</span>
                      </div>

                      <div
                        class="flex items-center justify-between gap-3 px-4 py-[0.85rem] border-t border-surface-200"
                        :class="{
                          'bg-green-500/15': isWinner(match, 'player2_id'),
                          'text-muted-color': isByeSlot(match, 'player2_id') || isTbdSlot(match, 'player2_id'),
                        }"
                      >
                        <div class="flex items-center gap-[0.625rem] min-w-0">
                          <span v-if="getSeed(match.player2_id)" class="text-[0.75rem] font-bold text-muted-color shrink-0">#{{ getSeed(match.player2_id) }}</span>
                          <span class="font-semibold text-inherit whitespace-nowrap overflow-hidden text-ellipsis">{{ getSlotLabel(match, 'player2_id') }}</span>
                        </div>
                        <span v-if="getSlotScores(match, 'player2_id')" class="text-[0.8125rem] font-semibold text-muted-color">{{ getSlotScores(match, 'player2_id') }}</span>
                      </div>

                      <div class="flex items-center justify-between gap-3 px-4 py-3 border-t border-surface-200 text-[0.8125rem] text-muted-color">
                        <span>{{ getMatchSummary(match) }}</span>
                        <i v-if="canOpenMatch(match)" class="pi pi-pencil" />
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </div>

  <Dialog v-model:visible="addPlayerVisible" header="Aggiungi giocatore" :style="{ width: '360px' }" modal>
    <div class="flex flex-col gap-4 pt-2">
      <Select
        v-model="selectedPlayerId"
        :options="availablePlayers"
        option-label="name"
        option-value="id"
        placeholder="Seleziona giocatore"
        filter
        fluid
      />
      <div class="flex items-center justify-end gap-3 flex-wrap">
        <Button label="Annulla" severity="secondary" outlined @click="addPlayerVisible = false" />
        <Button label="Aggiungi" :loading="addingPlayer" :disabled="!selectedPlayerId" @click="addPlayer" />
      </div>
    </div>
  </Dialog>

  <Dialog
    v-model:visible="scoreDialogVisible"
    :header="scoreDialogTitle"
    :style="{ width: '460px' }"
    modal
    @hide="resetScoreEditor"
  >
    <div class="flex flex-col gap-4 pt-2">
      <div
        v-for="(set, index) in editSets"
        :key="index"
        class="grid items-center gap-3 grid-cols-2 md:grid-cols-[4.5rem_1fr_auto_1fr_auto]"
      >
        <span class="col-span-full md:col-auto text-sm font-semibold">Set {{ index + 1 }}</span>
        <InputNumber v-model="set.p1" :min="0" :max="7" :use-grouping="false" fluid />
        <span class="col-span-full md:col-auto text-muted-color">–</span>
        <InputNumber v-model="set.p2" :min="0" :max="7" :use-grouping="false" fluid />
        <Button
          v-if="editSets.length > 1"
          icon="pi pi-trash"
          text
          rounded
          severity="danger"
          aria-label="Rimuovi set"
          @click="removeSetRow(index)"
        />
      </div>

      <div class="flex items-center justify-between gap-3 flex-wrap">
        <Button
          label="Aggiungi set"
          icon="pi pi-plus"
          text
          :disabled="editSets.length >= 5"
          @click="addSetRow"
        />
        <span class="text-sm text-muted-color">Massimo 5 set</span>
      </div>

      <div class="rounded-lg bg-surface-100 px-4 py-3.5 text-color">
        <template v-if="computedWinnerName">
          Vincitore calcolato: <strong>{{ computedWinnerName }}</strong>
        </template>
        <template v-else>
          Inserisci almeno un set completo e un vincitore valido.
        </template>
      </div>

      <div class="flex items-center justify-end gap-3 flex-wrap">
        <Button label="Annulla" severity="secondary" outlined @click="closeScoreDialog" />
        <Button
          label="Salva risultato"
          icon="pi pi-check"
          :loading="savingResult"
          :disabled="!computedWinnerId || hasIncompleteSets || normalizedSets.length === 0"
          @click="saveResult"
        />
      </div>
    </div>
  </Dialog>
</template>
