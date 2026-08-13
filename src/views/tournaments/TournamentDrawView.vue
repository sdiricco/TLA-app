<script setup lang="ts">
import { computed, onMounted, ref, watch, type CSSProperties } from 'vue'
import { useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import ButtonGroup from 'primevue/buttongroup'
import Drawer from 'primevue/drawer'
import Menu from 'primevue/menu'
import type { MenuItem } from 'primevue/menuitem'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import Tabs from 'primevue/tabs'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import TournamentMatchCard from '@/components/tournaments/TournamentMatchCard.vue'
import { useTournamentDetail } from '@/components/tournaments/tournamentDetailContext'
import { matchesService } from '@/services/matchesApi'
import { useAuthStore } from '@/stores/auth'
import { useMatchesStore } from '@/stores/matches'
import { usePlayersStore } from '@/stores/players'
import type { Match, Player } from '@/types'
import { getPlayerInitials } from '@/utils/main'
import { getSeededPlayersCount } from '@/utils/matches'

const GLOBAL_BRACKET_COLUMN_REM = 18
const GLOBAL_BRACKET_MIN_HEIGHT_PX = 680
const GLOBAL_BRACKET_MATCH_STEP_PX = 148

// -----------------------------------------------------------------------------
// Shared context and stores
// Matches stay out of the parent route so visiting the players page does not
// download draw data that it never renders.
// -----------------------------------------------------------------------------
const { tournament, reloadTournament } = useTournamentDetail()
const router = useRouter()
const playersStore = usePlayersStore()
const matchesStore = useMatchesStore()
const auth = useAuthStore()
const confirm = useConfirm()
const toast = useToast()

// -----------------------------------------------------------------------------
// Local UI state
// -----------------------------------------------------------------------------
const loading = ref(true)
const resettingDraw = ref(false)
const generatingDraw = ref(false)
const downloadingPdf = ref(false)
const completingPhase = ref(false)
const activeBracketRound = ref(0)
const bracketViewMode = ref<'rounds' | 'global'>('rounds')
const roundRobinViewMode = ref<'schedule' | 'standings'>('schedule')
const selectedPhaseId = ref<string | null>(
  tournament.value.phases?.find((phase) => phase.status === 'active')?.id
    ?? tournament.value.phases?.[0]?.id
    ?? null,
)
const selectedGroupId = ref<string | null>(null)
const phaseDrawerVisible = ref(false)
const drawActionsMenu = ref<{ toggle: (event: Event) => void } | null>(null)

// -----------------------------------------------------------------------------
// Player and seed lookups
// Both match cards and standings consume these maps. Building them once avoids
// repeated array searches across potentially large draws.
// -----------------------------------------------------------------------------
const enrolledPlayerIds = computed<string[]>(() => {
  const phase = tournament.value.phases?.find((entry) => entry.id === selectedPhaseId.value)
  if (phase) {
    if (phase.format === 'round_robin' && selectedGroupId.value) {
      const idsFromGroupMatches = new Set<string>()
      matchesStore.matches
        .filter((match) => match.group_id === selectedGroupId.value)
        .forEach((match) => {
          if (match.player1_id) idsFromGroupMatches.add(match.player1_id)
          if (match.player2_id) idsFromGroupMatches.add(match.player2_id)
        })
      if (idsFromGroupMatches.size > 0) return [...idsFromGroupMatches]
    }
    return phase.players
      .filter((entry) =>
        !selectedGroupId.value
        || !phase.players.some((player) => player.group_id)
        || entry.group_id === selectedGroupId.value,
      )
      .sort((left, right) => (left.seed ?? Number.MAX_SAFE_INTEGER) - (right.seed ?? Number.MAX_SAFE_INTEGER))
      .map((entry) => entry.player_id)
  }
  if (tournament.value.playerIds) return tournament.value.playerIds
  return [...(tournament.value.tournament_players ?? [])]
    .sort((left, right) => (left.seed ?? Number.MAX_SAFE_INTEGER) - (right.seed ?? Number.MAX_SAFE_INTEGER))
    .map((entry) => entry.player_id)
})
const enrolledPlayers = computed<Player[]>(() =>
  enrolledPlayerIds.value
    .map((id) => playersStore.players.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player)),
)
const playersById = computed(() => new Map(playersStore.players.map((player) => [player.id, player])))
const seedsByPlayerId = computed(() => {
  const seededPlayersCount = getSeededPlayersCount(enrolledPlayers.value.length)
  return new Map(
    [...enrolledPlayers.value]
      .sort((left, right) => left.ranking - right.ranking)
      .slice(0, seededPlayersCount)
      .map((player, index) => [player.id, index + 1]),
  )
})

// -----------------------------------------------------------------------------
// Round-robin and elimination models
// The store is format-agnostic; these computed values adapt it to the two
// presentation modes without duplicating match state.
// -----------------------------------------------------------------------------
const hasMatches = computed(() => matchesStore.matches.length > 0)
const phases = computed(() => [...(tournament.value.phases ?? [])].sort((left, right) => left.position - right.position))
const activePhase = computed(() =>
  phases.value.find((phase) => phase.id === selectedPhaseId.value)
    ?? phases.value.find((phase) => phase.status === 'active')
    ?? phases.value[0],
)
const phaseGroups = computed(() => activePhase.value?.groups ?? [])
const phaseOptions = computed(() => phases.value.map((phase) => ({
  label: `Fase ${phase.position} di ${phases.value.length} · ${phase.name}`,
  value: phase.id,
  disabled: phase.status === 'pending',
})))
const groupOptions = computed(() => phaseGroups.value.map((group) => ({
  label: group.name,
  value: group.id,
})))
const isRoundRobin = computed(() => activePhase.value?.format === 'round_robin')
const guaranteedQualifiersPerGroup = computed(() =>
  Math.floor((activePhase.value?.output_count ?? 0) / Math.max(1, phaseGroups.value.length)),
)
const activePhasePlayersCount = computed(
  () => activePhase.value?.players.length ?? enrolledPlayerIds.value.length,
)
const visibleMatches = computed(() =>
  isRoundRobin.value && selectedGroupId.value
    ? matchesStore.matches.filter((match) => match.group_id === selectedGroupId.value)
    : matchesStore.matches,
)
function scorePairs(result: string | null): Array<[number, number]> {
  if (!result) return []
  return Array.from(result.matchAll(/(\d+)\s*[-–]\s*(\d+)/g), (match) => [
    Number(match[1]),
    Number(match[2]),
  ])
}

const bracketRoundTabs = computed(() => {
  if (isRoundRobin.value) {
    const rounds = [...new Set(visibleMatches.value.map((match) => match.round_index))].sort((a, b) => a - b)
    return rounds.map((index) => ({
      index,
      label: `G${index + 1}`,
      fullLabel: `Giornata ${index + 1}`,
    }))
  }
  return matchesStore.rounds.map((round) => ({
    index: round.index,
    label: round.short_name,
    fullLabel: round.name,
  }))
})
const activeBracketMatches = computed(() =>
  visibleMatches.value.filter((match) => match.round_index === activeBracketRound.value),
)
const roundRobinStandings = computed(() =>
  enrolledPlayers.value
    .map((player) => {
      const completed = visibleMatches.value.filter(
        (match) => match.status === 'completed'
          && (match.player1_id === player.id || match.player2_id === player.id),
      )
      const wins = completed.filter((match) => match.winner_id === player.id).length
      let setDifference = 0
      let gameDifference = 0
      completed.forEach((match) => {
        const playerIsFirst = match.player1_id === player.id
        scorePairs(match.result).forEach(([firstGames, secondGames]) => {
          const ownGames = playerIsFirst ? firstGames : secondGames
          const opponentGames = playerIsFirst ? secondGames : firstGames
          gameDifference += ownGames - opponentGames
          if (ownGames > opponentGames) setDifference += 1
          else if (opponentGames > ownGames) setDifference -= 1
        })
      })
      return {
        player,
        played: completed.length,
        wins,
        losses: completed.length - wins,
        setDifference,
        gameDifference,
      }
    })
    .sort((left, right) => {
      const performance =
        right.wins - left.wins
        || right.setDifference - left.setDifference
        || right.gameDifference - left.gameDifference
      if (performance !== 0) return performance
      const headToHead = visibleMatches.value.find(
        (match) =>
          match.status === 'completed'
          && (
            (match.player1_id === left.player.id && match.player2_id === right.player.id)
            || (match.player1_id === right.player.id && match.player2_id === left.player.id)
          ),
      )
      if (headToHead?.winner_id === left.player.id) return -1
      if (headToHead?.winner_id === right.player.id) return 1
      return left.player.ranking - right.player.ranking
    }),
)
const nextPhase = computed(() =>
  phases.value.find((phase) => phase.position === (activePhase.value?.position ?? 0) + 1),
)
const completedMatchesCount = computed(
  () => matchesStore.matches.filter((match) => match.status === 'completed').length,
)
const phaseMatchesCount = computed(() => matchesStore.matches.length)
const remainingMatchesCount = computed(() =>
  Math.max(0, phaseMatchesCount.value - completedMatchesCount.value),
)
const phaseProgressPercentage = computed(() =>
  phaseMatchesCount.value > 0
    ? Math.round((completedMatchesCount.value / phaseMatchesCount.value) * 100)
    : 0,
)
const activeRoundPosition = computed(() =>
  bracketRoundTabs.value.findIndex((round) => round.index === activeBracketRound.value),
)
const canCompletePhase = computed(
  () =>
    auth.isAdmin
    && activePhase.value?.status === 'active'
    && Boolean(nextPhase.value)
    && hasMatches.value
    && matchesStore.matches.every((match) => match.status === 'completed'),
)
const drawActions = computed<MenuItem[]>(() => [{
  label: isRoundRobin.value ? 'Azzera girone' : 'Azzera tabellone',
  icon: 'pi pi-refresh',
  class: 'text-red-600',
  disabled: auth.isGuest || resettingDraw.value,
  command: confirmResetDraw,
}])

// -----------------------------------------------------------------------------
// Global bracket geometry
// This is the only presentation that cannot be expressed with static Tailwind
// utilities: column count and vertical positions depend on the generated draw.
// SVG coordinates are normalized to the 0-1000 viewBox used in the template.
// -----------------------------------------------------------------------------
const globalFirstRoundMatches = computed(() =>
  matchesStore.matchesByRound.get(0)?.filter(Boolean).length ?? 1,
)
const globalBracketColumns = computed(() =>
  bracketRoundTabs.value.map((tab) => ({
    ...tab,
    matches: (matchesStore.matchesByRound.get(tab.index) ?? []).filter(
      (match): match is Match => Boolean(match),
    ),
  })),
)
const globalBracketWidthStyle = computed<CSSProperties>(() => ({
  width: `${Math.max(1, globalBracketColumns.value.length) * GLOBAL_BRACKET_COLUMN_REM}rem`,
}))
const globalBracketGridStyle = computed<CSSProperties>(() => ({
  gridTemplateColumns: `repeat(${globalBracketColumns.value.length}, minmax(${GLOBAL_BRACKET_COLUMN_REM}rem, 1fr))`,
}))
const globalBracketBodyStyle = computed<CSSProperties>(() => ({
  height: `${Math.max(
    GLOBAL_BRACKET_MIN_HEIGHT_PX,
    globalFirstRoundMatches.value * GLOBAL_BRACKET_MATCH_STEP_PX,
  )}px`,
}))
const globalBracketConnectors = computed(() => {
  const roundsCount = Math.max(1, matchesStore.numRounds)
  const firstRoundMatches = Math.max(1, globalFirstRoundMatches.value)
  return matchesStore.matches
    .filter((match) => match.round_index < roundsCount - 1)
    .map((match) => {
      const roundIndex = match.round_index

      // Each new round covers twice as many first-round slots. The parent match
      // is therefore found by grouping adjacent positions in pairs.
      const span = 2 ** roundIndex
      const parentSpan = span * 2
      const sourceY = ((match.position * span + span / 2) / firstRoundMatches) * 1000
      const parentPosition = Math.floor(match.position / 2)
      const targetY = ((parentPosition * parentSpan + parentSpan / 2) / firstRoundMatches) * 1000

      // A short horizontal segment on both sides of the vertical connector
      // keeps lines readable without overlapping the match cards.
      const sourceX = ((roundIndex + 0.93) / roundsCount) * 1000
      const targetX = ((roundIndex + 1.07) / roundsCount) * 1000
      const middleX = (sourceX + targetX) / 2
      return { id: match.id, path: `M ${sourceX} ${sourceY} H ${middleX} V ${targetY} H ${targetX}` }
    })
})

function getGlobalMatchStyle(roundIndex: number, position: number): CSSProperties {
  const span = 2 ** roundIndex
  const center = ((position * span + span / 2) / Math.max(1, globalFirstRoundMatches.value)) * 100
  return { top: `${center}%` }
}

// -----------------------------------------------------------------------------
// Data loading
// Player metadata and matches are independent requests and can run in parallel.
// -----------------------------------------------------------------------------
async function loadDraw(): Promise<void> {
  loading.value = true
  try {
    await Promise.all([
      playersStore.fetchAll({ page: 0, perPage: 100 }),
      matchesStore.loadForTournament(tournament.value.id, selectedPhaseId.value ?? undefined),
    ])
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    loading.value = false
  }
}

// -----------------------------------------------------------------------------
// Draw lifecycle actions
// -----------------------------------------------------------------------------
async function createEmptyBracket(): Promise<void> {
  if (auth.isGuest || generatingDraw.value) return
  if (activePhasePlayersCount.value < 2) {
    toast.add({
      severity: 'warn',
      summary: 'Giocatori insufficienti',
      detail: 'Iscrivi almeno due giocatori prima di generare gli incontri.',
      life: 4000,
    })
    return
  }

  generatingDraw.value = true
  try {
    await matchesStore.createEmptyBracket(
      tournament.value.id,
      activePhasePlayersCount.value,
      activePhase.value?.id,
    )
    activeBracketRound.value = 0
    toast.add({
      severity: 'success',
      summary: isRoundRobin.value ? 'Girone generato' : 'Tabellone generato',
      detail: isRoundRobin.value
        ? 'Le giornate sono pronte.'
        : 'Gli incontri sono pronti.',
      life: 3000,
    })
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Generazione non riuscita',
      detail: (error as Error).message,
      life: 5000,
    })
  } finally {
    generatingDraw.value = false
  }
}

function confirmResetDraw(): void {
  const roundRobin = isRoundRobin.value
  confirm.require({
    message: roundRobin
      ? 'Azzera il girone, le giornate e tutti i risultati inseriti?'
      : 'Azzera il tabellone e tutti i risultati inseriti?',
    header: roundRobin ? 'Azzera girone' : 'Azzera tabellone',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Annulla',
    acceptLabel: 'Azzera',
    acceptSeverity: 'danger',
    accept: async () => {
      resettingDraw.value = true
      try {
        await matchesStore.reset(tournament.value.id, activePhase.value?.id)
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

async function downloadDrawPdf(): Promise<void> {
  if (downloadingPdf.value) return
  downloadingPdf.value = true
  try {
    const blob = await matchesService.downloadDrawPdf(tournament.value.id, activePhase.value?.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${tournament.value.name.toLocaleLowerCase('it').replace(/[^a-z0-9]+/g, '-')}-tabellone.pdf`
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

async function completeCurrentPhase(): Promise<void> {
  if (!activePhase.value || !canCompletePhase.value) return
  completingPhase.value = true
  try {
    const updated = await matchesStore.completePhase(tournament.value.id, activePhase.value.id)
    await reloadTournament()
    const activated = updated.phases?.find((phase) => phase.status === 'active')
    selectedPhaseId.value = activated?.id ?? null
    selectedGroupId.value = null
    activeBracketRound.value = 0
    toast.add({
      severity: 'success',
      summary: 'Fase conclusa',
      detail: `${activated?.name ?? 'La fase successiva'} è pronta.`,
      life: 3500,
    })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Impossibile concludere la fase', detail: (error as Error).message, life: 4500 })
  } finally {
    completingPhase.value = false
  }
}

function openMatchDetail(match: Match): void {
  void router.push({
    name: 'match-detail',
    params: { id: tournament.value.id, matchId: match.id },
  })
}

function selectPhase(phaseId: string): void {
  const phase = phases.value.find((item) => item.id === phaseId)
  if (!phase || phase.status === 'pending') return
  selectedPhaseId.value = phase.id
  phaseDrawerVisible.value = false
}

function changeRound(direction: -1 | 1): void {
  const nextPosition = activeRoundPosition.value + direction
  const nextRound = bracketRoundTabs.value[nextPosition]
  if (nextRound) activeBracketRound.value = nextRound.index
}

// A regenerated or reset draw always starts from its first available round.
watch(
  () => matchesStore.numRounds,
  () => { activeBracketRound.value = 0 },
  { immediate: true },
)

watch(activePhase, (phase) => {
  selectedGroupId.value = phase?.format === 'round_robin' ? phase.groups[0]?.id ?? null : null
}, { immediate: true })

watch(selectedPhaseId, async (phaseId, previousPhaseId) => {
  if (!phaseId || phaseId === previousPhaseId) return
  await matchesStore.loadForTournament(tournament.value.id, phaseId)
  activeBracketRound.value = 0
})

watch(selectedGroupId, () => {
  activeBracketRound.value = bracketRoundTabs.value[0]?.index ?? 0
})

// Initial loading starts only when this child route is actually visited.
onMounted(loadDraw)
</script>

<template>
  <!------------------------------>
  <!-- Section: Draw and matches -->
  <!------------------------------>
  <div v-if="loading" class="flex min-h-60 items-center justify-center" role="status">
    <ProgressSpinner class="size-9" stroke-width="4" />
  </div>

  <div v-else class="flex flex-col gap-4 py-2">
    <Menu ref="drawActionsMenu" :model="drawActions" popup />
    <Drawer
      v-model:visible="phaseDrawerVisible"
      position="right"
      header="Percorso del torneo"
      class="w-full! sm:w-104!"
    >
      <p class="mb-4 text-sm text-muted-color">{{ phases.length }} fasi complessive</p>
      <nav class="grid gap-2" aria-label="Fasi del torneo">
        <button
          v-for="phase in phases"
          :key="phase.id"
          type="button"
          class="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border p-3 text-left transition-colors"
          :class="phase.id === selectedPhaseId
            ? 'border-primary-200 bg-primary-50 text-primary'
            : 'border-(--color-border) bg-(--color-surface-card)'"
          :disabled="phase.status === 'pending'"
          @click="selectPhase(phase.id)"
        >
          <span
            class="grid size-8 place-items-center rounded-full text-xs font-bold"
            :class="phase.id === selectedPhaseId ? 'bg-primary text-white' : 'bg-(--color-surface-soft) text-muted-color'"
          >
            <i v-if="phase.status === 'completed'" class="pi pi-check" aria-hidden="true" />
            <span v-else>{{ phase.position }}</span>
          </span>
          <span class="grid min-w-0 gap-0.5">
            <strong class="truncate text-sm">Fase {{ phase.position }} · {{ phase.name }}</strong>
            <small class="text-xs text-muted-color">
              {{ phase.status === 'completed' ? 'Completata' : phase.status === 'active' ? 'In corso' : 'Non ancora disponibile' }}
            </small>
            <small v-if="phase.description" class="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-color">
              {{ phase.description }}
            </small>
          </span>
          <i
            :class="phase.status === 'pending' ? 'pi pi-lock' : 'pi pi-chevron-right'"
            class="text-xs text-muted-color"
            aria-hidden="true"
          />
        </button>
      </nav>
    </Drawer>

    <!------------------------------>
    <!-- Section: Tournament phases -->
    <!------------------------------>
    <section
      v-if="phases.length > 1"
      class="grid gap-4 rounded-xl border border-(--color-border) bg-(--color-surface-card) p-4 lg:grid-cols-[minmax(15rem,0.9fr)_minmax(15rem,1.1fr)_auto] lg:items-end"
    >
      <div class="grid gap-2">
        <label for="tournament-phase" class="text-sm font-bold text-muted-color">Fase corrente</label>
        <Select
          id="tournament-phase"
          v-model="selectedPhaseId"
          :options="phaseOptions"
          option-label="label"
          option-value="value"
          option-disabled="disabled"
          fluid
        />
        <p v-if="activePhase?.description" class="text-xs leading-relaxed text-muted-color">
          {{ activePhase.description }}
        </p>
      </div>

      <div class="grid gap-2 pb-1">
        <div class="flex items-center justify-between gap-3 text-xs">
          <span class="text-muted-color">Incontri completati</span>
          <strong>{{ completedMatchesCount }} di {{ phaseMatchesCount }}</strong>
        </div>
        <div
          class="h-1.5 overflow-hidden rounded-full bg-(--color-surface-muted)"
          role="progressbar"
          aria-label="Incontri completati nella fase"
          :aria-valuenow="completedMatchesCount"
          aria-valuemin="0"
          :aria-valuemax="Math.max(1, phaseMatchesCount)"
        >
          <span
            class="block h-full rounded-full bg-primary transition-[width]"
            :style="{ width: `${phaseProgressPercentage}%` }"
          />
        </div>
      </div>

      <Button
        label="Vedi percorso"
        icon="pi pi-sitemap"
        severity="secondary"
        outlined
        @click="phaseDrawerVisible = true"
      />
    </section>

    <div v-if="enrolledPlayers.length < 2" class="flex min-h-55 flex-col items-center justify-center gap-3 text-center text-muted-color">
      <i class="pi pi-sitemap text-2xl" />
      <p>Servono almeno 2 giocatori per generare il tabellone.</p>
    </div>

    <!------------------------------>
    <!-- Section: Round robin -->
    <!------------------------------>
    <template v-else-if="isRoundRobin">
      <label
        v-if="phaseGroups.length > 1"
        for="tournament-group"
        class="grid max-w-64 gap-2 text-sm font-bold text-muted-color"
      >
        Girone
        <Select
          id="tournament-group"
          v-model="selectedGroupId"
          :options="groupOptions"
          option-label="label"
          option-value="value"
          fluid
        />
      </label>

      <div v-if="auth.isAdmin && !hasMatches" class="flex flex-wrap items-center gap-2">
        <Button
          label="Genera girone"
          icon="pi pi-plus"
          size="small"
          :loading="generatingDraw"
          :disabled="auth.isGuest || activePhasePlayersCount < 2"
          @click="createEmptyBracket"
        />
      </div>

      <div v-if="!hasMatches" class="flex min-h-55 flex-col items-center justify-center gap-3 text-center text-muted-color">
        <i class="pi pi-calendar text-2xl" />
        <p>Nessun girone generato.<template v-if="auth.isAdmin"> Clicca <strong>Genera girone</strong> per creare le giornate.</template></p>
      </div>

      <template v-else>
        <!-- Schedule and standings navigation -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <ButtonGroup>
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
          </ButtonGroup>
          <Button
            v-if="auth.isAdmin"
            icon="pi pi-ellipsis-h"
            size="small"
            severity="secondary"
            text
            aria-label="Altre azioni sul girone"
            :disabled="auth.isGuest"
            @click="drawActionsMenu?.toggle($event)"
          />
        </div>

        <div v-if="roundRobinViewMode === 'schedule'" class="flex flex-col gap-3">
          <div class="flex items-center justify-between gap-3 rounded-xl border border-(--color-border) bg-(--color-surface-soft) p-3 sm:p-4">
            <div>
              <h2 class="font-bold">
                {{ bracketRoundTabs.find((tab) => tab.index === activeBracketRound)?.fullLabel }}
                <span class="text-muted-color">di {{ bracketRoundTabs.length }}</span>
              </h2>
              <p class="mt-1 text-xs text-muted-color">{{ activeBracketMatches.length }} incontri</p>
            </div>
            <div class="flex gap-2">
              <Button
                icon="pi pi-chevron-left"
                severity="secondary"
                outlined
                aria-label="Giornata precedente"
                :disabled="activeRoundPosition <= 0"
                @click="changeRound(-1)"
              />
              <Button
                icon="pi pi-chevron-right"
                severity="secondary"
                outlined
                aria-label="Giornata successiva"
                :disabled="activeRoundPosition < 0 || activeRoundPosition >= bracketRoundTabs.length - 1"
                @click="changeRound(1)"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
            <TournamentMatchCard
              v-for="match in activeBracketMatches"
              :key="match.id"
              :match="match"
              :players-by-id="playersById"
              :seeds-by-player-id="seedsByPlayerId"
              :heading="`Match ${String(match.position + 1).padStart(2, '0')}`"
              show-pending-status
              @open="openMatchDetail(match)"
            />
          </div>
        </div>

        <!-- Round-robin standings -->
        <section v-else class="flex flex-col gap-4">
          <div class="flex items-center justify-between gap-4">
            <div class="flex items-center gap-3">
              <span class="grid size-10 place-items-center rounded-lg bg-primary-50 text-primary"><i class="pi pi-list" /></span>
              <div>
                <small class="text-xs font-extrabold tracking-widest text-muted-color">RISULTATI</small>
                <h2 class="mt-0.5 text-base font-bold">
                  {{ phaseGroups.find((group) => group.id === selectedGroupId)?.name ?? 'Classifica generale' }}
                </h2>
              </div>
            </div>
            <span class="hidden rounded-full bg-surface-100 px-2.5 py-1.5 text-xs font-bold sm:inline-flex">
              {{ roundRobinStandings.length }} giocatori
            </span>
          </div>

          <div class="-mx-3 overflow-x-auto border-y border-(--color-border) sm:mx-0 sm:rounded-lg sm:border">
            <table class="w-full min-w-130 border-collapse text-sm text-muted-color">
              <thead class="bg-surface-100 text-left text-xs uppercase tracking-wide">
                <tr>
                  <th class="p-3 text-center">Pos.</th>
                  <th class="p-3">Giocatore</th>
                  <th class="p-3 text-center">G</th>
                  <th class="p-3 text-center">V</th>
                  <th class="p-3 text-center">P</th>
                  <th class="p-3 text-center">DS</th>
                  <th class="p-3 text-center">DG</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(row, index) in roundRobinStandings"
                  :key="row.player.id"
                  class="border-t border-surface-200"
                  :class="{ 'bg-primary-50': index < guaranteedQualifiersPerGroup }"
                >
                  <td class="p-3 text-center font-bold">
                    <span class="inline-grid size-7 place-items-center rounded-full bg-surface-100" :class="index < 3 ? 'text-primary' : 'text-muted-color'">
                      {{ index + 1 }}
                    </span>
                  </td>
                  <td class="p-3 font-semibold">
                    <div class="flex min-w-40 items-center gap-2.5">
                      <Avatar
                        class="size-9!"
                        :label="getPlayerInitials(row.player)"
                        :image="row.player.photo_url ?? undefined"
                        shape="square"
                      />
                      <span class="grid">
                        {{ row.player.name }}
                        <small class="mt-0.5 text-xs font-normal text-muted-color">{{ row.player.club || 'Club non specificato' }}</small>
                      </span>
                    </div>
                  </td>
                  <td class="p-3 text-center">{{ row.played }}</td>
                  <td class="p-3 text-center font-semibold text-emerald-700">{{ row.wins }}</td>
                  <td class="p-3 text-center">{{ row.losses }}</td>
                  <td class="p-3 text-center">{{ row.setDifference > 0 ? '+' : '' }}{{ row.setDifference }}</td>
                  <td class="p-3 text-center">{{ row.gameDifference > 0 ? '+' : '' }}{{ row.gameDifference }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

      </template>
    </template>

    <!------------------------------>
    <!-- Section: Elimination bracket -->
    <!------------------------------>
    <template v-else>
      <div v-if="auth.isAdmin && !hasMatches" class="flex items-center gap-2">
          <Button
            label="Genera tabellone"
            icon="pi pi-plus"
            size="small"
            :loading="generatingDraw"
            :disabled="auth.isGuest || activePhasePlayersCount < 2"
            @click="createEmptyBracket"
          />
      </div>

      <div v-if="!hasMatches" class="flex min-h-55 flex-col items-center justify-center gap-3 text-center text-muted-color">
        <i class="pi pi-sitemap text-2xl" />
        <p>Nessun tabellone generato.<template v-if="auth.isAdmin"> Clicca <strong>Genera tabellone</strong> per iniziare.</template></p>
      </div>

      <div v-else class="flex flex-col gap-4">
        <!-- Bracket toolbar -->
        <div class="flex flex-wrap items-center justify-between gap-2">
          <ButtonGroup>
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
          </ButtonGroup>
          <div class="flex items-center gap-1">
            <Button
              label="Scarica PDF"
              icon="pi pi-download"
              size="small"
              severity="secondary"
              outlined
              :loading="downloadingPdf"
              @click="downloadDrawPdf"
            />
            <Button
              v-if="auth.isAdmin"
              icon="pi pi-ellipsis-h"
              size="small"
              severity="secondary"
              text
              aria-label="Altre azioni sul tabellone"
              :disabled="auth.isGuest"
              @click="drawActionsMenu?.toggle($event)"
            />
          </div>
        </div>

        <!-- Bracket grouped by round -->
        <div v-if="bracketViewMode === 'rounds'" class="flex flex-col gap-4">
          <Tabs v-model:value="activeBracketRound" scrollable>
            <TabList>
              <Tab
              v-for="tab in bracketRoundTabs"
              :key="tab.index"
              :value="tab.index"
              :title="tab.fullLabel"
              class="min-w-16 whitespace-nowrap"
              >
                {{ tab.label }}
              </Tab>
            </TabList>
          </Tabs>

          <div v-if="activeBracketMatches.length === 0" class="flex min-h-45 items-center justify-center rounded-lg border border-dashed border-surface-200 text-muted-color">
            Nessun incontro disponibile per questo turno.
          </div>
          <div v-else class="flex flex-col gap-3">
            <div class="flex items-center justify-between gap-3">
              <h2 class="text-sm font-bold uppercase tracking-wide text-muted-color">
                {{ bracketRoundTabs.find((tab) => tab.index === activeBracketRound)?.fullLabel }}
              </h2>
              <span class="rounded-full bg-surface-100 px-2.5 py-1 text-xs font-semibold text-muted-color">
                {{ activeBracketMatches.length }} incontri
              </span>
            </div>
            <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
              <TournamentMatchCard
                v-for="match in activeBracketMatches"
                :key="match.id"
                :match="match"
                :players-by-id="playersById"
                :seeds-by-player-id="seedsByPlayerId"
                :show-pending-status="auth.isAdmin"
                @open="openMatchDetail(match)"
              />
            </div>
          </div>
        </div>

        <!-- Complete bracket with data-driven geometry -->
        <div v-else class="overflow-x-auto rounded-lg border border-surface-200 bg-surface-50">
          <div class="min-w-max" :style="globalBracketWidthStyle">
            <div class="grid border-b border-surface-200" :style="globalBracketGridStyle">
              <div
                v-for="(column, columnIndex) in globalBracketColumns"
                :key="column.index"
                class="px-5 py-4 text-lg font-bold text-color"
                :class="columnIndex % 2 === 0 ? 'bg-surface-100' : 'bg-surface-50'"
              >
                {{ column.fullLabel }}
              </div>
            </div>

            <div class="relative" :style="globalBracketBodyStyle">
              <div class="absolute inset-0 grid" :style="globalBracketGridStyle">
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

              <div class="absolute inset-0 z-20 grid" :style="globalBracketGridStyle">
                <div v-for="column in globalBracketColumns" :key="column.index" class="relative min-w-0">
                  <TournamentMatchCard
                    v-for="match in column.matches"
                    :key="match.id"
                    class="absolute inset-x-4 -translate-y-1/2"
                    :style="getGlobalMatchStyle(column.index, match.position)"
                    :match="match"
                    :players-by-id="playersById"
                    :seeds-by-player-id="seedsByPlayerId"
                    :show-pending-status="auth.isAdmin"
                    @open="openMatchDetail(match)"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!------------------------------>
    <!-- Section: Phase transition -->
    <!------------------------------>
    <section
      v-if="activePhase?.status === 'active' && nextPhase && hasMatches"
      class="flex flex-col gap-3 rounded-xl border border-primary-200 bg-primary-50 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>
        <h3 class="font-bold">Prossimo passaggio: {{ nextPhase.name }}</h3>
        <p class="mt-1 text-sm text-muted-color">
          <template v-if="remainingMatchesCount > 0">
            {{ remainingMatchesCount === 1 ? 'Manca 1 risultato' : `Mancano ${remainingMatchesCount} risultati` }}
            per completare la fase corrente.
          </template>
          <template v-else>
            Tutti gli incontri sono completi. La fase successiva può essere generata.
          </template>
        </p>
      </div>
      <Button
        v-if="auth.isAdmin"
        label="Passa alla fase successiva"
        icon="pi pi-arrow-right"
        :disabled="!canCompletePhase"
        :loading="completingPhase"
        @click="completeCurrentPhase"
      />
    </section>
  </div>
</template>
