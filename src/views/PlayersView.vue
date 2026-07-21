<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
import Badge from 'primevue/badge'
import Button from 'primevue/button'
import Chip from 'primevue/chip'
import Drawer from 'primevue/drawer'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Skeleton from 'primevue/skeleton'
import OrganizationFilter from '@/components/filters/OrganizationFilter.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import PlayerListItem from '@/components/players/PlayerListItem.vue'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationsStore } from '@/stores/organizations'
import { usePlayersStore } from '@/stores/players'
import type { OrganizationFilter as OrganizationFilterValue, Player, PlayerSortField, SortOrder } from '@/types'

interface SelectOption<T> {
  label: string
  value: T
}

interface PlayerFilters {
  club: string
  sortBy: PlayerSortField
  sortOrder: SortOrder
  organizationId: OrganizationFilterValue
}

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

const sortFieldOptions: SelectOption<PlayerSortField>[] = [
  { label: 'Ranking', value: 'ranking' },
  { label: 'Nome', value: 'name' },
  { label: 'Club', value: 'club' },
  { label: 'Più recenti', value: 'created_at' },
]
const sortOrderOptions: SelectOption<SortOrder>[] = [
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

onMounted(loadPlayers)
watchDebounced(searchName, () => { void loadPlayers(0, store.perPage) }, { debounce: 300 })
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <div class="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 text-(--color-text) sm:gap-6">
    <!-- Section: Header -->
    <PageHeader eyebrow="ROSTER DEL CIRCOLO" title="I protagonisti del campo." description="Consulta profili, ranking e informazioni dei tuoi giocatori." />

    <!-- Section: Search and creation -->
    <div class="flex items-center gap-2">
      <span class="relative min-w-0 max-w-lg flex-1"><i class="pi pi-search pointer-events-none absolute left-4 top-1/2 z-10 -translate-y-1/2 text-sm text-(--color-text-subtle)" /><InputText v-model="searchName" class="h-11 w-full rounded-none border-(--color-border) bg-(--color-surface-card) pl-11" aria-label="Cerca giocatore per nome" placeholder="Cerca giocatore per nome" fluid /></span>
      <Button v-if="canViewAdmin" class="h-11 rounded-none" label="Crea" icon="pi pi-user-plus" :disabled="auth.isGuest" @click="router.push({ name: 'player-create' })" />
    </div>

    <!------------------------------>
    <!-- Section: List heading and filters -->
    <!------------------------------>
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-baseline gap-3"><h2 class="text-xl font-bold">Giocatori</h2><span class="text-xs text-(--color-text-subtle)">{{ store.total }} profili</span></div>
      <Button class="relative size-10 rounded-none p-0!" text plain aria-label="Apri filtri giocatori" title="Filtra giocatori" @click="openFilters"><i class="pi pi-filter" /><Badge v-if="activeFiltersCount" :value="activeFiltersCount" class="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full! bg-primary-600! px-1! text-[0.65rem]! font-bold! text-white!" /></Button>
    </div>

    <div v-if="activeFilterChips.length" class="flex flex-wrap gap-2">
      <Chip v-for="chip in activeFilterChips" :key="chip.key" :label="chip.label" removable class="rounded-none! border border-(--color-border) bg-white!" @remove="removeFilter(chip.key)" />
    </div>

    <!-- Section: Filters drawer -->
    <Drawer v-model:visible="filtersOpen" position="right" header="Filtra giocatori" class="w-full! sm:w-104!">
      <div class="flex flex-col gap-5">
        <label for="player-club-filter" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Cerca per club<InputText id="player-club-filter" v-model="draftFilters.club" placeholder="Es. TC Milano" fluid /></label>
        <label for="player-organization-filter" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Organizzazione<OrganizationFilter id="player-organization-filter" v-model="draftFilters.organizationId" /></label>
        <label for="player-sort-field" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Ordina per<Select id="player-sort-field" v-model="draftFilters.sortBy" :options="sortFieldOptions" option-label="label" option-value="value" fluid /></label>
        <label for="player-sort-order" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Direzione<Select id="player-sort-order" v-model="draftFilters.sortOrder" :options="sortOrderOptions" option-label="label" option-value="value" fluid /></label>
      </div>
      <template #footer><div class="grid gap-2 sm:grid-cols-[auto_1fr]"><Button label="Azzera" icon="pi pi-refresh" severity="secondary" outlined @click="draftFilters = createDefaultFilters()" /><Button label="Mostra risultati" icon="pi pi-check" @click="applyFilters" /></div></template>
    </Drawer>

    <!------------------------------>
    <!-- Section: Players list -->
    <!------------------------------>
    <div v-if="store.loading" class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3"><div v-for="item in 8" :key="item" class="grid min-h-16 grid-cols-[auto_1fr_auto] items-center gap-3 border border-(--color-border) bg-(--color-surface-card) p-3"><Skeleton shape="square" size="2.75rem" /><div class="grid gap-2"><Skeleton width="65%" height="1rem" /><Skeleton width="40%" height="0.75rem" /></div><Skeleton width="1rem" height="1rem" /></div></div>

    <div v-else-if="store.players.length === 0" class="flex min-h-70 flex-col items-center justify-center border border-dashed border-(--color-border) bg-(--color-surface-soft) text-center"><span class="grid size-14 place-items-center rounded-full bg-primary-50 text-xl text-primary-700"><i class="pi pi-users" /></span><h3 class="mt-4 text-xl font-bold">Nessun giocatore trovato</h3><p class="mt-2 text-sm text-(--color-text-muted)">Modifica i filtri oppure aggiungi il primo giocatore.</p></div>

    <template v-else>
      <div class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3"><PlayerListItem v-for="player in store.players" :key="player.id" :player="player" @open="openDetail(player)" /></div>
      <div class="flex flex-col items-center gap-3"><Button v-if="hasMorePlayers" label="Carica altro" icon="pi pi-chevron-down" severity="secondary" text :loading="store.loadingMore" @click="loadMore" /><p v-else class="flex items-center gap-2 text-xs text-(--color-text-subtle)"><i class="pi pi-check-circle text-primary-500" /> Hai visualizzato tutti i giocatori</p></div>
    </template>
  </div>
</template>
