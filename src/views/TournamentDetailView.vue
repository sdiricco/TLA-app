<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTournamentsStore } from '../stores/tournaments'
import { usePlayersStore } from '../stores/players'
import { useMatchesStore } from '../stores/matches'
import { useAuthStore } from '../stores/auth'
import { playersService } from '../services/playersApi'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import type { Match, MatchSlot, Player, TournamentStatus, TournamentWithPlayers } from '../types'

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
const selectedPlayerIds = ref<string[]>([])
const addingPlayer = ref(false)
const savingSeeds = ref(false)
const selectedRemovePlayerIds = ref<string[]>([])
const resettingDraw = ref(false)
const updatingStatus = ref(false)
const activeBracketRound = ref(1)
const bracketViewMode = ref<'rounds' | 'global'>('rounds')
const printableBracketRef = ref<HTMLElement | null>(null)

const localOrder = ref<Player[]>([])
const dragIndex = ref<number | null>(null)

const selectedMatch = ref<Match | null>(null)
const selectedSlot = ref<MatchSlot>('player1_id')
const assignPlayerId = ref<string | null>(null)

const resultDialogVisible = ref(false)
const resultMatch = ref<Match | null>(null)
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
      playersStore.fetchAll({ page: 0, perPage: 100 }),
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

type PlayerSelectOption = Player & { searchText: string }

const availablePlayersOptions = computed<PlayerSelectOption[]>(() =>
  availablePlayers.value.map((player) => ({
    ...player,
    searchText: [player.name, player.club ?? '', String(player.ranking)].join(' ').toLowerCase(),
  })),
)

const playerById = computed(() => new Map(playersStore.players.map((player) => [player.id, player])))
const seedByPlayerId = computed(() => {
  const entries = tournament.value?.tournament_players ?? []
  return new Map(entries.filter((entry) => entry.seed != null).map((entry) => [entry.player_id, entry.seed as number]))
})
const hasMatches = computed(() => matchesStore.matches.length > 0)
const isRoundRobin = computed(() => tournament.value?.format === 'round_robin')
const isRoundRobinElimination = computed(() => tournament.value?.format === 'round_robin_elimination')
const orderChanged = computed(
  () => localOrder.value.map((player) => player.id).join(',') !== enrolledPlayers.value.map((player) => player.id).join(','),
)
const allPlayersSelected = computed(
  () => localOrder.value.length > 0 && selectedRemovePlayerIds.value.length === localOrder.value.length,
)
const somePlayersSelected = computed(
  () => selectedRemovePlayerIds.value.length > 0 && selectedRemovePlayerIds.value.length < localOrder.value.length,
)
const canViewAdmin = computed(() => auth.isAdmin || auth.isGuest)
const canModify = computed(() => !auth.isGuest)
const canAddMorePlayers = computed(() => {
  const limit = tournament.value?.participant_limit
  if (!limit) return true
  return enrolledPlayers.value.length < limit
})
const bracketRoundTabs = computed(() =>
  Array.from({ length: matchesStore.numRounds }, (_, index) => {
    const round = index + 1
    const remaining = matchesStore.numRounds - round + 1
    return {
      round,
      label: getRoundShortLabel(remaining),
      fullLabel: getRoundLongLabel(remaining),
    }
  }),
)
const activeBracketMatches = computed(() =>
  (matchesStore.matchesByRound.get(activeBracketRound.value) ?? []).filter(
    (match): match is Match => Boolean(match),
  ),
)
const globalBracketTotalRows = computed(() => Math.max(1, 2 ** Math.max(0, matchesStore.numRounds - 1)))
const globalBracketColumns = computed(() =>
  bracketRoundTabs.value.map((tab) => {
    const matches = (matchesStore.matchesByRound.get(tab.round) ?? []).filter(
      (match): match is Match => Boolean(match),
    )
    const rowSpan = 2 ** (tab.round - 1)
    return {
      ...tab,
      rowSpan,
      matches: matches.map((match) => ({
        match,
        rowStart: match.position * rowSpan + 1,
      })),
    }
  }),
)

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

const availableForSlotOptions = computed<PlayerSelectOption[]>(() =>
  availableForSlot.value.map((player) => ({
    ...player,
    searchText: [player.name, player.club ?? '', String(player.ranking)].join(' ').toLowerCase(),
  })),
)

function getGlobalMatchStyle(round: number, position: number): Record<string, string> {
  const rowSpan = 2 ** (round - 1)
  const rowStart = position * rowSpan + 1
  return { gridRow: `${rowStart} / span ${rowSpan}` }
}

function getRoundShortLabel(remainingRounds: number): string {
  if (remainingRounds === 1) return 'F'
  if (remainingRounds === 2) return 'SF'
  if (remainingRounds === 3) return 'QF'
  return `R${2 ** remainingRounds}`
}

function getRoundLongLabel(remainingRounds: number): string {
  if (remainingRounds === 1) return 'Finale'
  if (remainingRounds === 2) return 'Semifinale'
  if (remainingRounds === 3) return 'Quarti di finale'
  if (remainingRounds === 4) return 'Ottavi di finale'
  return `Round of ${2 ** remainingRounds}`
}

function buildPrintableBracketHtml(): string {
  const styles = Array.from(document.head.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join('')

  return `<!doctype html>
    <html>
      <head>
        <title>Tabellone - ${tournament.value?.name ?? ''}</title>
        ${styles}
        <style>
          @page { size: landscape; margin: 12mm; }
          html, body { margin: 0; padding: 0; background: #fff; color: #111; }
          body { padding: 24px; }
        </style>
      </head>
      <body>
        ${printableBracketRef.value?.outerHTML ?? ''}
      </body>
    </html>`
}

async function printBracket(): Promise<void> {
  bracketViewMode.value = 'global'
  await nextTick()
  const target = printableBracketRef.value
  if (!target) return

  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.opacity = '0'
  iframe.setAttribute('aria-hidden', 'true')
  iframe.srcdoc = buildPrintableBracketHtml()

  const cleanup = (): void => {
    window.setTimeout(() => {
      iframe.remove()
    }, 1000)
  }

  iframe.onload = () => {
    const printWindow = iframe.contentWindow
    if (!printWindow) {
      cleanup()
      toast.add({ severity: 'error', summary: 'Errore', detail: 'Impossibile aprire la finestra di stampa', life: 4000 })
      return
    }

    const afterPrint = (): void => {
      cleanup()
    }

    printWindow.addEventListener('afterprint', afterPrint, { once: true })
    window.setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, 350)
  }

  document.body.appendChild(iframe)
}

watch(
  () => matchesStore.numRounds,
  (numRounds) => {
    if (numRounds < 1) {
      activeBracketRound.value = 1
      return
    }
    activeBracketRound.value = 1
  },
  { immediate: true },
)

watch(
  localOrder,
  (players) => {
    const validIds = new Set(players.map((player) => player.id))
    selectedRemovePlayerIds.value = selectedRemovePlayerIds.value.filter((id) => validIds.has(id))
  },
  { immediate: true },
)

function statusSeverity(status: string): string {
  return ({ upcoming: 'info', ongoing: 'success', completed: 'secondary' } as Record<string, string>)[status] ?? 'secondary'
}

function statusLabel(status: string): string {
  return ({ upcoming: 'In programma', ongoing: 'In corso', completed: 'Completato' } as Record<string, string>)[status] ?? status
}

function formatParticipantLimit(limit: number | null | undefined): string {
  if (!limit) return 'Illimitato'
  return `${limit} max`
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatAge(birthDate: string | null | undefined): string {
  if (!birthDate) return 'Età non disponibile'
  const dob = new Date(birthDate)
  if (Number.isNaN(dob.getTime())) return 'Età non disponibile'
  const diff = Date.now() - dob.getTime()
  const ageDate = new Date(diff)
  return `${Math.abs(ageDate.getUTCFullYear() - 1970)} anni`
}

function getPlayerInitials(player: Player): string {
  return player.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function getPlayerInitialsById(playerId: string | null | undefined): string {
  if (!playerId) return ''
  const player = playerById.value.get(playerId)
  return player ? getPlayerInitials(player) : ''
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

function isSeededPlayer(playerId: string | null): boolean {
  return getSeed(playerId) !== null
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

function toggleRemoveAll(checked: boolean): void {
  selectedRemovePlayerIds.value = checked ? localOrder.value.map((player) => player.id) : []
}

function toggleRemovePlayer(playerId: string, checked: boolean): void {
  if (checked) {
    if (!selectedRemovePlayerIds.value.includes(playerId)) {
      selectedRemovePlayerIds.value = [...selectedRemovePlayerIds.value, playerId]
    }
    return
  }
  selectedRemovePlayerIds.value = selectedRemovePlayerIds.value.filter((id) => id !== playerId)
}

async function publishToggle(): Promise<void> {
  if (auth.isGuest) return
  if (!tournament.value) return
  await tournamentsStore.setPublished(tournament.value.id, !tournament.value.published)
  await loadTournament()
}

async function setTournamentStatus(status: TournamentStatus): Promise<void> {
  if (auth.isGuest) return
  if (!tournament.value || tournament.value.status === status) return
  updatingStatus.value = true
  try {
    await tournamentsStore.update(tournament.value.id, { status })
    await loadTournament()
    toast.add({
      severity: 'success',
      summary: 'Aggiornato',
      detail: `Torneo segnato come ${statusLabel(status).toLowerCase()}`,
      life: 3000,
    })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    updatingStatus.value = false
  }
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
  if (selectedPlayerIds.value.length === 0 || !tournament.value) return
  addingPlayer.value = true
  try {
    const addedCount = selectedPlayerIds.value.length
    for (const playerId of selectedPlayerIds.value) {
      await tournamentsStore.addPlayer(tournament.value.id, playerId)
    }
    await loadTournament()
    selectedPlayerIds.value = []
    toast.add({
      severity: 'success',
      summary: 'Aggiunti',
      detail: `${addedCount} giocatori iscritti`,
      life: 3000,
    })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    addingPlayer.value = false
  }
}

function confirmRemovePlayers(players: Player[]): void {
  if (players.length === 0) return
  confirm.require({
    message:
      players.length === 1
        ? `Rimuovere ${players[0]?.name ?? 'il giocatore selezionato'} da questo torneo?`
        : `Rimuovere ${players.length} giocatori selezionati da questo torneo?`,
    header: 'Conferma rimozione',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Annulla',
    acceptLabel: 'Rimuovi',
    acceptSeverity: 'danger',
    accept: async () => {
      if (!tournament.value) return
      try {
        for (const player of players) {
          await tournamentsStore.removePlayer(tournament.value.id, player.id)
        }
        await loadTournament()
        selectedRemovePlayerIds.value = []
        toast.add({
          severity: 'success',
          summary: 'Rimosso',
          detail:
            players.length === 1
              ? `${players[0]?.name ?? 'Giocatore'} rimosso`
              : `${players.length} giocatori rimossi`,
          life: 3000,
        })
      } catch (error) {
        toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
      }
    },
  })
}

function removeSelectedPlayers(): void {
  const players = localOrder.value.filter((player) => selectedRemovePlayerIds.value.includes(player.id))
  confirmRemovePlayers(players)
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
  if (auth.isGuest) return
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
  if (auth.isGuest) return
  if (!tournament.value || enrolledPlayers.value.length < 2) return
  await matchesStore.createEmptyBracket(tournament.value.id, enrolledPlayers.value.length)
  activeBracketRound.value = 1
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

function openAssignPanel(match: Match, slot: MatchSlot): void {
  if (auth.isGuest) return
  selectedMatch.value = match
  selectedSlot.value = slot
  assignPlayerId.value = match[slot]
  editResult.value = match.result ?? ''
  editWinnerId.value = match.winner_id
}

async function confirmAssign(): Promise<void> {
  if (auth.isGuest) return
  if (!selectedMatch.value) return
  await matchesStore.assignPlayer(selectedMatch.value.id, {
    slot: selectedSlot.value,
    player_id: assignPlayerId.value,
  })
  await loadPage()
  closeMatchPanel()
}

async function clearSlot(): Promise<void> {
  if (auth.isGuest) return
  if (!selectedMatch.value) return
  await matchesStore.assignPlayer(selectedMatch.value.id, {
    slot: selectedSlot.value,
    player_id: null,
  })
  await loadPage()
  closeMatchPanel()
}

function openResultPanel(match: Match): void {
  if (auth.isGuest) return
  resultMatch.value = match
  editResult.value = match.result ?? ''
  editWinnerId.value = match.winner_id
  resultDialogVisible.value = true
}

async function saveResult(): Promise<void> {
  if (auth.isGuest) return
  if (!resultMatch.value || !editResult.value || !editWinnerId.value) return
  await matchesStore.enterResult(resultMatch.value.id, {
    result: editResult.value,
    winner_id: editWinnerId.value,
  })
  await loadPage()
  resultDialogVisible.value = false
  resultMatch.value = null
  editResult.value = ''
  editWinnerId.value = null
}

function closeResultDialog(): void {
  resultDialogVisible.value = false
  resultMatch.value = null
  editResult.value = ''
  editWinnerId.value = null
}

function closeMatchPanel(): void {
  selectedMatch.value = null
  assignPlayerId.value = null
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
            v-if="canViewAdmin"
            :label="tournament.published ? 'Nascondi' : 'Pubblica'"
            :icon="tournament.published ? 'pi pi-eye-slash' : 'pi pi-eye'"
            :severity="tournament.published ? 'secondary' : 'success'"
            size="small"
            outlined
            :disabled="auth.isGuest"
            @click="publishToggle"
          />
          <Button
            v-if="canModify && tournament.status === 'upcoming'"
            label="Avvia torneo"
            icon="pi pi-play"
            size="small"
            severity="success"
            :loading="updatingStatus"
            @click="setTournamentStatus('ongoing')"
          />
          <Button
            v-if="canModify && tournament.status === 'ongoing'"
            label="Chiudi torneo"
            icon="pi pi-check"
            size="small"
            severity="secondary"
            outlined
            :loading="updatingStatus"
            @click="setTournamentStatus('completed')"
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
          <span class="inline-flex items-center gap-[0.375rem] px-3 py-1 rounded-full bg-surface-100 text-sm text-color">
            <i class="pi pi-users" /> Limite partecipanti {{ formatParticipantLimit(tournament.participant_limit) }}
          </span>
          <span v-if="tournament.format === 'round_robin_elimination'" class="inline-flex items-center gap-[0.375rem] px-3 py-1 rounded-full bg-surface-100 text-sm text-color">
            <i class="pi pi-sitemap" />
            {{ tournament.group_count ?? '—' }} gironi · {{ tournament.qualifiers_per_group ?? '—' }} qualificati/girone
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
              <template v-if="canViewAdmin">
                <div class="flex items-center justify-between gap-3 flex-wrap">
                  <span class="text-sm text-muted-color">
                    {{ enrolledPlayers.length }} giocatori iscritti
                    <template v-if="tournament.participant_limit"> su {{ tournament.participant_limit }}</template>
                  </span>
                  <span v-if="!canAddMorePlayers && tournament.participant_limit" class="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    Torneo al completo
                  </span>
                </div>

                <div class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
                  <div class="mb-3 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <div class="font-semibold text-color">Aggiungi giocatori</div>
                      <div class="text-sm text-muted-color">Ricerca e selezione multipla con chip</div>
                    </div>
                    <Button
                      label="Aggiungi"
                      icon="pi pi-user-plus"
                      size="small"
                      :disabled="availablePlayers.length === 0 || auth.isGuest || !canAddMorePlayers || selectedPlayerIds.length === 0"
                      :loading="addingPlayer"
                      @click="addPlayer"
                    />
                  </div>
                  <MultiSelect
                    v-model="selectedPlayerIds"
                    :options="availablePlayersOptions"
                    option-label="name"
                    option-value="id"
                    display="chip"
                    filter
                    filter-placeholder="Cerca nome, club o ranking"
                    :filter-fields="['searchText']"
                    placeholder="Seleziona uno o più giocatori"
                    selected-items-label="{0} giocatori selezionati"
                    :max-selected-labels="2"
                    fluid
                  >
                    <template #option="{ option }">
                      <div class="flex w-full items-center gap-3 py-1">
                        <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-50 text-sm font-bold text-primary-700">
                          <img
                            v-if="option.photo_url"
                            :src="option.photo_url"
                            :alt="option.name"
                            class="h-full w-full rounded-full object-cover"
                          />
                          <span v-else>{{ getPlayerInitials(option) }}</span>
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center gap-2">
                            <span class="truncate font-medium text-color">{{ option.name }}</span>
                            <Tag :value="`#${option.ranking}`" severity="secondary" class="text-[0.65rem]" />
                          </div>
                          <div class="text-xs text-muted-color">
                            <template v-if="option.club">{{ option.club }} · </template>{{ formatAge(option.birth_date) }}
                          </div>
                        </div>
                      </div>
                    </template>
                    <template #chip="{ value }">
                      <div class="flex items-center gap-2">
                        <span class="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-100 text-[0.65rem] font-bold text-primary-700">
                          {{ getPlayerInitialsById(value) }}
                        </span>
                        <span>{{ getPlayerName(value) }}</span>
                      </div>
                    </template>
                  </MultiSelect>
                </div>

                <div v-if="localOrder.length === 0" class="flex flex-col items-center justify-center gap-3 min-h-[220px] text-center text-muted-color">
                  <i class="pi pi-users text-[2rem] text-muted-color" />
                  <p class="m-0">Nessun giocatore iscritto.<br />Clicca <strong>Aggiungi giocatore</strong> per iniziare.</p>
                </div>

                <template v-else>
                  <div class="flex flex-col gap-[0.375rem]">
                    <div class="flex items-center justify-between gap-3 rounded-lg border border-surface-200 bg-surface-50 px-3 py-2">
                      <label class="inline-flex items-center gap-2 text-sm font-medium cursor-pointer">
                        <Checkbox
                          :binary="true"
                          :model-value="allPlayersSelected"
                          :indeterminate="somePlayersSelected"
                          @update:model-value="toggleRemoveAll"
                        />
                        <span>Seleziona tutto</span>
                      </label>
                      <Button
                        label="Rimuovi selezionati"
                        icon="pi pi-trash"
                        size="small"
                        severity="danger"
                        outlined
                        :disabled="selectedRemovePlayerIds.length === 0 || auth.isGuest"
                        @click="removeSelectedPlayers"
                      />
                    </div>
                    <div
                      v-for="(player, index) in localOrder"
                      :key="player.id"
                      class="flex items-center gap-3 p-3 rounded-lg bg-surface-50 border border-surface-200 cursor-grab"
                      :class="{ 'opacity-50 cursor-grabbing': dragIndex === index }"
                      :draggable="canModify"
                      @dragstart="canModify && onDragStart(index)"
                      @dragover.prevent
                      @dragend="dragIndex = null"
                      @drop="canModify && onDrop(index)"
                    >
                        <span class="text-muted-color cursor-grab" aria-hidden="true">
                          <i class="pi pi-bars" />
                        </span>
                        <Checkbox
                          :binary="true"
                          :model-value="selectedRemovePlayerIds.includes(player.id)"
                          :disabled="auth.isGuest"
                          @update:model-value="(checked) => toggleRemovePlayer(player.id, checked)"
                          @click.stop
                        />
                      <span class="text-sm font-bold text-muted-color w-8 shrink-0">#{{ index + 1 }}</span>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="block font-medium text-color" :class="{ 'font-semibold text-primary-700': isSeededPlayer(player.id) }">
                            {{ player.name }}
                          </span>
                          <span
                            v-if="getSeed(player.id)"
                            class="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-primary-200 bg-primary-50 px-2 text-[0.7rem] font-bold text-primary-700"
                          >
                            TS {{ getSeed(player.id) }}
                          </span>
                        </div>
                        <span class="block text-[0.8125rem] text-muted-color">
                          <template v-if="player.club">{{ player.club }} · </template>Rank {{ player.ranking }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="flex items-center gap-2 pt-2 flex-wrap">
                    <Button
                      label="Salva ordine"
                      icon="pi pi-save"
                      outlined
                      :disabled="!orderChanged || auth.isGuest"
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
                      :disabled="!canAddMorePlayers"
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
                  <div v-if="!canAddMorePlayers && tournament.participant_limit" class="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                    Torneo al completo: raggiunto il limite di {{ tournament.participant_limit }} partecipanti.
                  </div>
                  <div class="flex flex-col gap-2">
                    <div
                      v-for="(player, index) in enrolledPlayers"
                      :key="player.id"
                      class="flex items-center gap-3 p-3 rounded-lg bg-surface-50 border border-surface-200"
                    >
                      <span class="text-sm font-bold text-muted-color w-8">#{{ index + 1 }}</span>
                      <span class="font-medium text-color" :class="{ 'font-semibold text-primary-700': isSeededPlayer(player.id) }">{{ player.name }}</span>
                      <span
                        v-if="getSeed(player.id)"
                        class="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-primary-200 bg-primary-50 px-2 text-[0.7rem] font-bold text-primary-700"
                      >
                        TS {{ getSeed(player.id) }}
                      </span>
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
                <div v-if="isRoundRobinElimination" class="rounded-xl border border-dashed border-surface-200 bg-surface-50 px-4 py-3 text-sm text-muted-color">
                  Formato gironi + finale: la fase finale si gestisce qui nel tabellone eliminatorio.
                </div>

                <div class="flex items-center justify-between gap-3 flex-wrap">
                  <div v-if="canViewAdmin" class="flex items-center gap-2">
                    <Button
                      v-if="!hasMatches"
                      label="Genera tabellone"
                      icon="pi pi-plus"
                      size="small"
                      :disabled="auth.isGuest"
                      @click="createEmptyBracket"
                    />
                    <Button
                      v-if="hasMatches"
                      label="Azzera tabellone"
                      icon="pi pi-refresh"
                      severity="danger"
                      outlined
                      size="small"
                      :disabled="auth.isGuest"
                      :loading="resettingDraw"
                      @click="confirmResetDraw"
                    />
                  </div>

                  <div v-if="hasMatches" class="flex items-center gap-2">
                    <Button
                      label="Vista turni"
                      icon="pi pi-list"
                      size="small"
                      :severity="bracketViewMode === 'rounds' ? 'primary' : 'secondary'"
                      :outlined="bracketViewMode !== 'rounds'"
                      @click="bracketViewMode = 'rounds'"
                    />
                    <Button
                      label="Vista globale"
                      icon="pi pi-sitemap"
                      size="small"
                      :severity="bracketViewMode === 'global' ? 'primary' : 'secondary'"
                      :outlined="bracketViewMode !== 'global'"
                      @click="bracketViewMode = 'global'"
                    />
                    <Button
                      label="Stampa"
                      icon="pi pi-print"
                      size="small"
                      outlined
                      @click="printBracket"
                    />
                  </div>
                </div>

                <div v-if="!hasMatches" class="flex flex-col items-center justify-center gap-3 min-h-[220px] text-center text-muted-color">
                  <i class="pi pi-sitemap text-[2rem] text-muted-color" />
                  <p class="m-0">Nessun tabellone generato.<template v-if="canViewAdmin"> Clicca <strong>Genera tabellone</strong> per iniziare.</template></p>
                </div>

                <div v-else class="flex flex-col gap-4">
                  <div v-if="bracketViewMode === 'rounds'" class="flex flex-col gap-4">
                    <div class="flex flex-wrap gap-2">
                      <Button
                        v-for="tab in bracketRoundTabs"
                        :key="tab.round"
                        :label="tab.label"
                        :title="tab.fullLabel"
                        size="small"
                        :severity="activeBracketRound === tab.round ? 'primary' : 'secondary'"
                        :outlined="activeBracketRound !== tab.round"
                        @click="activeBracketRound = tab.round"
                      />
                    </div>

                    <div
                      v-if="activeBracketMatches.length === 0"
                      class="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-surface-200 text-muted-color"
                    >
                      Nessun incontro disponibile per questo turno.
                    </div>

                    <div v-else class="flex flex-col gap-3">
                      <div class="text-sm font-bold text-muted-color uppercase tracking-[0.04em]">
                        {{ bracketRoundTabs.find((tab) => tab.round === activeBracketRound)?.fullLabel }}
                      </div>
                      <div class="flex flex-col gap-3">
                        <div
                          v-for="match in activeBracketMatches"
                          :key="match.id"
                          class="flex min-h-[9.5rem] flex-col overflow-hidden rounded-2xl border border-surface-200 bg-surface-0 shadow-sm"
                        >
                          <div class="flex items-center justify-between gap-3 border-b border-surface-100 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted-color">
                            <span>Match {{ match.position + 1 }}</span>
                            <span v-if="match.result">{{ match.result }}</span>
                            <span v-else-if="canViewAdmin">Da giocare</span>
                          </div>

                          <div
                            class="flex flex-1 items-center justify-between gap-3 px-4 py-3 transition-colors"
                            :class="{
                              'bg-emerald-500/10': isWinner(match, 'player1_id'),
                              'text-muted-color': isByeSlot(match, 'player1_id') || isTbdSlot(match, 'player1_id'),
                              'cursor-pointer hover:bg-surface-100': canModify,
                            }"
                            @click="canModify && openAssignPanel(match, 'player1_id')"
                          >
                            <div class="flex min-w-0 items-center gap-3">
                              <span
                                v-if="getSeed(match.player1_id)"
                                class="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-primary-200 bg-primary-50 px-2 text-[0.75rem] font-bold text-primary-700"
                              >
                                TS {{ getSeed(match.player1_id) }}
                              </span>
                              <span class="overflow-hidden whitespace-nowrap text-ellipsis font-semibold text-inherit" :class="{ 'text-primary-700': isSeededPlayer(match.player1_id) }">
                                {{ getSlotLabel(match, 'player1_id') }}
                              </span>
                            </div>
                            <i v-if="isWinner(match, 'player1_id')" class="pi pi-check text-sm text-emerald-600" />
                            <i v-else-if="canViewAdmin" class="pi pi-pencil text-xs text-muted-color" />
                          </div>

                          <div
                            class="flex flex-1 items-center justify-between gap-3 border-t border-surface-100 px-4 py-3 transition-colors"
                            :class="{
                              'bg-emerald-500/10': isWinner(match, 'player2_id'),
                              'text-muted-color': isByeSlot(match, 'player2_id') || isTbdSlot(match, 'player2_id'),
                              'cursor-pointer hover:bg-surface-100': canModify,
                            }"
                            @click="canModify && openAssignPanel(match, 'player2_id')"
                          >
                            <div class="flex min-w-0 items-center gap-3">
                              <span
                                v-if="getSeed(match.player2_id)"
                                class="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-primary-200 bg-primary-50 px-2 text-[0.75rem] font-bold text-primary-700"
                              >
                                TS {{ getSeed(match.player2_id) }}
                              </span>
                              <span class="overflow-hidden whitespace-nowrap text-ellipsis font-semibold text-inherit" :class="{ 'text-primary-700': isSeededPlayer(match.player2_id) }">
                                {{ getSlotLabel(match, 'player2_id') }}
                              </span>
                            </div>
                            <i v-if="isWinner(match, 'player2_id')" class="pi pi-check text-sm text-emerald-600" />
                            <i v-else-if="canViewAdmin" class="pi pi-pencil text-xs text-muted-color" />
                          </div>

                          <div
                            v-if="match.player1_id && match.player2_id"
                            class="border-t border-surface-100 px-4 py-2 text-center text-xs text-muted-color"
                            :class="{ 'cursor-pointer hover:bg-surface-100': canModify }"
                            @click="canModify && openResultPanel(match)"
                          >
                            <span class="font-medium">
                              {{ match.result || (canViewAdmin ? 'Inserisci risultato' : '—') }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else class="flex flex-col gap-4">
                    <div ref="printableBracketRef" class="overflow-x-auto rounded-2xl border border-surface-200 bg-surface-50/50 p-4">
                      <div
                        class="bracket-global min-w-max grid items-center gap-6"
                        :style="{ gridTemplateColumns: `repeat(${globalBracketColumns.length}, minmax(16rem, 1fr))` }"
                      >
                        <div v-for="column in globalBracketColumns" :key="column.round" class="flex min-w-0 flex-col justify-center gap-3">
                          <div class="text-sm font-bold text-muted-color uppercase tracking-[0.04em]">
                            {{ column.fullLabel }}
                          </div>
                          <div
                            class="global-round-column grid gap-3 items-center"
                            :style="{ gridTemplateRows: `repeat(${globalBracketTotalRows}, minmax(5.5rem, 1fr))` }"
                          >
                            <div
                              v-for="entry in column.matches"
                              :key="entry.match.id"
                              class="flex h-full min-h-[9.5rem] flex-col self-center overflow-hidden rounded-2xl border border-surface-200 bg-surface-0 shadow-sm"
                              :style="getGlobalMatchStyle(column.round, entry.match.position)"
                            >
                              <div class="flex items-center justify-between gap-3 border-b border-surface-100 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted-color">
                                <span>Match {{ entry.match.position + 1 }}</span>
                                <span v-if="entry.match.result">{{ entry.match.result }}</span>
                                <span v-else-if="canViewAdmin">Da giocare</span>
                              </div>

                              <div
                                class="flex flex-1 items-center justify-between gap-3 px-4 py-3 transition-colors"
                                :class="{
                                  'bg-emerald-500/10': isWinner(entry.match, 'player1_id'),
                                  'text-muted-color': isByeSlot(entry.match, 'player1_id') || isTbdSlot(entry.match, 'player1_id'),
                                  'cursor-pointer hover:bg-surface-100': canModify,
                                }"
                                @click="canModify && openAssignPanel(entry.match, 'player1_id')"
                              >
                                <div class="flex min-w-0 items-center gap-3">
                                  <span
                                    v-if="getSeed(entry.match.player1_id)"
                                    class="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-primary-200 bg-primary-50 px-2 text-[0.75rem] font-bold text-primary-700"
                                  >
                                    TS {{ getSeed(entry.match.player1_id) }}
                                  </span>
                                  <span class="overflow-hidden whitespace-nowrap text-ellipsis font-semibold text-inherit" :class="{ 'text-primary-700': isSeededPlayer(entry.match.player1_id) }">
                                    {{ getSlotLabel(entry.match, 'player1_id') }}
                                  </span>
                                </div>
                                <i v-if="isWinner(entry.match, 'player1_id')" class="pi pi-check text-sm text-emerald-600" />
                                <i v-else-if="canViewAdmin" class="pi pi-pencil text-xs text-muted-color" />
                              </div>

                              <div
                                class="flex flex-1 items-center justify-between gap-3 border-t border-surface-100 px-4 py-3 transition-colors"
                                :class="{
                                  'bg-emerald-500/10': isWinner(entry.match, 'player2_id'),
                                  'text-muted-color': isByeSlot(entry.match, 'player2_id') || isTbdSlot(entry.match, 'player2_id'),
                                  'cursor-pointer hover:bg-surface-100': canModify,
                                }"
                                @click="canModify && openAssignPanel(entry.match, 'player2_id')"
                              >
                                <div class="flex min-w-0 items-center gap-3">
                                  <span
                                    v-if="getSeed(entry.match.player2_id)"
                                    class="inline-flex h-7 min-w-7 items-center justify-center rounded-full border border-primary-200 bg-primary-50 px-2 text-[0.75rem] font-bold text-primary-700"
                                  >
                                    TS {{ getSeed(entry.match.player2_id) }}
                                  </span>
                                  <span class="overflow-hidden whitespace-nowrap text-ellipsis font-semibold text-inherit" :class="{ 'text-primary-700': isSeededPlayer(entry.match.player2_id) }">
                                    {{ getSlotLabel(entry.match, 'player2_id') }}
                                  </span>
                                </div>
                                <i v-if="isWinner(entry.match, 'player2_id')" class="pi pi-check text-sm text-emerald-600" />
                                <i v-else-if="canViewAdmin" class="pi pi-pencil text-xs text-muted-color" />
                              </div>

                              <div
                                v-if="entry.match.player1_id && entry.match.player2_id"
                                class="border-t border-surface-100 px-4 py-2 text-center text-xs text-muted-color"
                                :class="{ 'cursor-pointer hover:bg-surface-100': canModify }"
                                @click="canModify && openResultPanel(entry.match)"
                              >
                                <span class="font-medium">
                                  {{ entry.match.result || (canViewAdmin ? 'Inserisci risultato' : '—') }}
                                </span>
                              </div>
                            </div>
                          </div>
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

      <div v-if="selectedMatch && canModify" class="rounded-2xl border border-surface-200 bg-surface-50 p-4">
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div class="font-semibold text-color">Incontro selezionato</div>
            <div class="text-sm text-muted-color">Modifica assegnazione e risultato senza modali</div>
          </div>
          <Button label="Chiudi" severity="secondary" outlined size="small" @click="closeMatchPanel" />
        </div>

        <div class="mt-4 grid gap-4 lg:grid-cols-2">
          <div class="rounded-xl border border-surface-200 bg-surface-0 p-4">
            <div class="mb-3 text-sm font-semibold text-color">Assegna giocatore</div>
            <Select
              v-model="assignPlayerId"
              :options="availableForSlotOptions"
              option-label="name"
              option-value="id"
              placeholder="Seleziona giocatore"
              filter
              filter-placeholder="Cerca nome, club o ranking"
              :filter-fields="['searchText']"
              fluid
            />
            <div class="mt-3 flex justify-end gap-2">
              <Button v-if="selectedSlotHasPlayer" label="Rimuovi" severity="danger" outlined @click="clearSlot" />
              <Button label="Assegna" :disabled="!assignPlayerId" @click="confirmAssign" />
            </div>
          </div>
          <div class="rounded-xl border border-surface-200 bg-surface-0 p-4">
            <div class="mb-3 text-sm font-semibold text-color">Risultato</div>
            <p class="m-0 text-sm text-muted-color">Usa il modale per inserire o modificare il risultato dell'incontro.</p>
            <div class="mt-3 flex justify-end gap-2">
              <Button label="Inserisci risultato" icon="pi pi-pencil" :disabled="!selectedMatch" @click="selectedMatch && openResultPanel(selectedMatch)" />
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <Dialog v-model:visible="resultDialogVisible" header="Inserisci risultato" modal :style="{ width: '360px' }">
    <div v-if="resultMatch" class="flex flex-col gap-4 pt-2">
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Risultato</label>
        <InputText v-model="editResult" placeholder="es. 6-3 6-4" fluid />
      </div>
      <div class="flex flex-col gap-1">
        <label class="text-sm font-medium">Vincitore</label>
        <div class="flex flex-col gap-2">
          <div
            class="flex items-center gap-2 p-3 rounded-lg border cursor-pointer"
            :class="editWinnerId === resultMatch.player1_id ? 'border-primary-400 bg-primary-50' : 'border-surface-200'"
            @click="editWinnerId = resultMatch.player1_id ?? null"
          >
            <i class="pi pi-circle-fill text-xs" :class="editWinnerId === resultMatch.player1_id ? 'text-primary-500' : 'text-surface-300'" />
            <span>{{ getPlayerName(resultMatch.player1_id) }}</span>
          </div>
          <div
            class="flex items-center gap-2 p-3 rounded-lg border cursor-pointer"
            :class="editWinnerId === resultMatch.player2_id ? 'border-primary-400 bg-primary-50' : 'border-surface-200'"
            @click="editWinnerId = resultMatch.player2_id ?? null"
          >
            <i class="pi pi-circle-fill text-xs" :class="editWinnerId === resultMatch.player2_id ? 'text-primary-500' : 'text-surface-300'" />
            <span>{{ getPlayerName(resultMatch.player2_id) }}</span>
          </div>
        </div>
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <Button label="Annulla" severity="secondary" outlined @click="closeResultDialog" />
        <Button label="Salva" :disabled="!editResult || !editWinnerId" @click="saveResult" />
      </div>
    </div>
  </Dialog>
</template>
