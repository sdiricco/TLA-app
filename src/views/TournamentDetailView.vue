<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTournamentsStore } from '../stores/tournaments'
import { usePlayersStore } from '../stores/players'
import { useMatchesStore } from '../stores/matches'
import { useAuthStore } from '../stores/auth'
import { playersService } from '../services/playersService'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import type { Match, MatchSlot, Player, TournamentWithPlayers } from '../types'

const route = useRoute()
const router = useRouter()
const tournamentsStore = useTournamentsStore()
const playersStore = usePlayersStore()
const matchesStore = useMatchesStore()
const auth = useAuthStore()
const confirm = useConfirm()
const toast = useToast()

const tournament = ref<TournamentWithPlayers | null>(null)
const loading = ref(true)
const myPlayer = ref<Player | null>(null)
const addPlayerVisible = ref(false)
const selectedPlayerId = ref<string | null>(null)
const addingPlayer = ref(false)
const savingSeeds = ref(false)
const resettingDraw = ref(false)

const localOrder = ref<Player[]>([])
const dragIndex = ref<number | null>(null)

// Assign dialog state
const assignDialogVisible = ref(false)
const selectedMatch = ref<Match | null>(null)
const selectedSlot = ref<MatchSlot>('player1_id')
const assignPlayerId = ref<string | null>(null)

// Result dialog state
const resultDialogVisible = ref(false)
const editResult = ref('')
const editWinnerId = ref<string | null>(null)

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
    myPlayer.value = await playersService.getMyPlayer()
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

const isEnrolled = computed(() =>
  !!myPlayer.value && enrolledPlayerIds.value.includes(myPlayer.value.id),
)

const selectedSlotHasPlayer = computed(() => {
  if (!selectedMatch.value) return false
  return selectedMatch.value[selectedSlot.value] !== null
})

const availableForSlot = computed(() => {
  if (!selectedMatch.value) return enrolledPlayers.value
  const otherSlot: MatchSlot = selectedSlot.value === 'player1_id' ? 'player2_id' : 'player1_id'
  const otherPlayerId = selectedMatch.value[otherSlot]
  return enrolledPlayers.value.filter((p) => p.id !== otherPlayerId)
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

function getPlayerName(playerId: string | null | undefined): string {
  if (!playerId) return 'Slot vuoto'
  return playerById.value.get(playerId)?.name ?? 'Giocatore sconosciuto'
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

function canOpenMatch(match: Match): boolean {
  return Boolean(match.player1_id && match.player2_id)
}

function isWinner(match: Match, slot: MatchSlot): boolean {
  return Boolean(match.winner_id && match.winner_id === match[slot])
}

async function publishToggle(): Promise<void> {
  if (!tournament.value) return
  await tournamentsStore.setPublished(tournament.value.id, !tournament.value.published)
  await loadTournament()
}

async function handleEnroll(): Promise<void> {
  if (!tournament.value) return
  await tournamentsStore.enroll(tournament.value.id)
  await loadTournament()
  myPlayer.value = await playersService.getMyPlayer()
}

async function handleWithdraw(): Promise<void> {
  if (!tournament.value) return
  await tournamentsStore.withdraw(tournament.value.id)
  await loadTournament()
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

async function createEmptyBracket(): Promise<void> {
  if (!tournament.value || enrolledPlayers.value.length < 2) return
  await matchesStore.createEmptyBracket(tournament.value.id, enrolledPlayers.value.length)
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

function openAssignDialog(match: Match, slot: MatchSlot): void {
  selectedMatch.value = match
  selectedSlot.value = slot
  assignPlayerId.value = match[slot]
  assignDialogVisible.value = true
}

async function confirmAssign(): Promise<void> {
  if (!selectedMatch.value) return
  await matchesStore.assignPlayer(selectedMatch.value.id, {
    slot: selectedSlot.value,
    player_id: assignPlayerId.value,
  })
  assignDialogVisible.value = false
}

async function clearSlot(): Promise<void> {
  if (!selectedMatch.value) return
  await matchesStore.assignPlayer(selectedMatch.value.id, {
    slot: selectedSlot.value,
    player_id: null,
  })
  assignDialogVisible.value = false
}

function openResultDialog(match: Match): void {
  selectedMatch.value = match
  editResult.value = match.result ?? ''
  editWinnerId.value = match.winner_id
  resultDialogVisible.value = true
}

async function saveResult(): Promise<void> {
  if (!selectedMatch.value || !editResult.value || !editWinnerId.value) return
  await matchesStore.enterResult(selectedMatch.value.id, {
    result: editResult.value,
    winner_id: editWinnerId.value,
  })
  resultDialogVisible.value = false
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
          <Button
            v-if="auth.isAdmin"
            :label="tournament.published ? 'Nascondi' : 'Pubblica'"
            :icon="tournament.published ? 'pi pi-eye-slash' : 'pi pi-eye'"
            :severity="tournament.published ? 'secondary' : 'success'"
            size="small"
            outlined
            @click="publishToggle"
          />
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
              <!-- Admin mode -->
              <template v-if="auth.isAdmin">
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
                  </div>
                </template>
              </template>

              <!-- Player mode -->
              <template v-else>
                <div v-if="!myPlayer" class="flex flex-col items-center gap-3 py-8 text-muted-color text-center">
                  <i class="pi pi-exclamation-triangle text-2xl" />
                  <p class="m-0">Profilo giocatore non configurato.<br>Contatta l'amministratore.</p>
                </div>
                <template v-else>
                  <div class="flex items-center gap-3 mb-4">
                    <Button
                      v-if="!isEnrolled && tournament.status === 'upcoming'"
                      label="Iscriviti"
                      icon="pi pi-user-plus"
                      @click="handleEnroll"
                    />
                    <Button
                      v-else-if="isEnrolled && tournament.status === 'upcoming'"
                      label="Ritirati"
                      icon="pi pi-user-minus"
                      severity="danger"
                      outlined
                      @click="handleWithdraw"
                    />
                  </div>
                  <div class="flex flex-col gap-2">
                    <div
                      v-for="(player, index) in enrolledPlayers"
                      :key="player.id"
                      class="flex items-center gap-3 p-3 rounded-lg bg-surface-50 border border-surface-200"
                    >
                      <span class="text-sm font-bold text-muted-color w-8">#{{ index + 1 }}</span>
                      <span class="font-medium text-color">{{ player.name }}</span>
                    </div>
                  </div>
                </template>
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

              <template v-else>
                <div v-if="auth.isAdmin" class="flex items-center gap-2">
                  <Button
                    v-if="!hasMatches"
                    label="Crea tabellone vuoto"
                    icon="pi pi-plus"
                    size="small"
                    @click="createEmptyBracket"
                  />
                  <Button
                    v-if="hasMatches"
                    label="Azzera tabellone"
                    icon="pi pi-refresh"
                    severity="danger"
                    outlined
                    size="small"
                    :loading="resettingDraw"
                    @click="confirmResetDraw"
                  />
                </div>

                <div v-if="!hasMatches" class="flex flex-col items-center justify-center gap-3 min-h-[220px] text-center text-muted-color">
                  <i class="pi pi-sitemap text-[2rem] text-muted-color" />
                  <p class="m-0">Nessun tabellone generato.<template v-if="auth.isAdmin"> Clicca <strong>Crea tabellone vuoto</strong> per iniziare.</template></p>
                </div>

                <div v-else class="grid gap-4 items-start grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
                  <div v-for="(roundMatches, roundIndex) in bracketRounds" :key="roundIndex" class="flex flex-col gap-3">
                    <div class="text-sm font-bold text-muted-color uppercase tracking-[0.04em]">{{ roundLabels[roundIndex] }}</div>
                    <div class="flex flex-col gap-3">
                      <div
                        v-for="match in roundMatches"
                        :key="match.id"
                        class="flex flex-col border border-surface-200 rounded-xl bg-surface-0 overflow-hidden"
                      >
                        <!-- Player 1 slot -->
                        <div
                          class="flex items-center justify-between gap-3 px-4 py-[0.85rem]"
                          :class="{
                            'bg-green-500/15': isWinner(match, 'player1_id'),
                            'text-muted-color': isByeSlot(match, 'player1_id') || isTbdSlot(match, 'player1_id'),
                            'cursor-pointer hover:bg-surface-100': auth.isAdmin,
                          }"
                          @click="auth.isAdmin && openAssignDialog(match, 'player1_id')"
                        >
                          <div class="flex items-center gap-[0.625rem] min-w-0">
                            <span v-if="getSeed(match.player1_id)" class="text-[0.75rem] font-bold text-muted-color shrink-0">#{{ getSeed(match.player1_id) }}</span>
                            <span class="font-semibold text-inherit whitespace-nowrap overflow-hidden text-ellipsis">{{ getSlotLabel(match, 'player1_id') }}</span>
                          </div>
                          <i v-if="auth.isAdmin" class="pi pi-pencil text-xs text-muted-color" />
                        </div>

                        <!-- Player 2 slot -->
                        <div
                          class="flex items-center justify-between gap-3 px-4 py-[0.85rem] border-t border-surface-200"
                          :class="{
                            'bg-green-500/15': isWinner(match, 'player2_id'),
                            'text-muted-color': isByeSlot(match, 'player2_id') || isTbdSlot(match, 'player2_id'),
                            'cursor-pointer hover:bg-surface-100': auth.isAdmin,
                          }"
                          @click="auth.isAdmin && openAssignDialog(match, 'player2_id')"
                        >
                          <div class="flex items-center gap-[0.625rem] min-w-0">
                            <span v-if="getSeed(match.player2_id)" class="text-[0.75rem] font-bold text-muted-color shrink-0">#{{ getSeed(match.player2_id) }}</span>
                            <span class="font-semibold text-inherit whitespace-nowrap overflow-hidden text-ellipsis">{{ getSlotLabel(match, 'player2_id') }}</span>
                          </div>
                          <i v-if="auth.isAdmin" class="pi pi-pencil text-xs text-muted-color" />
                        </div>

                        <!-- Result area -->
                        <div
                          v-if="match.player1_id && match.player2_id"
                          class="text-xs text-center p-2 border-t border-surface-200 text-muted-color"
                          :class="{ 'cursor-pointer hover:bg-surface-100': auth.isAdmin }"
                          @click="auth.isAdmin && openResultDialog(match)"
                        >
                          {{ match.result || (auth.isAdmin ? 'Inserisci risultato' : '—') }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
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

  <Dialog v-model:visible="assignDialogVisible" header="Assegna giocatore" modal :style="{ width: '340px' }">
    <div class="flex flex-col gap-4 pt-2">
      <Select
        v-model="assignPlayerId"
        :options="availableForSlot"
        option-label="name"
        option-value="id"
        placeholder="Seleziona giocatore"
        fluid
      />
      <div class="flex justify-end gap-2">
        <Button v-if="selectedSlotHasPlayer" label="Rimuovi" severity="danger" outlined @click="clearSlot" />
        <Button label="Annulla" severity="secondary" outlined @click="assignDialogVisible = false" />
        <Button label="Assegna" :disabled="!assignPlayerId" @click="confirmAssign" />
      </div>
    </div>
  </Dialog>

  <Dialog v-model:visible="resultDialogVisible" header="Inserisci risultato" modal :style="{ width: '360px' }">
    <div class="flex flex-col gap-4 pt-2">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Risultato</label>
        <InputText v-model="editResult" placeholder="es. 6-3 6-4" fluid />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Vincitore</label>
        <div class="flex flex-col gap-2">
          <div
            class="flex items-center gap-2 p-3 rounded-lg border cursor-pointer"
            :class="editWinnerId === selectedMatch?.player1_id ? 'border-primary-400 bg-primary-50' : 'border-surface-200'"
            @click="editWinnerId = selectedMatch?.player1_id ?? null"
          >
            <i class="pi pi-circle-fill text-xs" :class="editWinnerId === selectedMatch?.player1_id ? 'text-primary-500' : 'text-surface-300'" />
            <span>{{ getPlayerName(selectedMatch?.player1_id) }}</span>
          </div>
          <div
            class="flex items-center gap-2 p-3 rounded-lg border cursor-pointer"
            :class="editWinnerId === selectedMatch?.player2_id ? 'border-primary-400 bg-primary-50' : 'border-surface-200'"
            @click="editWinnerId = selectedMatch?.player2_id ?? null"
          >
            <i class="pi pi-circle-fill text-xs" :class="editWinnerId === selectedMatch?.player2_id ? 'text-primary-500' : 'text-surface-300'" />
            <span>{{ getPlayerName(selectedMatch?.player2_id) }}</span>
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <Button label="Annulla" severity="secondary" outlined @click="resultDialogVisible = false" />
        <Button label="Salva" :disabled="!editResult || !editWinnerId" @click="saveResult" />
      </div>
    </div>
  </Dialog>
</template>
