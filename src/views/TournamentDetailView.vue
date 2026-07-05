<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTournamentsStore } from '../stores/tournaments'
import { usePlayersStore } from '../stores/players'
import { useMatchesStore } from '../stores/matches'
import { useAuthStore } from '../stores/auth'
import { playersService } from '../services/playersApi'
import { matchesService } from '../services/matchesApi'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import Menu from 'primevue/menu'
import MultiSelect from 'primevue/multiselect'
import Select from 'primevue/select'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import Tag from 'primevue/tag'
import { tournamentFormatLabels } from '../config/tournamentFormats'
import type { Match, MatchSlot, Player, TournamentStatus, TournamentWithPlayers } from '../types'
import { getSeededPlayersCount } from '../utils/matches'

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
const selectedRemovePlayerIds = ref<string[]>([])
const enrolledNameFilter = ref('')
const enrolledClubFilter = ref('')
const resettingDraw = ref(false)
const updatingStatus = ref(false)
const activeBracketRound = ref(0)
const bracketViewMode = ref<'rounds' | 'global'>('rounds')
const roundRobinViewMode = ref<'schedule' | 'standings'>('schedule')
const downloadingPdf = ref(false)
const actionsMenu = ref<{ toggle: (event: Event) => void } | null>(null)

const categoryLabels: Record<string, string> = {
  maschile: 'Maschile',
  femminile: 'Femminile',
  singles: 'Maschile',
  doubles: 'Femminile',
}

function openEdit(): void {
  if (!tournament.value) return
  void router.push({ name: 'tournament-edit', params: { id: tournament.value.id } })
}

function toggleActionsMenu(event: Event): void {
  actionsMenu.value?.toggle(event)
}

function confirmDelete(): void {
  if (!tournament.value) return
  const currentTournament = tournament.value
  confirm.require({
    message: `Eliminare il torneo "${currentTournament.name}"? Tutti i dati correlati verranno rimossi.`,
    header: 'Conferma eliminazione',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Annulla',
    acceptLabel: 'Elimina',
    acceptSeverity: 'danger',
    accept: async () => {
      try {
        await tournamentsStore.remove(currentTournament.id)
        toast.add({ severity: 'success', summary: 'Eliminato', detail: `${currentTournament.name} rimosso`, life: 3000 })
        await router.push({ name: 'tournaments' })
      } catch (error) {
        toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
      }
    },
  })
}

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

const filteredEnrolledPlayers = computed(() => {
  const name = enrolledNameFilter.value.trim().toLocaleLowerCase('it')
  const club = enrolledClubFilter.value.trim().toLocaleLowerCase('it')
  return enrolledPlayers.value.filter((player) =>
    (!name || player.name.toLocaleLowerCase('it').includes(name)) &&
    (!club || (player.club ?? '').toLocaleLowerCase('it').includes(club)),
  )
})

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
  const seededPlayersCount = getSeededPlayersCount(enrolledPlayers.value.length)
  return new Map(
    [...enrolledPlayers.value]
      .sort((left, right) => left.ranking - right.ranking)
      .slice(0, seededPlayersCount)
      .map((player, index) => [player.id, index + 1]),
  )
})
const hasMatches = computed(() => matchesStore.matches.length > 0)
const isRoundRobin = computed(() => tournament.value?.format === 'round_robin')
const isRoundRobinElimination = computed(() => tournament.value?.format === 'round_robin_elimination')
const allPlayersSelected = computed(
  () => filteredEnrolledPlayers.value.length > 0 && filteredEnrolledPlayers.value.every((player) => selectedRemovePlayerIds.value.includes(player.id)),
)
const somePlayersSelected = computed(
  () => filteredEnrolledPlayers.value.some((player) => selectedRemovePlayerIds.value.includes(player.id)) && !allPlayersSelected.value,
)
const canViewAdmin = computed(() => auth.isAdmin)
const canModify = computed(() => !auth.isGuest)
const tournamentActions = computed(() => [
  {
    label: tournament.value?.published ? 'Nascondi torneo' : 'Pubblica torneo',
    icon: tournament.value?.published ? 'pi pi-eye-slash' : 'pi pi-eye',
    command: publishToggle,
  },
  { separator: true },
  {
    label: 'Elimina torneo',
    icon: 'pi pi-trash',
    class: 'danger-menu-item',
    command: confirmDelete,
  },
])
const canAddMorePlayers = computed(() => {
  const limit = tournament.value?.participant_limit
  if (!limit) return true
  return enrolledPlayers.value.length < limit
})
const bracketRoundTabs = computed(() => matchesStore.rounds.map((round) => ({
  index: round.index,
  label: round.short_name,
  fullLabel: round.name,
})))
const activeBracketMatches = computed(() =>
  (matchesStore.matchesByRound.get(activeBracketRound.value) ?? []).filter(
    (match): match is Match => Boolean(match),
  ),
)
const roundRobinStandings = computed(() =>
  enrolledPlayers.value
    .map((player) => {
      const completed = matchesStore.matches.filter(
        (match) => match.status === 'completed' && (match.player1_id === player.id || match.player2_id === player.id),
      )
      const wins = completed.filter((match) => match.winner_id === player.id).length
      return {
        player,
        played: completed.length,
        wins,
        losses: completed.length - wins,
      }
    })
    .sort((left, right) => right.wins - left.wins || left.losses - right.losses || left.player.ranking - right.player.ranking),
)
const globalFirstRoundMatches = computed(() => matchesStore.matchesByRound.get(0)?.filter(Boolean).length ?? 1)
const globalBracketHeight = computed(() => Math.max(680, globalFirstRoundMatches.value * 148))
const globalBracketColumns = computed(() =>
  bracketRoundTabs.value.map((tab) => {
    const matches = (matchesStore.matchesByRound.get(tab.index) ?? []).filter(
      (match): match is Match => Boolean(match),
    )
    return {
      ...tab,
      matches: matches.map((match) => ({
        match,
      })),
    }
  }),
)
const globalBracketConnectors = computed(() => {
  const roundsCount = Math.max(1, matchesStore.numRounds)
  const firstRoundMatches = Math.max(1, globalFirstRoundMatches.value)
  return matchesStore.matches
    .filter((match) => match.round_index < roundsCount - 1)
    .map((match) => {
      const roundIndex = match.round_index
      const span = 2 ** roundIndex
      const parentSpan = span * 2
      const sourceY = ((match.position * span + span / 2) / firstRoundMatches) * 1000
      const parentPosition = Math.floor(match.position / 2)
      const targetY = ((parentPosition * parentSpan + parentSpan / 2) / firstRoundMatches) * 1000
      const sourceX = ((roundIndex + 0.93) / roundsCount) * 1000
      const targetX = ((roundIndex + 1.07) / roundsCount) * 1000
      const middleX = (sourceX + targetX) / 2
      return {
        id: match.id,
        path: `M ${sourceX} ${sourceY} H ${middleX} V ${targetY} H ${targetX}`,
      }
    })
})

const isEnrolled = computed(() =>
  !!myPlayer.value && enrolledPlayerIds.value.includes(myPlayer.value.id),
)

function getGlobalMatchStyle(roundIndex: number, position: number): Record<string, string> {
  const span = 2 ** roundIndex
  const center = ((position * span + span / 2) / Math.max(1, globalFirstRoundMatches.value)) * 100
  return { top: `${center}%` }
}

async function downloadDrawPdf(): Promise<void> {
  if (!tournament.value || downloadingPdf.value) return
  downloadingPdf.value = true
  try {
    const blob = await matchesService.downloadDrawPdf(tournament.value.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${tournament.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-tabellone.pdf`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    downloadingPdf.value = false
  }
}

watch(
  () => matchesStore.numRounds,
  (numRounds) => {
    if (numRounds < 1) {
      activeBracketRound.value = 0
      return
    }
    activeBracketRound.value = 0
  },
  { immediate: true },
)

watch(
  enrolledPlayers,
  (players) => {
    const validIds = new Set(players.map((player) => player.id))
    selectedRemovePlayerIds.value = selectedRemovePlayerIds.value.filter((id) => validIds.has(id))
  },
  { immediate: true },
)

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

function isByeSlot(match: Match, slot: MatchSlot): boolean {
  return !match[slot] && match.status === 'completed' && match.result === 'BYE'
}

function isTbdSlot(match: Match, slot: MatchSlot): boolean {
  return !match[slot] && !isByeSlot(match, slot)
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

function getEffectiveWinnerId(match: Match): string | null {
  return match.winner_id
}

function isWinner(match: Match, slot: MatchSlot): boolean {
  const winnerId = getEffectiveWinnerId(match)
  return Boolean(winnerId && winnerId === match[slot])
}

function toggleRemoveAll(checked: boolean): void {
  const filteredIds = new Set(filteredEnrolledPlayers.value.map((player) => player.id))
  selectedRemovePlayerIds.value = checked
    ? [...new Set([...selectedRemovePlayerIds.value, ...filteredIds])]
    : selectedRemovePlayerIds.value.filter((id) => !filteredIds.has(id))
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
  const players = enrolledPlayers.value.filter((player) => selectedRemovePlayerIds.value.includes(player.id))
  confirmRemovePlayers(players)
}

function openPlayerDetail(player: Player): void {
  void router.push({ name: 'player-detail', params: { id: player.id } })
}

function clearEnrolledFilters(): void {
  enrolledNameFilter.value = ''
  enrolledClubFilter.value = ''
}

function formatPlayerValue(value: string | null | undefined): string {
  return value?.trim() ? value : '—'
}

async function createEmptyBracket(): Promise<void> {
  if (auth.isGuest) return
  if (!tournament.value || enrolledPlayers.value.length < 2) return
  await matchesStore.createEmptyBracket(tournament.value.id, enrolledPlayers.value.length)
  activeBracketRound.value = 0
}

function confirmResetDraw(): void {
  if (!tournament.value) return
  const roundRobin = tournament.value.format === 'round_robin'
  confirm.require({
    message: roundRobin ? 'Azzera il girone, le giornate e tutti i risultati inseriti?' : 'Azzera il tabellone e tutti i risultati inseriti?',
    header: roundRobin ? 'Azzera girone' : 'Azzera tabellone',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Annulla',
    acceptLabel: 'Azzera',
    acceptSeverity: 'danger',
    accept: async () => {
      resettingDraw.value = true
      try {
        await matchesStore.reset(tournament.value!.id)
        toast.add({
          severity: 'success',
          summary: roundRobin ? 'Girone azzerato' : 'Tabellone azzerato',
          detail: roundRobin ? 'Puoi generare nuove giornate' : 'Puoi generare un nuovo tabellone',
          life: 3000,
        })
      } catch (error) {
        toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
      } finally {
        resettingDraw.value = false
      }
    },
  })
}

function openMatchDetail(match: Match): void {
  if (!tournament.value) return
  void router.push({
    name: 'match-detail',
    params: {
      id: tournament.value.id,
      matchId: match.id,
    },
  })
}
</script>

<template>
  <div class="detail-page">
    <div v-if="loading" class="detail-loading">
      <i class="pi pi-spin pi-spinner" />
      <span>Prepariamo il campo…</span>
    </div>

    <template v-else-if="tournament">
      <header class="tournament-hero">
        <button class="back-link" type="button" @click="router.push({ name: 'tournaments' })"><i class="pi pi-arrow-left" /> Tutti i tornei</button>

        <div class="hero-main">
          <div class="hero-copy">
            <div class="hero-badges">
              <span class="status-badge" :class="`status-${tournament.status}`"><i />{{ statusLabel(tournament.status) }}</span>
              <span class="visibility-badge"><i :class="tournament.published ? 'pi pi-eye' : 'pi pi-eye-slash'" />{{ tournament.published ? 'Pubblicato' : 'Nascosto' }}</span>
            </div>
            <p class="eyebrow">CONTROL ROOM TORNEO</p>
            <h1>{{ tournament.name }}</h1>
            <p class="hero-subtitle"><i class="pi pi-map-marker" /> {{ tournament.location || 'Sede da definire' }}</p>
          </div>

          <div class="hero-actions">
            <Button
              v-if="canModify && tournament.status === 'upcoming'"
              class="status-action"
              label="Avvia torneo"
              icon="pi pi-play"
              size="small"
              severity="success"
              :loading="updatingStatus"
              @click="setTournamentStatus('ongoing')"
            />
            <Button
              v-if="canModify && tournament.status === 'ongoing'"
              class="status-action"
              label="Chiudi torneo"
              icon="pi pi-check"
              size="small"
              :loading="updatingStatus"
              @click="setTournamentStatus('completed')"
            />
            <span v-if="canViewAdmin" class="actions-separator" />
            <Button
              v-if="canViewAdmin"
              class="edit-action"
              label="Modifica"
              icon="pi pi-pencil"
              size="small"
              outlined
              :disabled="auth.isGuest"
              @click="openEdit"
            />
            <Button
              v-if="canViewAdmin"
              class="more-action"
              icon="pi pi-ellipsis-h"
              size="small"
              outlined
              aria-label="Altre azioni"
              aria-haspopup="true"
              :disabled="auth.isGuest"
              @click="toggleActionsMenu"
            />
            <Menu ref="actionsMenu" :model="tournamentActions" popup />
          </div>
        </div>

        <div class="hero-stats">
          <div><span class="stat-icon"><i class="pi pi-calendar" /></span><p><small>PERIODO</small><strong>{{ formatDate(tournament.start_date) }}<template v-if="tournament.end_date"> — {{ formatDate(tournament.end_date) }}</template></strong></p></div>
          <div><span class="stat-icon"><i class="pi pi-sitemap" /></span><p><small>FORMATO</small><strong>{{ tournamentFormatLabels[tournament.format] ?? tournament.format }}</strong></p></div>
          <div><span class="stat-icon"><i class="pi pi-users" /></span><p><small>PARTECIPANTI</small><strong>{{ enrolledPlayers.length }} / {{ tournament.participant_limit || '∞' }}</strong></p></div>
          <div><span class="stat-icon"><i class="pi pi-user" /></span><p><small>CATEGORIA</small><strong>{{ categoryLabels[tournament.category] ?? tournament.category }}</strong></p></div>
        </div>

        <div v-if="tournament.registration_start_date || tournament.registration_end_date || tournament.game_formula || tournament.registration_fee != null" class="hero-extras">
          <span v-if="tournament.registration_start_date || tournament.registration_end_date"><i class="pi pi-user-plus" /> Iscrizioni <template v-if="tournament.registration_start_date">dal {{ formatDate(tournament.registration_start_date) }}</template><template v-if="tournament.registration_end_date"> al {{ formatDate(tournament.registration_end_date) }}</template></span>
          <span v-if="tournament.game_formula"><i class="pi pi-list-check" /> {{ tournament.game_formula }}</span>
          <span v-if="tournament.registration_fee != null"><i class="pi pi-euro" /> {{ tournament.registration_fee.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' }) }}</span>
          <span v-if="tournament.format === 'round_robin_elimination'"><i class="pi pi-sitemap" /> {{ tournament.group_count ?? '—' }} gironi · {{ tournament.qualifiers_per_group ?? '—' }} qualificati/girone</span>
        </div>
      </header>

      <Tabs value="tabellone" class="tournament-tabs">
        <TabList>
          <Tab value="tabellone">
            <i class="pi pi-sitemap mr-2" />
            Tabellone
          </Tab>
          <Tab value="iscritti">
            <i class="pi pi-users mr-2" />
            Giocatori ({{ enrolledPlayers.length }})
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel value="iscritti">
            <div class="flex flex-col gap-4 py-4">
              <div class="grid gap-3 rounded-2xl border border-surface-200 bg-surface-0 p-4 lg:grid-cols-[1fr_1fr_auto]">
                <div class="flex flex-col gap-1.5">
                  <label for="enrolled-player-name" class="text-sm font-medium">Cerca per nome</label>
                  <InputText id="enrolled-player-name" v-model="enrolledNameFilter" placeholder="Mario Rossi" fluid />
                </div>
                <div class="flex flex-col gap-1.5">
                  <label for="enrolled-player-club" class="text-sm font-medium">Cerca per club</label>
                  <InputText id="enrolled-player-club" v-model="enrolledClubFilter" placeholder="TC Milano" fluid />
                </div>
                <div class="flex items-end">
                  <Button label="Azzera filtri" severity="secondary" outlined @click="clearEnrolledFilters" />
                </div>
              </div>

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

                <div v-if="enrolledPlayers.length === 0" class="flex flex-col items-center justify-center gap-3 min-h-[220px] text-center text-muted-color">
                  <i class="pi pi-users text-[2rem] text-muted-color" />
                  <p class="m-0">Nessun giocatore iscritto.<br />Clicca <strong>Aggiungi giocatore</strong> per iniziare.</p>
                </div>

                <div v-else-if="filteredEnrolledPlayers.length === 0" class="flex flex-col items-center justify-center gap-3 min-h-[180px] text-center text-muted-color">
                  <i class="pi pi-search text-[2rem]" />
                  <p class="m-0">Nessun iscritto corrisponde ai filtri.</p>
                </div>

                <template v-else>
                  <div class="enrolled-section">
                    <div class="selection-toolbar">
                      <label class="selection-all">
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
                    <div class="tournament-players-grid">
                    <article
                      v-for="player in filteredEnrolledPlayers"
                      :key="player.id"
                      class="enrolled-player-card"
                      tabindex="0"
                      @click="openPlayerDetail(player)"
                      @keydown.enter="openPlayerDetail(player)"
                    >
                      <div class="player-card-top">
                        <Checkbox
                          :binary="true"
                          :model-value="selectedRemovePlayerIds.includes(player.id)"
                          :disabled="auth.isGuest"
                          @update:model-value="(checked) => toggleRemovePlayer(player.id, checked)"
                          @click.stop
                        />
                        <div class="player-badges">
                          <span v-if="getSeed(player.id)" class="seed-value">TDS {{ getSeed(player.id) }}</span>
                          <span v-if="player.ranking" class="ranking-value">#{{ player.ranking }}</span>
                        </div>
                        <span class="player-arrow"><i class="pi pi-arrow-up-right" /></span>
                      </div>

                      <div class="player-card-identity">
                        <div class="player-avatar"><Avatar :label="getPlayerInitials(player)" :image="player.photo_url ?? undefined" shape="circle" /></div>
                        <div><h3>{{ player.name }}</h3></div>
                      </div>

                      <div class="player-card-details">
                        <div><span><i class="pi pi-building-columns" /></span><p><small>CLUB</small>{{ formatPlayerValue(player.club) }}</p></div>
                        <div><span><i class="pi pi-phone" /></span><p><small>CONTATTO</small>{{ formatPlayerValue(player.phone) }}</p></div>
                      </div>
                      <footer class="player-card-footer"><span>Iscritto al torneo</span><span>Apri profilo <i class="pi pi-chevron-right" /></span></footer>
                    </article>
                    </div>
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
                  <div v-if="filteredEnrolledPlayers.length === 0" class="flex flex-col items-center gap-3 py-10 text-center text-muted-color">
                    <i class="pi pi-search text-[2rem]" />
                    <p class="m-0">Nessun iscritto corrisponde ai filtri.</p>
                  </div>
                  <div v-else class="tournament-players-grid">
                    <article
                      v-for="player in filteredEnrolledPlayers"
                      :key="player.id"
                      class="enrolled-player-card"
                      tabindex="0"
                      @click="openPlayerDetail(player)"
                      @keydown.enter="openPlayerDetail(player)"
                    >
                      <div class="player-card-top">
                        <div class="player-badges">
                          <span v-if="getSeed(player.id)" class="seed-value">TDS {{ getSeed(player.id) }}</span>
                          <span v-if="player.ranking" class="ranking-value">#{{ player.ranking }}</span>
                        </div>
                        <span class="player-arrow"><i class="pi pi-arrow-up-right" /></span>
                      </div>
                      <div class="player-card-identity">
                        <div class="player-avatar"><Avatar :label="getPlayerInitials(player)" :image="player.photo_url ?? undefined" shape="circle" /></div>
                        <div><h3>{{ player.name }}</h3></div>
                      </div>
                      <div class="player-card-details">
                        <div><span><i class="pi pi-building-columns" /></span><p><small>CLUB</small>{{ formatPlayerValue(player.club) }}</p></div>
                        <div><span><i class="pi pi-phone" /></span><p><small>CONTATTO</small>{{ formatPlayerValue(player.phone) }}</p></div>
                      </div>
                      <footer class="player-card-footer"><span>Iscritto al torneo</span><span>Apri profilo <i class="pi pi-chevron-right" /></span></footer>
                    </article>
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
                <div class="flex items-center justify-between gap-3 flex-wrap">
                  <div v-if="canViewAdmin" class="flex items-center gap-2">
                    <Button
                      v-if="!hasMatches"
                      label="Genera girone"
                      icon="pi pi-plus"
                      size="small"
                      :disabled="auth.isGuest"
                      @click="createEmptyBracket"
                    />
                    <Button
                      v-else
                      label="Azzera girone"
                      icon="pi pi-refresh"
                      severity="danger"
                      outlined
                      size="small"
                      :disabled="auth.isGuest"
                      :loading="resettingDraw"
                      @click="confirmResetDraw"
                    />
                  </div>
                </div>

                <div v-if="!hasMatches" class="flex flex-col items-center justify-center gap-3 min-h-[220px] text-center text-muted-color">
                  <i class="pi pi-calendar text-[2rem] text-muted-color" />
                  <p class="m-0">Nessun girone generato.<template v-if="canViewAdmin"> Clicca <strong>Genera girone</strong> per creare le giornate.</template></p>
                </div>

                <template v-else>
                  <div class="round-robin-toggle">
                    <Button
                      label="Giornate"
                      icon="pi pi-calendar"
                      size="small"
                      :severity="roundRobinViewMode === 'schedule' ? 'primary' : 'secondary'"
                      :outlined="roundRobinViewMode !== 'schedule'"
                      @click="roundRobinViewMode = 'schedule'"
                    />
                    <Button
                      label="Classifica"
                      icon="pi pi-list"
                      size="small"
                      :severity="roundRobinViewMode === 'standings' ? 'primary' : 'secondary'"
                      :outlined="roundRobinViewMode !== 'standings'"
                      @click="roundRobinViewMode = 'standings'"
                    />
                  </div>

                  <div v-if="roundRobinViewMode === 'schedule'" class="round-robin-schedule">
                    <div class="schedule-heading">
                      <div><span class="schedule-icon"><i class="pi pi-calendar" /></span><div><small>CALENDARIO</small><h3>{{ bracketRoundTabs.find((tab) => tab.index === activeBracketRound)?.fullLabel }}</h3></div></div>
                      <span>{{ activeBracketMatches.length }} incontri</span>
                    </div>
                    <Tabs v-model:value="activeBracketRound" scrollable class="round-tabs">
                      <TabList>
                        <Tab
                        v-for="tab in bracketRoundTabs"
                        :key="tab.index"
                          :value="tab.index"
                          class="whitespace-nowrap"
                        >
                          {{ tab.fullLabel }}
                        </Tab>
                      </TabList>
                    </Tabs>

                    <div class="round-robin-matches">
                      <article
                        v-for="match in activeBracketMatches"
                        :key="match.id"
                        class="round-robin-match"
                        tabindex="0"
                        @click="openMatchDetail(match)"
                        @keydown.enter="openMatchDetail(match)"
                      >
                        <header class="match-heading">
                          <span>MATCH {{ String(match.position + 1).padStart(2, '0') }}</span>
                          <span class="match-status" :class="{ completed: match.status === 'completed' }"><i />{{ match.status === 'completed' ? 'Completato' : 'Da giocare' }}</span>
                        </header>
                        <div class="versus-layout">
                          <div class="versus-player" :class="{ winner: isWinner(match, 'player1_id') }">
                            <Avatar :label="getPlayerInitialsById(match.player1_id) || '—'" :image="getPlayer(match.player1_id)?.photo_url ?? undefined" shape="circle" />
                            <strong>{{ getSlotLabel(match, 'player1_id') }}</strong>
                            <span v-if="isWinner(match, 'player1_id')"><i class="pi pi-check" /> Vincitore</span>
                          </div>
                          <div class="versus-center">
                            <span>VS</span>
                            <strong v-if="match.result">{{ match.result }}</strong>
                          </div>
                          <div class="versus-player" :class="{ winner: isWinner(match, 'player2_id') }">
                            <Avatar :label="getPlayerInitialsById(match.player2_id) || '—'" :image="getPlayer(match.player2_id)?.photo_url ?? undefined" shape="circle" />
                            <strong>{{ getSlotLabel(match, 'player2_id') }}</strong>
                            <span v-if="isWinner(match, 'player2_id')"><i class="pi pi-check" /> Vincitore</span>
                          </div>
                        </div>
                        <footer class="match-footer"><span>Apri incontro</span><i class="pi pi-arrow-right" /></footer>
                      </article>
                    </div>
                  </div>

                  <section v-else class="standings-section">
                    <div class="schedule-heading"><div><span class="schedule-icon"><i class="pi pi-list" /></span><div><small>RISULTATI</small><h3>Classifica generale</h3></div></div><span>{{ roundRobinStandings.length }} giocatori</span></div>
                    <div class="standings-table-wrap">
                      <table class="w-full min-w-[520px] border-collapse">
                        <thead class="bg-surface-100 text-left">
                          <tr>
                            <th class="p-3 text-center">Pos.</th>
                            <th class="p-3">Giocatore</th>
                            <th class="p-3 text-center">G</th>
                            <th class="p-3 text-center">V</th>
                            <th class="p-3 text-center">P</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr v-for="(row, index) in roundRobinStandings" :key="row.player.id" class="border-t border-surface-200">
                            <td class="p-3 text-center font-bold"><span class="position-badge" :class="{ podium: index < 3 }">{{ index + 1 }}</span></td>
                            <td class="p-3 font-semibold"><div class="standing-player"><Avatar :label="getPlayerInitials(row.player)" :image="row.player.photo_url ?? undefined" shape="circle" /><span>{{ row.player.name }}<small>{{ row.player.club || 'Club non specificato' }}</small></span></div></td>
                            <td class="p-3 text-center">{{ row.played }}</td>
                            <td class="p-3 text-center font-semibold text-emerald-700">{{ row.wins }}</td>
                            <td class="p-3 text-center">{{ row.losses }}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </section>
                </template>
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
                      label="Scarica PDF"
                      icon="pi pi-download"
                      size="small"
                      outlined
                      :loading="downloadingPdf"
                      @click="downloadDrawPdf"
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
                        :key="tab.index"
                        :label="tab.label"
                        :title="tab.fullLabel"
                        size="small"
                        :severity="activeBracketRound === tab.index ? 'primary' : 'secondary'"
                        :outlined="activeBracketRound !== tab.index"
                        @click="activeBracketRound = tab.index"
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
                        {{ bracketRoundTabs.find((tab) => tab.index === activeBracketRound)?.fullLabel }}
                      </div>
                      <div class="flex flex-col gap-3">
                        <div
                          v-for="match in activeBracketMatches"
                          :key="match.id"
                          class="flex min-h-[9.5rem] cursor-pointer flex-col overflow-hidden rounded-2xl border border-surface-200 bg-surface-0 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md"
                          @click="openMatchDetail(match)"
                        >
                          <div class="flex items-center justify-end gap-3 border-b border-surface-100 px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-muted-color">
                            <span v-if="match.result">{{ match.result }}</span>
                            <span v-else-if="canViewAdmin">Da giocare</span>
                          </div>

                          <div
                            class="flex flex-1 items-center justify-between gap-3 px-4 py-3"
                            :class="{
                              'bg-emerald-500/10': isWinner(match, 'player1_id'),
                              'text-muted-color': isByeSlot(match, 'player1_id') || isTbdSlot(match, 'player1_id'),
                            }"
                          >
                            <div class="flex min-w-0 items-center gap-3">
                              <span class="overflow-hidden whitespace-nowrap text-ellipsis text-inherit" :class="{ 'font-bold': isSeededPlayer(match.player1_id) }">
                                {{ getSlotLabel(match, 'player1_id') }}
                              </span>
                              <span v-if="getSeed(match.player1_id)" class="shrink-0 text-sm font-semibold text-muted-color">
                                {{ getSeed(match.player1_id) }}
                              </span>
                            </div>
                            <i v-if="isWinner(match, 'player1_id')" class="pi pi-check text-sm text-emerald-600" />
                          </div>

                          <div
                            class="flex flex-1 items-center justify-between gap-3 border-t border-surface-100 px-4 py-3"
                            :class="{
                              'bg-emerald-500/10': isWinner(match, 'player2_id'),
                              'text-muted-color': isByeSlot(match, 'player2_id') || isTbdSlot(match, 'player2_id'),
                            }"
                          >
                            <div class="flex min-w-0 items-center gap-3">
                              <span class="overflow-hidden whitespace-nowrap text-ellipsis text-inherit" :class="{ 'font-bold': isSeededPlayer(match.player2_id) }">
                                {{ getSlotLabel(match, 'player2_id') }}
                              </span>
                              <span v-if="getSeed(match.player2_id)" class="shrink-0 text-sm font-semibold text-muted-color">
                                {{ getSeed(match.player2_id) }}
                              </span>
                            </div>
                            <i v-if="isWinner(match, 'player2_id')" class="pi pi-check text-sm text-emerald-600" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div v-else class="flex flex-col gap-4">
                    <div class="overflow-x-auto rounded-2xl border border-surface-200 bg-surface-50 shadow-sm">
                      <div class="min-w-max" :style="{ width: `${Math.max(1, globalBracketColumns.length) * 18}rem` }">
                        <div
                          class="grid border-b border-surface-200"
                          :style="{ gridTemplateColumns: `repeat(${globalBracketColumns.length}, minmax(18rem, 1fr))` }"
                        >
                          <div
                            v-for="(column, columnIndex) in globalBracketColumns"
                            :key="column.index"
                            class="px-5 py-4 text-lg font-bold text-color"
                            :class="columnIndex % 2 === 0 ? 'bg-surface-100' : 'bg-surface-50'"
                          >
                            {{ column.fullLabel }}
                          </div>
                        </div>

                        <div class="relative" :style="{ height: `${globalBracketHeight}px` }">
                          <div
                            class="absolute inset-0 grid"
                            :style="{ gridTemplateColumns: `repeat(${globalBracketColumns.length}, minmax(18rem, 1fr))` }"
                          >
                            <div
                              v-for="(column, columnIndex) in globalBracketColumns"
                              :key="`background-${column.index}`"
                              :class="columnIndex % 2 === 0 ? 'bg-surface-100' : 'bg-surface-50'"
                            />
                          </div>

                          <svg
                            class="pointer-events-none absolute inset-0 z-10 h-full w-full text-primary-300"
                            viewBox="0 0 1000 1000"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                          >
                            <path
                              v-for="connector in globalBracketConnectors"
                              :key="connector.id"
                              :d="connector.path"
                              fill="none"
                              stroke="currentColor"
                              stroke-width="1.25"
                              vector-effect="non-scaling-stroke"
                            />
                          </svg>

                          <div
                            class="absolute inset-0 z-20 grid"
                            :style="{ gridTemplateColumns: `repeat(${globalBracketColumns.length}, minmax(18rem, 1fr))` }"
                          >
                            <div v-for="column in globalBracketColumns" :key="column.index" class="relative min-w-0">
                              <div
                                v-for="entry in column.matches"
                                :key="entry.match.id"
                                class="absolute right-4 left-4 flex h-[8.25rem] -translate-y-1/2 cursor-pointer flex-col overflow-hidden rounded-xl border border-surface-200 bg-surface-0 shadow-md transition-shadow hover:border-primary-300 hover:shadow-lg"
                                :style="getGlobalMatchStyle(column.index, entry.match.position)"
                                @click="openMatchDetail(entry.match)"
                              >
                                <div class="flex h-8 items-center justify-end gap-3 border-b border-surface-100 px-4 text-[0.7rem] font-semibold uppercase tracking-[0.08em] text-muted-color">
                                  <span v-if="entry.match.result">{{ entry.match.result }}</span>
                                  <span v-else-if="canViewAdmin">Da giocare</span>
                                </div>
                                <div
                                  class="flex flex-1 items-center justify-between gap-3 px-4"
                                  :class="{
                                    'bg-emerald-500/10': isWinner(entry.match, 'player1_id'),
                                    'text-muted-color': isByeSlot(entry.match, 'player1_id') || isTbdSlot(entry.match, 'player1_id'),
                                  }"
                                >
                                  <div class="flex min-w-0 items-center gap-2">
                                    <span class="overflow-hidden whitespace-nowrap text-ellipsis text-inherit" :class="{ 'font-bold': isSeededPlayer(entry.match.player1_id) }">
                                      {{ getSlotLabel(entry.match, 'player1_id') }}
                                    </span>
                                    <span v-if="getSeed(entry.match.player1_id)" class="shrink-0 text-xs font-semibold text-muted-color">{{ getSeed(entry.match.player1_id) }}</span>
                                  </div>
                                  <i v-if="isWinner(entry.match, 'player1_id')" class="pi pi-check text-sm text-emerald-600" />
                                </div>
                                <div
                                  class="flex flex-1 items-center justify-between gap-3 border-t border-surface-100 px-4"
                                  :class="{
                                    'bg-emerald-500/10': isWinner(entry.match, 'player2_id'),
                                    'text-muted-color': isByeSlot(entry.match, 'player2_id') || isTbdSlot(entry.match, 'player2_id'),
                                  }"
                                >
                                  <div class="flex min-w-0 items-center gap-2">
                                    <span class="overflow-hidden whitespace-nowrap text-ellipsis text-inherit" :class="{ 'font-bold': isSeededPlayer(entry.match.player2_id) }">
                                      {{ getSlotLabel(entry.match, 'player2_id') }}
                                    </span>
                                    <span v-if="getSeed(entry.match.player2_id)" class="shrink-0 text-xs font-semibold text-muted-color">{{ getSeed(entry.match.player2_id) }}</span>
                                  </div>
                                  <i v-if="isWinner(entry.match, 'player2_id')" class="pi pi-check text-sm text-emerald-600" />
                                </div>
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

    </template>
  </div>
</template>

<style scoped>
.detail-page { --green: var(--color-primary-700); --lime: var(--color-accent); display: flex; max-width: 1480px; margin: 0 auto; flex-direction: column; gap: 1rem; color: var(--color-text); }
.detail-loading { display: flex; min-height: 360px; flex-direction: column; align-items: center; justify-content: center; gap: 0.8rem; color: var(--color-text-muted); font-size: 0.72rem; }
.detail-loading i { color: var(--color-primary-500); font-size: 2rem; }
.tournament-hero { position: relative; overflow: hidden; padding: clamp(1.35rem, 3vw, 2.2rem); border-radius: 22px; background: var(--color-primary-800); color: var(--color-white); box-shadow: 0 18px 38px rgb(var(--color-shadow-rgb) / 16%); }
.back-link { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0; border: 0; background: transparent; color: rgb(var(--color-white-rgb) / 53%); font: inherit; font-size: 0.67rem; font-weight: 650; cursor: pointer; }
.back-link:hover { color: var(--lime); }
.hero-main { display: flex; align-items: flex-start; justify-content: space-between; gap: 2rem; margin-top: 1.35rem; }
.hero-copy { min-width: 0; }
.hero-badges { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.status-badge, .visibility-badge { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.36rem 0.6rem; border-radius: 99px; background: rgb(var(--color-white-rgb) / 10%); color: rgb(var(--color-white-rgb) / 73%); font-size: 0.57rem; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.status-badge { background: var(--color-accent); color: var(--color-sidebar-on-accent); }
.status-badge i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 3px rgb(var(--color-sidebar-on-accent-rgb) / 12%); }
.status-badge.status-upcoming { background: var(--color-info-soft); color: var(--color-info); }
.status-badge.status-completed { background: var(--color-surface-muted); color: var(--color-text-muted); }
.eyebrow { margin: 1.1rem 0 0.45rem; color: var(--color-primary-200); font-size: 0.58rem; font-weight: 850; letter-spacing: 0.16em; }
.hero-copy h1 { overflow: hidden; margin: 0; font-size: clamp(2rem, 4vw, 3.4rem); line-height: 1; letter-spacing: -0.06em; text-overflow: ellipsis; }
.hero-subtitle { display: flex; align-items: center; gap: 0.45rem; margin: 0.7rem 0 0; color: rgb(var(--color-white-rgb) / 58%); font-size: 0.74rem; }
.hero-actions { display: flex; max-width: 430px; flex-wrap: wrap; justify-content: flex-end; gap: 0.5rem; }
.hero-actions :deep(.p-button) { height: 2.55rem; border-color: rgb(var(--color-white-rgb) / 16%); border-radius: 10px; background: rgb(var(--color-white-rgb) / 7%); color: rgb(var(--color-white-rgb) / 78%); font-size: 0.67rem; backdrop-filter: blur(8px); }
.hero-actions :deep(.p-button:hover) { border-color: rgb(var(--color-white-rgb) / 28%); background: rgb(var(--color-white-rgb) / 13%); color: var(--color-white); }
.hero-actions .status-action { border-color: var(--color-accent); background: var(--color-accent); color: var(--color-sidebar-on-accent); font-weight: 800; }
.hero-actions .edit-action { border-color: rgb(var(--color-white-rgb) / 20%); background: rgb(var(--color-white-rgb) / 8%); color: var(--color-white); }
.hero-actions .more-action { width: 2.55rem; padding-inline: 0; }
.actions-separator { width: 1px; height: 1.9rem; align-self: center; margin-inline: 0.15rem; background: rgb(var(--color-white-rgb) / 14%); }
:global(.danger-menu-item .p-menu-item-content), :global(.danger-menu-item .p-menu-item-icon) { color: var(--color-danger); }
.hero-stats { display: grid; grid-template-columns: 1.25fr 1fr 0.7fr 0.7fr; gap: 0.5rem; margin-top: 1.8rem; padding-top: 1.25rem; border-top: 1px solid rgb(var(--color-white-rgb) / 11%); }
.hero-stats > div { display: flex; align-items: center; gap: 0.65rem; min-width: 0; padding-right: 0.7rem; border-right: 1px solid rgb(var(--color-white-rgb) / 9%); }
.hero-stats > div:last-child { border-right: 0; }
.stat-icon { display: grid; place-items: center; width: 2.35rem; height: 2.35rem; flex: 0 0 auto; border-radius: 9px; background: rgb(var(--color-white-rgb) / 9%); color: var(--color-accent); font-size: 0.78rem; }
.hero-stats p { display: grid; min-width: 0; gap: 0.15rem; margin: 0; }
.hero-stats small { color: rgb(var(--color-white-rgb) / 37%); font-size: 0.49rem; font-weight: 850; letter-spacing: 0.1em; }
.hero-stats strong { overflow: hidden; color: rgb(var(--color-white-rgb) / 84%); font-size: 0.7rem; text-overflow: ellipsis; white-space: nowrap; }
.hero-extras { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 1rem; }
.hero-extras span { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.34rem 0.55rem; border-radius: 99px; background: rgb(var(--color-black-rgb) / 10%); color: rgb(var(--color-white-rgb) / 48%); font-size: 0.56rem; }

.tournament-tabs { overflow: hidden; border: 1px solid var(--color-border); border-radius: 20px; background: var(--color-surface-card); box-shadow: 0 10px 32px rgb(var(--color-shadow-rgb) / 6%); }
.tournament-tabs :deep(.p-tablist) { padding: 0 1rem; border-bottom: 1px solid var(--color-border); background: var(--color-surface-soft); }
.tournament-tabs :deep(.p-tablist-tab-list) { gap: 0.4rem; border: 0; background: transparent; }
.tournament-tabs :deep(.p-tab) { padding: 1.05rem 1rem; border-width: 0 0 2px; color: var(--color-text-muted); font-size: 0.76rem; }
.tournament-tabs :deep(.p-tab-active) { border-color: var(--color-primary-500); color: var(--green); font-weight: 750; }
.tournament-tabs :deep(.p-tabpanels) { padding: clamp(1rem, 2vw, 1.5rem); background: var(--color-surface-card); }
.tournament-tabs :deep(.p-tabpanel > .flex) { padding-top: 0.25rem !important; }
.tournament-tabs :deep(.p-button) { border-radius: 10px; font-size: 0.7rem; }
.tournament-tabs :deep(.p-inputtext), .tournament-tabs :deep(.p-select), .tournament-tabs :deep(.p-multiselect) { border-color: var(--color-border); border-radius: 10px; background: var(--color-surface-soft); font-size: 0.78rem; }
.tournament-tabs :deep(.p-inputtext:focus), .tournament-tabs :deep(.p-select.p-focus), .tournament-tabs :deep(.p-multiselect.p-focus) { border-color: var(--color-primary-500); box-shadow: 0 0 0 3px rgb(var(--color-primary-500-rgb) / 10%); }
.tournament-tabs :deep(article) { border-color: var(--color-border) !important; border-radius: 15px !important; box-shadow: 0 5px 16px rgb(var(--color-shadow-rgb) / 5%) !important; transition: 180ms ease !important; }
.tournament-tabs :deep(article:hover) { transform: translateY(-2px); border-color: var(--color-primary-300) !important; box-shadow: 0 12px 26px rgb(var(--color-shadow-rgb) / 10%) !important; }
.tournament-tabs :deep(article > div:first-child) { color: var(--color-text-muted); }
.tournament-tabs :deep(.bg-emerald-500\/10) { background: var(--color-surface-muted) !important; }
.tournament-tabs :deep(table) { overflow: hidden; border-radius: 14px; font-size: 0.75rem; }
.tournament-tabs :deep(thead) { background: var(--color-surface-muted) !important; color: var(--color-text-muted); }
.round-robin-toggle { display: flex; justify-content: flex-end; gap: 0.45rem; padding: 0.35rem; align-self: flex-end; border-radius: 11px; background: var(--color-surface-muted); }
.round-robin-toggle :deep(.p-button) { min-width: 7rem; border: 0; box-shadow: none; }
.round-robin-schedule, .standings-section { display: flex; flex-direction: column; gap: 1rem; }
.schedule-heading { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.25rem 0.15rem; }
.schedule-heading > div { display: flex; align-items: center; gap: 0.7rem; }
.schedule-icon { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border-radius: 10px; background: var(--color-primary-100); color: var(--green); }
.schedule-heading small { color: var(--color-text-subtle); font-size: 0.49rem; font-weight: 850; letter-spacing: 0.12em; }
.schedule-heading h3 { margin: 0.15rem 0 0; font-size: 0.95rem; letter-spacing: -0.025em; }
.schedule-heading > span { padding: 0.35rem 0.55rem; border-radius: 99px; background: var(--color-surface-muted); color: var(--color-text-muted); font-size: 0.58rem; font-weight: 700; }
.round-tabs { overflow: hidden; border: 1px solid var(--color-border); border-radius: 13px; background: var(--color-surface-soft); }
.round-tabs :deep(.p-tablist) { padding-inline: 0.5rem; border: 0; }
.round-tabs :deep(.p-tab) { min-width: 7rem; justify-content: center; }
.round-robin-matches { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(350px, 100%), 1fr)); gap: 0.8rem; }
.round-robin-match { position: relative; overflow: hidden; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-surface-card); box-shadow: 0 6px 20px rgb(var(--color-shadow-rgb) / 6%); cursor: pointer; transition: 180ms ease; }
.round-robin-match::before { position: absolute; inset: 0 0 auto; height: 3px; background: linear-gradient(90deg, var(--color-accent), var(--color-primary-500)); content: ''; }
.round-robin-match:hover, .round-robin-match:focus-visible { transform: translateY(-3px); border-color: var(--color-primary-300); box-shadow: 0 14px 30px rgb(var(--color-shadow-rgb) / 11%); outline: none; }
.match-heading { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0.85rem 0.55rem; color: var(--color-text-subtle); font-size: 0.5rem; font-weight: 850; letter-spacing: 0.11em; }
.match-status { display: inline-flex; align-items: center; gap: 0.32rem; padding: 0.3rem 0.45rem; border-radius: 99px; background: var(--color-surface-muted); color: var(--color-text-muted); font-size: 0.48rem; letter-spacing: 0.06em; }
.match-status i { width: 5px; height: 5px; border-radius: 50%; background: var(--color-text-subtle); }
.match-status.completed { background: var(--color-primary-100); color: var(--color-primary-700); }
.match-status.completed i { background: var(--color-primary-500); }
.versus-layout { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: start; gap: 0.65rem; padding: 1rem 0.85rem 1.1rem; }
.versus-player { display: flex; min-width: 0; flex-direction: column; align-items: center; text-align: center; }
.versus-player :deep(.p-avatar) { width: 3.8rem; height: 3.8rem; border: 3px solid white; background: var(--color-surface-muted); color: var(--color-text-muted); font-size: 1.1rem; box-shadow: 0 5px 14px rgb(var(--color-shadow-rgb) / 12%); }
.versus-player.winner :deep(.p-avatar) { box-shadow: 0 0 0 3px var(--color-accent), 0 7px 16px rgb(var(--color-shadow-rgb) / 14%); }
.versus-player strong { overflow: hidden; width: 100%; margin-top: 0.55rem; color: var(--color-text-muted); font-size: 0.7rem; text-overflow: ellipsis; white-space: nowrap; }
.versus-player > span { display: flex; align-items: center; gap: 0.25rem; margin-top: 0.25rem; color: var(--color-primary-700); font-size: 0.5rem; font-weight: 750; }
.versus-center { display: flex; min-height: 5.8rem; flex-direction: column; align-items: center; justify-content: center; gap: 0.4rem; }
.versus-center > span { display: grid; place-items: center; width: 2rem; height: 2rem; border: 1px solid var(--color-border); border-radius: 50%; background: var(--color-surface-soft); color: var(--color-text-muted); font-size: 0.55rem; font-weight: 850; }
.versus-center strong { max-width: 5rem; color: var(--green); font-size: 0.63rem; text-align: center; }
.match-footer { display: flex; align-items: center; justify-content: space-between; padding: 0.65rem 0.85rem; border-top: 1px solid var(--color-surface-muted); background: var(--color-surface-soft); color: var(--color-text-subtle); font-size: 0.55rem; }
.match-footer i { color: var(--green); transition: transform 180ms; }
.round-robin-match:hover .match-footer i { transform: translateX(3px); }
.standings-section { margin-top: 0.25rem; }
.standings-table-wrap { overflow-x: auto; border: 1px solid var(--color-border); border-radius: 15px; box-shadow: 0 6px 20px rgb(var(--color-shadow-rgb) / 5%); }
.standings-table-wrap th { color: var(--color-text-muted); font-size: 0.57rem; letter-spacing: 0.07em; text-transform: uppercase; }
.standings-table-wrap td { color: var(--color-text-muted); font-size: 0.7rem; }
.position-badge { display: inline-grid; place-items: center; width: 1.7rem; height: 1.7rem; border-radius: 50%; background: var(--color-surface-muted); color: var(--color-text-muted); }
.position-badge.podium { background: var(--color-surface-muted); color: var(--color-sidebar-on-accent); }
.standing-player { display: flex; align-items: center; gap: 0.65rem; }
.standing-player :deep(.p-avatar) { width: 2.1rem; height: 2.1rem; background: var(--color-surface-muted); color: var(--color-text-muted); font-size: 0.62rem; }
.standing-player > span { display: grid; }
.standing-player small { margin-top: 0.12rem; color: var(--color-text-subtle); font-size: 0.52rem; font-weight: 400; }
.enrolled-section { display: flex; flex-direction: column; gap: 1rem; }
.selection-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.7rem 0.85rem; border: 1px solid var(--color-border); border-radius: 12px; background: var(--color-surface-soft); }
.selection-all { display: inline-flex; align-items: center; gap: 0.55rem; color: var(--color-text-muted); font-size: 0.7rem; font-weight: 700; cursor: pointer; }
.tournament-players-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(310px, 100%), 1fr)); gap: 0.8rem; }
.enrolled-player-card { position: relative; overflow: hidden; padding: 1rem; border: 1px solid var(--color-border); border-radius: 16px; background: var(--color-white); box-shadow: 0 6px 20px rgb(var(--color-shadow-rgb) / 5%); cursor: pointer; transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
.enrolled-player-card::before { position: absolute; inset: 0 0 auto; height: 3px; background: linear-gradient(90deg, var(--color-accent), var(--color-primary-500)); content: ''; }
.enrolled-player-card:hover, .enrolled-player-card:focus-visible { transform: translateY(-3px); border-color: var(--color-primary-300); box-shadow: 0 14px 30px rgb(var(--color-shadow-rgb) / 10%); outline: none; }
.player-card-top { display: flex; align-items: center; min-height: 2rem; gap: 0.55rem; }
.player-badges { display: flex; min-width: 0; flex-wrap: wrap; gap: 0.35rem; }
.ranking-value, .seed-value { color: var(--color-text-muted); font-size: 0.82rem; font-weight: 800; font-variant-numeric: tabular-nums; }
.seed-value { color: var(--green); font-size: 0.72rem; }
.player-arrow { display: grid; place-items: center; width: 1.85rem; height: 1.85rem; margin-left: auto; flex: 0 0 auto; border-radius: 50%; background: var(--color-surface-muted); color: var(--green); font-size: 0.65rem; transition: 180ms; }
.enrolled-player-card:hover .player-arrow { background: var(--green); color: var(--color-white); }
.player-card-identity { display: flex; align-items: center; gap: 0.85rem; padding: 1rem 0 0.9rem; }
.player-avatar { position: relative; flex: 0 0 auto; }
.player-avatar :deep(.p-avatar) { width: 4rem; height: 4rem; border: 3px solid white; background: var(--color-surface-muted); color: var(--color-text-muted); font-size: 1.2rem; box-shadow: 0 5px 14px rgb(var(--color-shadow-rgb) / 12%); }
.player-card-identity > div:last-child { min-width: 0; }
.player-card-identity h3 { overflow: hidden; margin: 0; font-size: 0.94rem; letter-spacing: -0.025em; text-overflow: ellipsis; white-space: nowrap; }
.player-card-identity > div:last-child span { display: flex; align-items: center; gap: 0.32rem; margin-top: 0.3rem; color: var(--color-text-muted); font-size: 0.61rem; }
.player-card-details { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
.player-card-details > div { display: flex; align-items: center; gap: 0.5rem; min-width: 0; padding: 0.6rem; border-radius: 10px; background: var(--color-surface-soft); }
.player-card-details > div > span { display: grid; place-items: center; width: 1.65rem; height: 1.65rem; flex: 0 0 auto; border-radius: 7px; background: var(--color-surface-card); color: var(--color-primary-300); font-size: 0.62rem; box-shadow: 0 2px 6px rgb(var(--color-shadow-rgb) / 6%); }
.player-card-details p { display: grid; min-width: 0; margin: 0; overflow: hidden; color: var(--color-text-muted); font-size: 0.61rem; text-overflow: ellipsis; white-space: nowrap; }
.player-card-details small { margin-bottom: 0.12rem; color: var(--color-text-subtle); font-size: 0.46rem; font-weight: 850; letter-spacing: 0.08em; }
.player-card-footer { display: flex; align-items: center; justify-content: space-between; gap: 0.7rem; margin-top: 0.8rem; padding-top: 0.7rem; border-top: 1px solid var(--color-surface-muted); color: var(--color-text-subtle); font-size: 0.56rem; }
.player-card-footer span:last-child { display: flex; align-items: center; gap: 0.3rem; color: var(--green); font-weight: 750; }

@media (max-width: 920px) {
  .hero-main { flex-direction: column; }
  .hero-actions { max-width: none; justify-content: flex-start; }
  .hero-stats { grid-template-columns: 1fr 1fr; }
  .hero-stats > div:nth-child(2) { border-right: 0; }
}
@media (max-width: 620px) {
  .detail-page { gap: 0.8rem; }
  .tournament-hero { overflow: visible; padding: 0.9rem; border-radius: 14px; box-shadow: 0 8px 24px rgb(var(--color-shadow-rgb) / 12%); }
  .back-link { min-height: 2rem; font-size: 0.74rem; }
  .status-badge, .visibility-badge { font-size: 0.75rem; }
  .hero-main { gap: 0.8rem; margin-top: 0.65rem; }
  .hero-badges { gap: 0.35rem; }
  .eyebrow { display: none; }
  .hero-copy h1 { margin-top: 0.65rem; font-size: 1.65rem; line-height: 1.08; }
  .hero-subtitle { margin-top: 0.45rem; font-size: 0.8125rem; }
  .hero-actions { display: flex; width: 100%; flex-wrap: nowrap; overflow-x: auto; padding-bottom: 0.15rem; }
  .hero-actions :deep(.p-button) { width: 100%; }
  .hero-actions :deep(.p-button) { font-size: 0.8125rem; }
  .hero-actions :deep(.p-button-label) { white-space: nowrap; }
  .hero-actions .more-action { width: 2.75rem; min-width: 2.75rem; }
  .actions-separator { display: none; }
  .hero-copy h1 { white-space: normal; }
  .hero-stats { grid-template-columns: 1fr 1fr; gap: 0.55rem; margin-top: 0.8rem; padding-top: 0.8rem; }
  .hero-stats > div { gap: 0.45rem; padding: 0; border: 0; }
  .stat-icon { width: 1.8rem; height: 1.8rem; }
  .hero-stats small { font-size: 0.75rem; letter-spacing: 0.04em; }
  .hero-stats strong { font-size: 0.8125rem; }
  .hero-extras { display: none; }
  .tournament-tabs { overflow: visible; border-radius: 14px; box-shadow: none; }
  .tournament-tabs :deep(.p-tablist) { overflow-x: auto; padding-inline: 0.35rem; border-radius: 14px 14px 0 0; }
  .tournament-tabs :deep(.p-tab) { min-width: max-content; padding: 0.8rem 0.7rem; font-size: 0.8125rem; }
  .tournament-tabs :deep(.p-button), .tournament-tabs :deep(.p-inputtext), .tournament-tabs :deep(.p-select), .tournament-tabs :deep(.p-multiselect) { font-size: 0.8125rem; }
  .tournament-tabs :deep(.p-tabpanels) { padding: 0.65rem; }
  .tournament-tabs :deep(article) { border-radius: 11px !important; box-shadow: none !important; }
  .tournament-tabs :deep(article:hover) { transform: none; }
  .round-robin-toggle { align-self: stretch; }
  .round-robin-toggle :deep(.p-button) { min-width: 0; flex: 1; }
  .schedule-heading > span { display: none; }
  .selection-toolbar { align-items: stretch; flex-direction: column; }
  .selection-toolbar :deep(.p-button) { width: 100%; }
  .round-robin-matches { gap: 0.55rem; }
  .round-robin-match { border-radius: 12px; box-shadow: none; }
  .match-heading, .match-status, .versus-player > span, .versus-center > span { font-size: 0.75rem; }
  .versus-player strong, .versus-center strong { font-size: 0.8125rem; }
  .versus-layout { padding: 0.7rem; }
  .versus-player :deep(.p-avatar) { width: 2.8rem; height: 2.8rem; }
  .match-footer { display: none; }
  .tournament-players-grid { display: flex; flex-direction: column; gap: 0.45rem; }
  .enrolled-player-card { display: grid; min-height: 4rem; grid-template-columns: auto auto minmax(0, 1fr) auto auto; align-items: center; gap: 0.45rem; padding: 0.45rem 0.55rem; border-radius: 12px; box-shadow: none; }
  .enrolled-player-card::before { width: 3px; height: auto; inset: 0 auto 0 0; background: var(--color-border-strong); }
  .player-card-top, .player-card-identity { display: contents; }
  .player-badges { grid-column: 4; grid-row: 1; display: flex; flex-direction: column; align-items: flex-end; gap: 0.05rem; }
  .player-card-top :deep(.p-checkbox) { grid-column: 1; grid-row: 1; margin-right: 0.1rem; }
  .player-avatar { grid-column: 2; grid-row: 1; }
  .player-avatar :deep(.p-avatar) { width: 2.75rem; height: 2.75rem; border-width: 2px; font-size: 0.9rem; box-shadow: none; }
  .player-card-identity > div:last-child { grid-column: 3; grid-row: 1; }
  .player-card-identity h3 { font-size: 1rem; }
  .seed-value { font-size: 0.75rem; }
  .ranking-value { font-size: 0.875rem; }
  .player-arrow { grid-column: 5; grid-row: 1; width: 2rem; height: 2rem; margin-left: 0; background: transparent; font-size: 0.75rem; }
  .player-card-details, .player-card-footer { display: none; }
  .standings-table-wrap { margin-inline: -0.65rem; border-right: 0; border-left: 0; border-radius: 0; }
  .standing-player { min-width: 10rem; }
  .standings-table-wrap th, .standing-player small { font-size: 0.75rem; }
  .standings-table-wrap td { font-size: 0.8125rem; }
}

/* Enrolled players stay compact on every viewport. */
.tournament-players-grid { display: grid; grid-template-columns: 1fr; gap: 0.45rem; }
.enrolled-player-card { display: grid; min-height: 4rem; grid-template-columns: auto auto minmax(0, 1fr) auto auto; align-items: center; gap: 0.45rem; padding: 0.45rem 0.55rem; box-shadow: none; }
.enrolled-player-card::before { width: 3px; height: auto; inset: 0 auto 0 0; background: var(--color-border-strong); }
.enrolled-player-card:hover { transform: none; }
.player-card-top, .player-card-identity { display: contents; }
.player-badges { grid-column: 4; grid-row: 1; display: flex; flex-direction: column; align-items: flex-end; gap: 0.05rem; }
.player-card-top :deep(.p-checkbox) { grid-column: 1; grid-row: 1; margin-right: 0.1rem; }
.player-avatar { grid-column: 2; grid-row: 1; }
.player-avatar :deep(.p-avatar) { width: 2.75rem; height: 2.75rem; border-width: 2px; font-size: 0.9rem; box-shadow: none; }
.player-card-identity > div:last-child { grid-column: 3; grid-row: 1; }
.player-card-identity h3 { font-size: 1rem; }
.seed-value { font-size: 0.75rem; }
.ranking-value { font-size: 0.875rem; }
.player-arrow { grid-column: 5; grid-row: 1; width: 2rem; height: 2rem; margin-left: 0; background: transparent; font-size: 0.75rem; }
.player-card-details, .player-card-footer { display: none; }

@media (min-width: 768px) {
  .tournament-players-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (min-width: 1200px) {
  .tournament-players-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
</style>
