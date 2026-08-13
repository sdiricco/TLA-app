<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import { watchDebounced } from '@vueuse/core'
import moment from 'moment'
import 'moment/locale/it.js'
import Avatar from 'primevue/avatar'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import ProgressSpinner from 'primevue/progressspinner'
import { useRouter } from 'vue-router'
import { playersService } from '@/services/playersApi'
import { tournamentsService } from '@/services/tournamentsApi'
import type { Player, Tournament, TournamentStatus } from '@/types'
import { getPlayerInitials } from '@/utils/main'

const visible = defineModel<boolean>('visible', { required: true })
const router = useRouter()
const searchInput = ref<{ $el?: HTMLInputElement } | null>(null)
const query = ref('')
const players = ref<Player[]>([])
const tournaments = ref<Tournament[]>([])
const playersTotal = ref(0)
const tournamentsTotal = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)

const minimumQueryLength = 2
let requestVersion = 0

function clearResults(): void {
  players.value = []
  tournaments.value = []
  playersTotal.value = 0
  tournamentsTotal.value = 0
  error.value = null
}

async function search(): Promise<void> {
  const term = query.value.trim()
  const version = requestVersion

  if (term.length < minimumQueryLength) {
    loading.value = false
    clearResults()
    return
  }

  loading.value = true
  error.value = null

  try {
    const [playerResponse, tournamentResponse] = await Promise.all([
      playersService.getAll({ name: term, page: 0, perPage: 6 }),
      tournamentsService.getAll({ name: term, page: 0, perPage: 6 }),
    ])

    if (version !== requestVersion) return

    players.value = playerResponse.values
    playersTotal.value = playerResponse.total
    tournaments.value = tournamentResponse.values
    tournamentsTotal.value = tournamentResponse.total
  } catch (searchError) {
    if (version !== requestVersion) return
    clearResults()
    error.value = (searchError as Error).message
  } finally {
    if (version === requestVersion) loading.value = false
  }
}

function focusSearch(): void {
  void nextTick(() => searchInput.value?.$el?.focus())
}

function closeSearch(): void {
  visible.value = false
}

async function openPlayer(player: Player): Promise<void> {
  closeSearch()
  await router.push({ name: 'player-detail', params: { id: player.id } })
}

async function openTournament(tournament: Tournament): Promise<void> {
  closeSearch()
  await router.push({ name: 'tournament-detail', params: { id: tournament.id } })
}

function statusLabel(status: TournamentStatus): string {
  return { upcoming: 'In programma', ongoing: 'In corso', completed: 'Completato' }[status]
}

function formatTournamentDate(date: string | null | undefined): string {
  return date ? moment(date).locale('it').format('D MMM YYYY') : 'Data da definire'
}

function resultCountLabel(total: number): string {
  return `${total} ${total === 1 ? 'risultato' : 'risultati'}`
}

watch(query, (value) => {
  requestVersion += 1

  if (value.trim().length < minimumQueryLength) {
    loading.value = false
    clearResults()
    return
  }

  loading.value = true
  error.value = null
})

watchDebounced(query, () => { void search() }, { debounce: 250 })

watch(visible, (isVisible) => {
  if (isVisible) {
    focusSearch()
    return
  }

  requestVersion += 1
  query.value = ''
  loading.value = false
  clearResults()
})
</script>

<template>
  <Dialog
    v-model:visible="visible"
    modal
    dismissable-mask
    header="Cerca"
    :close-button-props="{ 'aria-label': 'Chiudi ricerca' }"
    class="m-0 h-dvh! max-h-dvh! w-full! sm:h-auto! sm:max-h-[min(44rem,calc(100dvh-3rem))]! sm:max-w-2xl!"
    :pt="{ content: { class: 'flex-1 p-0! overflow-y-auto' } }"
    @show="focusSearch"
  >
    <div class="sticky top-0 z-10 border-b border-(--color-border) bg-(--color-surface-card) px-4 pb-4 pt-1 sm:px-5">
      <span class="relative block">
        <i class="pi pi-search absolute left-3 top-1/2 z-10 -translate-y-1/2 text-sm text-(--color-text-muted)" aria-hidden="true" />
        <InputText
          ref="searchInput"
          v-model="query"
          class="pl-10!"
          placeholder="Cerca giocatori o tornei"
          aria-label="Cerca giocatori o tornei"
          autocomplete="off"
          fluid
        />
      </span>
      <p class="mt-2 text-xs text-(--color-text-subtle)">
        Cerca nei contenuti della tua organizzazione.
      </p>
    </div>

    <div class="min-h-72 px-4 py-5 sm:px-5">
      <div
        v-if="loading"
        class="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-(--color-text-muted)"
        role="status"
      >
        <ProgressSpinner class="size-8" stroke-width="4" />
        <span>Ricerca in corso…</span>
      </div>

      <div
        v-else-if="error"
        class="flex min-h-56 flex-col items-center justify-center px-4 text-center"
        role="alert"
      >
        <span class="grid size-12 place-items-center rounded-full bg-red-50 text-red-600">
          <i class="pi pi-exclamation-circle" aria-hidden="true" />
        </span>
        <h2 class="mt-4 font-bold">Ricerca non disponibile</h2>
        <p class="mt-1 max-w-sm text-sm text-(--color-text-muted)">{{ error }}</p>
      </div>

      <div
        v-else-if="query.trim().length < minimumQueryLength"
        class="flex min-h-56 flex-col items-center justify-center px-4 text-center"
      >
        <span class="grid size-14 place-items-center rounded-full bg-primary-50 text-xl text-primary">
          <i class="pi pi-search" aria-hidden="true" />
        </span>
        <h2 class="mt-4 font-bold">Cosa stai cercando?</h2>
        <p class="mt-1 max-w-sm text-sm text-(--color-text-muted)">
          Digita almeno due caratteri per trovare giocatori e tornei.
        </p>
      </div>

      <div
        v-else-if="players.length === 0 && tournaments.length === 0"
        class="flex min-h-56 flex-col items-center justify-center px-4 text-center"
      >
        <span class="grid size-14 place-items-center rounded-full bg-(--color-surface-muted) text-xl text-(--color-text-muted)">
          <i class="pi pi-search" aria-hidden="true" />
        </span>
        <h2 class="mt-4 font-bold">Nessun risultato</h2>
        <p class="mt-1 max-w-sm text-sm text-(--color-text-muted)">
          Prova con un nome diverso o con meno parole.
        </p>
      </div>

      <div v-else class="grid gap-6">
        <!-- Section: Player results -->
        <section v-if="players.length" aria-labelledby="global-player-results">
          <header class="mb-2 flex items-baseline justify-between gap-3">
            <h2 id="global-player-results" class="text-sm font-extrabold">Giocatori</h2>
            <span class="text-xs text-(--color-text-subtle)">{{ resultCountLabel(playersTotal) }}</span>
          </header>
          <div class="grid gap-1">
            <button
              v-for="player in players"
              :key="player.id"
              type="button"
              class="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-(--color-surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
              @click="openPlayer(player)"
            >
              <Avatar
                class="size-10!"
                :label="getPlayerInitials(player)"
                :image="player.photo_url ?? undefined"
                shape="square"
              />
              <span class="min-w-0">
                <strong class="block truncate text-sm">{{ player.name }}</strong>
                <small class="mt-0.5 block truncate text-(--color-text-muted)">
                  {{ player.club || 'Club non specificato' }}<template v-if="player.ranking"> · #{{ player.ranking }}</template>
                </small>
              </span>
              <i class="pi pi-chevron-right text-xs text-primary" aria-hidden="true" />
            </button>
          </div>
        </section>

        <!-- Section: Tournament results -->
        <section v-if="tournaments.length" aria-labelledby="global-tournament-results">
          <header class="mb-2 flex items-baseline justify-between gap-3">
            <h2 id="global-tournament-results" class="text-sm font-extrabold">Tornei</h2>
            <span class="text-xs text-(--color-text-subtle)">{{ resultCountLabel(tournamentsTotal) }}</span>
          </header>
          <div class="grid gap-1">
            <button
              v-for="tournament in tournaments"
              :key="tournament.id"
              type="button"
              class="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors hover:bg-(--color-surface-soft) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
              @click="openTournament(tournament)"
            >
              <span class="grid size-10 place-items-center rounded-lg bg-primary-50 text-primary">
                <IconifyIcon icon="mdi:trophy-outline" class="size-5" aria-hidden="true" />
              </span>
              <span class="min-w-0">
                <strong class="block truncate text-sm">{{ tournament.name }}</strong>
                <small class="mt-0.5 block truncate text-(--color-text-muted)">
                  {{ statusLabel(tournament.status) }} · {{ formatTournamentDate(tournament.start_date) }}
                </small>
              </span>
              <i class="pi pi-chevron-right text-xs text-primary" aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    </div>
  </Dialog>
</template>
