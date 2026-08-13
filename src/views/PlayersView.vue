<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
import Button from 'primevue/button'
import Chip from 'primevue/chip'
import InputText from 'primevue/inputtext'
import Skeleton from 'primevue/skeleton'
import PageHeader from '@/components/layout/PageHeader.vue'
import PlayerFiltersDrawer from '@/components/players/PlayerFiltersDrawer.vue'
import PlayerListItem from '@/components/players/PlayerListItem.vue'
import type { PlayerFilterOption, PlayerFilters } from '@/components/players/playerFilters'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationsStore } from '@/stores/organizations'
import { usePlayersStore } from '@/stores/players'
import type { Player, PlayerSortField, SortOrder } from '@/types'

interface ActivePlayerFilter {
  key: keyof PlayerFilters
  label: string
}

// Shared stores and local filter state.
const store = usePlayersStore()
const auth = useAuthStore()
const organizationsStore = useOrganizationsStore()
const router = useRouter()
const searchName = ref('')
const filtersOpen = ref(false)
const draftFilters = ref<PlayerFilters>(createDefaultFilters())
const appliedFilters = ref<PlayerFilters>(createDefaultFilters())

const canViewAdmin = computed(() => auth.isAdmin)
const hasMorePlayers = computed(() => store.players.length < store.total)
const activeFiltersCount = computed(() => [
  appliedFilters.value.club.trim() !== '',
  appliedFilters.value.sortBy !== 'ranking',
  appliedFilters.value.sortOrder !== 'asc',
  appliedFilters.value.organizationId !== 'mine',
].filter(Boolean).length)

const sortFieldOptions: PlayerFilterOption<PlayerSortField>[] = [
  { label: 'Ranking', value: 'ranking' },
  { label: 'Nome', value: 'name' },
  { label: 'Club', value: 'club' },
  { label: 'Più recenti', value: 'created_at' },
]
const sortOrderOptions: PlayerFilterOption<SortOrder>[] = [
  { label: 'Crescente', value: 'asc' },
  { label: 'Decrescente', value: 'desc' },
]

// Applied filters are converted into removable PrimeVue chips.
const activeFilterChips = computed<ActivePlayerFilter[]>(() => {
  const filters = appliedFilters.value
  const chips: ActivePlayerFilter[] = []
  if (filters.club.trim()) chips.push({ key: 'club', label: `Club: ${filters.club.trim()}` })
  if (filters.sortBy !== 'ranking') {
    const option = sortFieldOptions.find((item) => item.value === filters.sortBy)
    if (option) chips.push({ key: 'sortBy', label: `Ordina: ${option.label}` })
  }
  if (filters.sortOrder !== 'asc') {
    const option = sortOrderOptions.find((item) => item.value === filters.sortOrder)
    if (option) chips.push({ key: 'sortOrder', label: option.label })
  }
  if (filters.organizationId !== 'mine') {
    const label = filters.organizationId === 'global'
      ? 'Contenuti globali'
      : organizationsStore.organizations.find((organization) => organization.id === filters.organizationId)?.name ?? 'Organizzazione'
    chips.push({ key: 'organizationId', label })
  }
  return chips
})

const hasQueryFilters = computed(() =>
  searchName.value.trim() !== '' || activeFiltersCount.value > 0
)

function createDefaultFilters(): PlayerFilters {
  return { club: '', sortBy: 'ranking', sortOrder: 'asc', organizationId: 'mine' }
}

async function loadPlayers(page = 0, perPage = store.perPage): Promise<void> {
  const filters = appliedFilters.value
  await store.fetchAll({
    name: searchName.value.trim() || undefined,
    club: filters.club.trim() || undefined,
    page,
    perPage,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    organizationId: filters.organizationId,
  })
}

async function loadMore(): Promise<void> {
  if (store.loadingMore || !hasMorePlayers.value) return
  const filters = appliedFilters.value
  await store.fetchAll({
    name: searchName.value.trim() || undefined,
    club: filters.club.trim() || undefined,
    page: store.page + 1,
    perPage: store.perPage,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
    organizationId: filters.organizationId,
  }, { append: true })
}

function openFilters(): void {
  draftFilters.value = { ...appliedFilters.value }
  filtersOpen.value = true
}

function applyFilters(): void {
  appliedFilters.value = { ...draftFilters.value }
  filtersOpen.value = false
  void loadPlayers(0, store.perPage)
}

function clearDraftFilters(): void {
  draftFilters.value = createDefaultFilters()
}

function clearAppliedFilters(): void {
  appliedFilters.value = createDefaultFilters()
  void loadPlayers(0, store.perPage)
}

function clearAllQueryFilters(): void {
  const hadSearch = searchName.value.trim() !== ''
  appliedFilters.value = createDefaultFilters()
  searchName.value = ''
  if (!hadSearch) void loadPlayers(0, store.perPage)
}

function removeFilter(key: ActivePlayerFilter['key']): void {
  const filters = { ...appliedFilters.value }
  if (key === 'club') filters.club = ''
  if (key === 'sortBy') filters.sortBy = 'ranking'
  if (key === 'sortOrder') filters.sortOrder = 'asc'
  if (key === 'organizationId') filters.organizationId = 'mine'
  appliedFilters.value = filters
  void loadPlayers(0, store.perPage)
}

function openDetail(player: Player): void {
  void router.push({ name: 'player-detail', params: { id: player.id } })
}

function openCreate(): void {
  if (auth.isGuest) return
  void router.push({ name: 'player-create' })
}

onMounted(loadPlayers)
watchDebounced(searchName, () => { void loadPlayers(0, store.perPage) }, { debounce: 300 })
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <div class="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 text-(--color-text) sm:gap-5">
    <!-- Section: Header -->
    <PageHeader
      class="sm:items-start!"
      title="I protagonisti del campo."
      description="Consulta profili, ranking e informazioni dei tuoi giocatori."
    />

    <!------------------------------>
    <!-- Section: Search and filters -->
    <!------------------------------>
    <section class="rounded-lg border border-(--color-border) bg-(--color-surface-card) p-3 sm:p-4">
      <div class="flex items-end gap-2 sm:justify-between">
        <label
          for="player-name-filter"
          class="grid min-w-0 flex-1 gap-2 text-sm font-bold text-(--color-text-muted) sm:max-w-72"
        >
          <span>Giocatore</span>
          <InputText
            id="player-name-filter"
            v-model="searchName"
            aria-label="Cerca giocatore per nome"
            placeholder="Cerca giocatore per nome"
            fluid
          />
        </label>
        <Button
          label="Filtri"
          icon="pi pi-sliders-h"
          severity="secondary"
          outlined
          :badge="activeFiltersCount ? String(activeFiltersCount) : undefined"
          aria-label="Apri filtri giocatori"
          title="Filtra giocatori"
          @click="openFilters"
        />
      </div>

      <div v-if="activeFilterChips.length" class="mt-4 border-t border-(--color-border) pt-3">
        <div class="mb-2 flex items-center justify-between gap-3">
          <p class="text-xs font-bold text-(--color-text-muted)">
            Filtri attivi ({{ activeFiltersCount }})
          </p>
          <Button
            label="Azzera tutti"
            severity="secondary"
            variant="link"
            size="small"
            @click="clearAppliedFilters"
          />
        </div>
        <div class="flex min-w-0 flex-wrap gap-2">
          <Chip
            v-for="chip in activeFilterChips"
            :key="chip.key"
            class="max-w-full [&_.p-chip-label]:max-w-64 [&_.p-chip-label]:truncate"
            :label="chip.label"
            removable
            :aria-label="`Filtro ${chip.label}`"
            @remove="removeFilter(chip.key)"
          />
        </div>
      </div>
    </section>

    <!-- Section: Results heading -->
    <div class="flex items-baseline gap-3">
      <h2 class="text-lg font-bold tracking-tight sm:text-xl">Risultati</h2>
      <span class="text-xs text-(--color-text-subtle)">
        {{ store.total }} {{ store.total === 1 ? 'profilo' : 'profili' }}
      </span>
    </div>

    <!------------------------------>
    <!-- Section: Players list -->
    <!------------------------------>
    <div v-if="store.loading" class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      <div v-for="item in 8" :key="item" class="grid min-h-24 grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg border border-(--color-border) bg-(--color-surface-card) px-4 py-4 sm:px-5">
        <Skeleton shape="square" size="3rem" />
        <div class="grid gap-2"><Skeleton width="65%" height="1rem" /><Skeleton width="40%" height="0.875rem" /></div>
        <Skeleton width="1rem" height="1rem" />
      </div>
    </div>

    <div v-else-if="store.players.length === 0" class="flex min-h-72 flex-col items-center justify-center border border-dashed border-(--color-border) bg-(--color-surface-card) px-5 py-10 text-center">
      <span class="grid size-14 place-items-center rounded-full bg-primary-50 text-xl text-primary"><i class="pi pi-users" /></span>
      <h3 class="mb-1 mt-4 text-lg font-bold">{{ hasQueryFilters ? 'Nessun giocatore corrisponde ai filtri selezionati' : 'Nessun giocatore disponibile' }}</h3>
      <p class="max-w-md text-sm text-(--color-text-muted)">{{ hasQueryFilters ? 'Prova ad ampliare la ricerca o ad azzerare i filtri.' : 'Aggiungi il primo giocatore della tua organizzazione.' }}</p>
      <div v-if="hasQueryFilters || (canViewAdmin && !auth.isGuest)" class="mt-5 flex flex-wrap justify-center gap-2">
        <Button v-if="hasQueryFilters" label="Azzera filtri" icon="pi pi-filter-slash" severity="secondary" outlined @click="clearAllQueryFilters" />
        <Button v-if="canViewAdmin && !auth.isGuest" label="Crea un giocatore" icon="pi pi-user-plus" @click="openCreate" />
      </div>
    </div>

    <template v-else>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"><PlayerListItem v-for="player in store.players" :key="player.id" :player="player" @open="openDetail(player)" /></div>
      <div class="flex flex-col items-center gap-3"><Button v-if="hasMorePlayers" label="Carica altro" icon="pi pi-chevron-down" severity="secondary" text :loading="store.loadingMore" @click="loadMore" /><p v-else class="flex items-center gap-2 text-xs text-(--color-text-subtle)"><i class="pi pi-check-circle text-primary-500" /> Hai visualizzato tutti i giocatori</p></div>
    </template>
  </div>

  <!-- Section: Filters sidebar -->
  <PlayerFiltersDrawer
    v-model:visible="filtersOpen"
    v-model:filters="draftFilters"
    :sort-field-options="sortFieldOptions"
    :sort-order-options="sortOrderOptions"
    @reset="clearDraftFilters"
    @apply="applyFilters"
  />
</template>
