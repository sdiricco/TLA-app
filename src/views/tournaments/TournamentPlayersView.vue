<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import moment from 'moment'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Checkbox from 'primevue/checkbox'
import InputText from 'primevue/inputtext'
import MultiSelect from 'primevue/multiselect'
import ProgressSpinner from 'primevue/progressspinner'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import TournamentPlayerListItem from '@/components/tournaments/TournamentPlayerListItem.vue'
import { useAuthStore } from '@/stores/auth'
import { useLayoutStore } from '@/stores/layout'
import { usePlayersStore } from '@/stores/players'
import { useTournamentsStore } from '@/stores/tournaments'
import type { Player, TournamentWithPlayers } from '@/types'
import { getSeededPlayersCount } from '@/utils/matches'

type PlayerSelectOption = Player & { searchText: string }

// -----------------------------------------------------------------------------
// Route and shared stores
// -----------------------------------------------------------------------------
const route = useRoute()
const playersStore = usePlayersStore()
const tournamentsStore = useTournamentsStore()
const auth = useAuthStore()
const layout = useLayoutStore()
const confirm = useConfirm()
const toast = useToast()

// -----------------------------------------------------------------------------
// Local UI state
// -----------------------------------------------------------------------------
const loading = ref(true)
const tournament = ref<TournamentWithPlayers | null>(null)
const selectedPlayerIds = ref<string[]>([])
const selectedRemovePlayerIds = ref<string[]>([])
const enrolledNameFilter = ref('')
const enrolledClubFilter = ref('')
const addingPlayer = ref(false)
const canManageTournament = computed(() => tournament.value?.can_manage === true)

// -----------------------------------------------------------------------------
// Derived player collections
// Enrolments may arrive in either the normalized playerIds form or as join-table
// records. Converting them here gives the rest of the page one stable model.
// -----------------------------------------------------------------------------
const enrolledPlayerIds = computed<string[]>(() => {
  if (!tournament.value) return []
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
const filteredEnrolledPlayers = computed(() => {
  const name = enrolledNameFilter.value.trim().toLocaleLowerCase('it')
  const club = enrolledClubFilter.value.trim().toLocaleLowerCase('it')
  return enrolledPlayers.value.filter((player) =>
    (!name || player.name.toLocaleLowerCase('it').includes(name))
    && (!club || (player.club ?? '').toLocaleLowerCase('it').includes(club)),
  )
})
const availablePlayers = computed(() =>
  playersStore.players.filter((player) => !enrolledPlayerIds.value.includes(player.id)),
)
const availablePlayersOptions = computed<PlayerSelectOption[]>(() =>
  availablePlayers.value.map((player) => ({
    ...player,
    searchText: [player.name, player.club ?? '', String(player.ranking)].join(' ').toLocaleLowerCase('it'),
  })),
)

// Maps avoid repeatedly scanning the full player list while rendering chips and
// cards. Seeds are assigned by ranking using the tournament draw convention.
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
const allPlayersSelected = computed(
  () => filteredEnrolledPlayers.value.length > 0
    && filteredEnrolledPlayers.value.every((player) => selectedRemovePlayerIds.value.includes(player.id)),
)
const somePlayersSelected = computed(
  () => filteredEnrolledPlayers.value.some((player) => selectedRemovePlayerIds.value.includes(player.id))
    && !allPlayersSelected.value,
)
const canAddMorePlayers = computed(() =>
  !tournament.value?.participant_limit || enrolledPlayers.value.length < tournament.value.participant_limit,
)

// -----------------------------------------------------------------------------
// Data loading
// -----------------------------------------------------------------------------
async function reloadTournament(): Promise<void> {
  tournament.value = await tournamentsStore.getById(route.params['id'] as string)
}

async function loadPage(): Promise<void> {
  loading.value = true
  try {
    await Promise.all([
      reloadTournament(),
      playersStore.fetchAll({ page: 0, perPage: 100 }),
    ])
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Pagina non disponibile', detail: (error as Error).message, life: 4000 })
  } finally {
    loading.value = false
  }
}

// -----------------------------------------------------------------------------
// Presentation and filter helpers
// -----------------------------------------------------------------------------
function formatAge(birthDate: string | null | undefined): string {
  if (!birthDate) return 'Età non disponibile'
  const date = moment(birthDate, moment.ISO_8601, true)
  return date.isValid() ? `${moment().diff(date, 'years')} anni` : 'Età non disponibile'
}

function getPlayerInitials(player: Player): string {
  return player.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function getPlayerInitialsById(playerId: string): string {
  const player = playerById.value.get(playerId)
  return player ? getPlayerInitials(player) : ''
}

function getPlayerName(playerId: string): string {
  return playerById.value.get(playerId)?.name ?? 'Giocatore sconosciuto'
}

function clearFilters(): void {
  enrolledNameFilter.value = ''
  enrolledClubFilter.value = ''
}

// -----------------------------------------------------------------------------
// Bulk selection
// "Select all" applies only to the currently filtered rows. Clearing it also
// preserves selections that are temporarily hidden by the filters.
// -----------------------------------------------------------------------------
function toggleRemoveAll(checked: boolean): void {
  const filteredIds = new Set(filteredEnrolledPlayers.value.map((player) => player.id))
  selectedRemovePlayerIds.value = checked
    ? [...new Set([...selectedRemovePlayerIds.value, ...filteredIds])]
    : selectedRemovePlayerIds.value.filter((id) => !filteredIds.has(id))
}

function toggleRemovePlayer(playerId: string, checked: boolean): void {
  if (checked) {
    selectedRemovePlayerIds.value = [...new Set([...selectedRemovePlayerIds.value, playerId])]
    return
  }
  selectedRemovePlayerIds.value = selectedRemovePlayerIds.value.filter((id) => id !== playerId)
}

// -----------------------------------------------------------------------------
// Administrative mutations
// Every successful mutation reloads the shared tournament so the hero counter,
// player list and the other subpage observe the same enrolment state.
// -----------------------------------------------------------------------------
async function addPlayers(): Promise<void> {
  if (!tournament.value || selectedPlayerIds.value.length === 0) return
  addingPlayer.value = true
  try {
    const addedCount = selectedPlayerIds.value.length
    for (const playerId of selectedPlayerIds.value) {
      await tournamentsStore.addPlayer(tournament.value.id, playerId)
    }
    await reloadTournament()
    selectedPlayerIds.value = []
    toast.add({ severity: 'success', summary: 'Aggiunti', detail: `${addedCount} giocatori iscritti`, life: 3000 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    addingPlayer.value = false
  }
}

function confirmRemovePlayers(players: Player[]): void {
  if (!tournament.value || players.length === 0) return
  const tournamentId = tournament.value.id
  confirm.require({
    message: players.length === 1
      ? `Rimuovere ${players[0]?.name ?? 'il giocatore selezionato'} da questo torneo?`
      : `Rimuovere ${players.length} giocatori selezionati da questo torneo?`,
    header: 'Conferma rimozione',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Annulla',
    acceptLabel: 'Rimuovi',
    acceptSeverity: 'danger',
    accept: async () => {
      try {
        for (const player of players) {
          await tournamentsStore.removePlayer(tournamentId, player.id)
        }
        await reloadTournament()
        selectedRemovePlayerIds.value = []
        toast.add({
          severity: 'success',
          summary: 'Rimosso',
          detail: players.length === 1
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
  confirmRemovePlayers(
    enrolledPlayers.value.filter((player) => selectedRemovePlayerIds.value.includes(player.id)),
  )
}

layout.setTopbarContext({
  title: 'Giocatori iscritti',
  backTo: `/tournaments/${String(route.params['id'])}/draw`,
  backLabel: 'Torna al torneo',
})

onMounted(loadPage)
onBeforeUnmount(layout.clearTopbarContext)
watch(
  () => enrolledPlayerIds.value.join(','),
  (currentIds, previousIds) => {
    if (currentIds !== previousIds && !loading.value) void playersStore.fetchAll({ page: 0, perPage: 100 })
  },
)
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <main v-if="loading" class="flex min-h-60 items-center justify-center" role="status">
    <ProgressSpinner class="size-9" stroke-width="4" />
  </main>

  <main v-else-if="tournament" class="mx-auto flex w-full max-w-screen-2xl flex-col gap-5 text-(--color-text)">
    <!------------------------------>
    <!-- Section: Page heading -->
    <!------------------------------>
    <header>
      <p class="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-primary">Partecipanti</p>
      <div class="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 class="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{{ tournament.name }}</h1>
          <p class="mt-2 text-sm text-(--color-text-muted) sm:text-base">Consulta {{ canManageTournament ? 'e gestisci ' : '' }}i giocatori iscritti al torneo.</p>
        </div>
        <strong class="shrink-0 text-sm text-(--color-text-muted)">
          {{ enrolledPlayers.length }} {{ enrolledPlayers.length === 1 ? 'iscritto' : 'iscritti' }}
          <template v-if="tournament.participant_limit"> / {{ tournament.participant_limit }}</template>
        </strong>
      </div>
    </header>

    <!------------------------------>
    <!-- Section: Enrolled players -->
    <!------------------------------>
    <section class="flex flex-col gap-4">
    <!-- Player filters -->
    <div class="grid gap-3 rounded-lg border border-surface-200 bg-surface-0 p-4 lg:grid-cols-[1fr_1fr_auto]">
      <div class="flex flex-col gap-1.5">
        <label for="enrolled-player-name" class="text-sm font-medium">Cerca per nome</label>
        <InputText id="enrolled-player-name" v-model="enrolledNameFilter" placeholder="Mario Rossi" fluid />
      </div>
      <div class="flex flex-col gap-1.5">
        <label for="enrolled-player-club" class="text-sm font-medium">Cerca per club</label>
        <InputText id="enrolled-player-club" v-model="enrolledClubFilter" placeholder="TC Milano" fluid />
      </div>
      <div class="flex items-end">
        <Button label="Azzera filtri" severity="secondary" outlined @click="clearFilters" />
      </div>
    </div>

    <!-- Administrator player management -->
    <template v-if="canManageTournament">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span class="text-sm text-muted-color">
          {{ enrolledPlayers.length }} giocatori iscritti
          <template v-if="tournament.participant_limit"> su {{ tournament.participant_limit }}</template>
        </span>
        <span v-if="!canAddMorePlayers" class="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
          Torneo al completo
        </span>
      </div>

      <div class="rounded-lg border border-surface-200 bg-surface-50 p-4">
        <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
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
            @click="addPlayers"
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
              <Avatar
                class="size-11!"
                :label="getPlayerInitials(option)"
                :image="option.photo_url ?? undefined"
                shape="circle"
              />
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2">
                  <span class="truncate font-medium text-color">{{ option.name }}</span>
              <Tag :value="`#${option.ranking}`" severity="secondary" />
                </div>
                <div class="text-xs text-muted-color">
                  <template v-if="option.club">{{ option.club }} · </template>{{ formatAge(option.birth_date) }}
                </div>
              </div>
            </div>
          </template>
          <template #chip="{ value }">
            <div class="flex items-center gap-2">
              <span class="inline-flex size-5 items-center justify-center rounded-full bg-primary-100 text-[0.65rem] font-bold text-primary">
                {{ getPlayerInitialsById(value) }}
              </span>
              <span>{{ getPlayerName(value) }}</span>
            </div>
          </template>
        </MultiSelect>
      </div>

      <div v-if="enrolledPlayers.length === 0" class="flex min-h-55 flex-col items-center justify-center gap-3 text-center text-muted-color">
        <i class="pi pi-users text-2xl" />
        <p>Nessun giocatore iscritto.<br />Clicca <strong>Aggiungi giocatore</strong> per iniziare.</p>
      </div>
      <div v-else-if="filteredEnrolledPlayers.length === 0" class="flex min-h-45 flex-col items-center justify-center gap-3 text-center text-muted-color">
        <i class="pi pi-search text-2xl" />
        <p>Nessun iscritto corrisponde ai filtri.</p>
      </div>
      <div v-else class="flex flex-col gap-4">
        <div class="flex flex-col items-stretch justify-between gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-soft) p-3 sm:flex-row sm:items-center">
          <label class="inline-flex cursor-pointer items-center gap-2 text-sm font-bold text-muted-color">
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
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          <TournamentPlayerListItem
            v-for="player in filteredEnrolledPlayers"
            :key="player.id"
            :player="player"
            :seed="seedByPlayerId.get(player.id)"
            selectable
            :selected="selectedRemovePlayerIds.includes(player.id)"
            :disabled="auth.isGuest"
            @selected-change="toggleRemovePlayer(player.id, $event)"
            @open="$router.push({ name: 'player-detail', params: { id: player.id } })"
          />
        </div>
      </div>
    </template>

    <!-- Participant directory -->
    <template v-else>
      <div v-if="filteredEnrolledPlayers.length === 0" class="flex flex-col items-center gap-3 py-10 text-center text-muted-color">
        <i :class="enrolledPlayers.length === 0 ? 'pi pi-users' : 'pi pi-search'" class="text-2xl" />
        <p>{{ enrolledPlayers.length === 0 ? 'Non ci sono ancora giocatori iscritti.' : 'Nessun iscritto corrisponde ai filtri.' }}</p>
      </div>
      <div v-else class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
        <TournamentPlayerListItem
          v-for="player in filteredEnrolledPlayers"
          :key="player.id"
          :player="player"
          :seed="seedByPlayerId.get(player.id)"
          @open="$router.push({ name: 'player-detail', params: { id: player.id } })"
        />
      </div>
    </template>
    </section>
  </main>

  <main v-else class="grid min-h-60 place-items-center text-center text-(--color-text-muted)">
    <div><i class="pi pi-exclamation-circle text-2xl" /><p class="mt-2">Torneo non disponibile.</p></div>
  </main>
</template>
