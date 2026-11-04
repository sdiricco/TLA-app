<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTimeoutFn, watchDebounced } from '@vueuse/core'
import Button from 'primevue/button'
import Chip from 'primevue/chip'
import Dialog from 'primevue/dialog'
import InputGroup from 'primevue/inputgroup'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tab from 'primevue/tab'
import TabList from 'primevue/tablist'
import TabPanel from 'primevue/tabpanel'
import TabPanels from 'primevue/tabpanels'
import Tabs from 'primevue/tabs'
import PageHeader from '@/components/layout/PageHeader.vue'
import PlayerFiltersDrawer from '@/components/players/PlayerFiltersDrawer.vue'
import PlayerListItem from '@/components/players/PlayerListItem.vue'
import type { PlayerFilterOption, PlayerFilters } from '@/components/players/playerFilters'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationsStore } from '@/stores/organizations'
import { usePlayersStore } from '@/stores/players'
import { organizationsService } from '@/services/organizationsApi'
import type { OrganizationInviteCandidate, Player, PlayerSortField, SortOrder } from '@/types'

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
const inviteOpen = ref(false)
const inviteMessage = ref<string | null>(null)
const inviteError = ref<string | null>(null)
const inviteSearch = ref('')
const inviteEmail = ref('')
const inviteCandidates = ref<OrganizationInviteCandidate[]>([])
const inviteLoading = ref(false)
const invitingPlayerId = ref<string | null>(null)
const invitingEmail = ref(false)
const draftFilters = ref<PlayerFilters>(createDefaultFilters())
const appliedFilters = ref<PlayerFilters>(createDefaultFilters())

const canViewAdmin = computed(() => auth.isAdmin)
const activeOrganization = computed(() => organizationsStore.activeOrganization)
const canInvitePlayers = computed(() =>
  !auth.isGuest && organizationsStore.isAdmin && activeOrganization.value !== null
)
const hasMorePlayers = computed(() => store.players.length < store.total)
const activeFiltersCount = computed(() => [
  appliedFilters.value.club.trim() !== '',
  appliedFilters.value.sortBy !== 'ranking',
  appliedFilters.value.sortOrder !== 'asc',
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
  return chips
})

const hasQueryFilters = computed(() =>
  searchName.value.trim() !== '' || activeFiltersCount.value > 0
)
const { start: scheduleInviteMessageClear } = useTimeoutFn(
  () => { inviteMessage.value = null },
  3000,
  { immediate: false },
)

function createDefaultFilters(): PlayerFilters {
  return {
    club: '',
    sortBy: 'ranking',
    sortOrder: 'asc',
    organizationId: organizationsStore.activeId ?? 'global',
  }
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
  if (key === 'organizationId') filters.organizationId = organizationsStore.activeId ?? 'global'
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

function openInvite(): void {
  if (!canInvitePlayers.value) return
  inviteMessage.value = null
  inviteError.value = null
  inviteSearch.value = ''
  inviteEmail.value = ''
  inviteOpen.value = true
  void loadInviteCandidates()
}

async function loadInviteCandidates(): Promise<void> {
  const organizationId = activeOrganization.value?.id
  if (!organizationId) return
  inviteLoading.value = true
  inviteError.value = null
  try {
    inviteCandidates.value = await organizationsService.getInvitationCandidates(organizationId, inviteSearch.value.trim())
  } catch (error) {
    inviteError.value = (error as Error).message
  } finally {
    inviteLoading.value = false
  }
}

async function invitePlayer(candidate: OrganizationInviteCandidate): Promise<void> {
  const organizationId = activeOrganization.value?.id
  if (!organizationId) return
  invitingPlayerId.value = candidate.player_id
  inviteError.value = null
  inviteMessage.value = null
  try {
    await organizationsService.invitePlayer(organizationId, { player_id: candidate.player_id })
    inviteCandidates.value = inviteCandidates.value.filter((item) => item.player_id !== candidate.player_id)
    inviteMessage.value = `Invito inviato a ${candidate.name}.`
  } catch (error) {
    inviteError.value = (error as Error).message
  } finally {
    invitingPlayerId.value = null
  }
}

async function inviteByEmail(): Promise<void> {
  const organizationId = activeOrganization.value?.id
  const email = inviteEmail.value.trim().toLowerCase()
  if (!organizationId) return
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    inviteError.value = 'Inserisci un indirizzo email valido.'
    return
  }
  invitingEmail.value = true
  inviteError.value = null
  inviteMessage.value = null
  try {
    const invitation = await organizationsService.invitePlayer(organizationId, { email })
    inviteMessage.value = `Invito inviato a ${invitation.player_name}.`
    inviteEmail.value = ''
    await loadInviteCandidates()
  } catch (error) {
    inviteError.value = (error as Error).message
  } finally {
    invitingEmail.value = false
  }
}

async function copyInviteCode(): Promise<void> {
  const code = activeOrganization.value?.join_code
  if (!code) return

  try {
    await navigator.clipboard.writeText(code)
    inviteMessage.value = 'Codice invito copiato.'
  } catch {
    inviteMessage.value = `Codice invito: ${code}`
  }
  scheduleInviteMessageClear()
}

function openOrganizationSettings(): void {
  inviteOpen.value = false
  void router.push({ name: 'organization-edit' })
}

onMounted(loadPlayers)
watchDebounced(searchName, () => { void loadPlayers(0, store.perPage) }, { debounce: 300 })
watchDebounced(inviteSearch, () => { if (inviteOpen.value) void loadInviteCandidates() }, { debounce: 300 })
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
      <h3 class="mb-1 mt-4 text-lg font-bold">
        {{ hasQueryFilters
          ? 'Nessun giocatore corrisponde ai filtri selezionati'
          : activeOrganization
            ? `Ancora nessun giocatore in ${activeOrganization.name}`
            : 'Nessun giocatore globale disponibile' }}
      </h3>
      <p class="max-w-md text-sm text-(--color-text-muted)">
        {{ hasQueryFilters
          ? 'Prova ad ampliare la ricerca o ad azzerare i filtri.'
          : activeOrganization
            ? 'Invita i giocatori a entrare nell’organizzazione e a completare la loro scheda sportiva.'
            : 'I profili senza organizzazione compariranno qui.' }}
      </p>
      <div v-if="hasQueryFilters || canInvitePlayers || (canViewAdmin && !auth.isGuest)" class="mt-5 flex flex-wrap justify-center gap-2">
        <Button v-if="hasQueryFilters" label="Azzera filtri" icon="pi pi-filter-slash" severity="secondary" outlined @click="clearAllQueryFilters" />
        <Button v-if="canInvitePlayers && !hasQueryFilters" label="Invita giocatore" icon="pi pi-send" @click="openInvite" />
        <Button
          v-if="canViewAdmin && !auth.isGuest && !activeOrganization && !hasQueryFilters"
          label="Crea un giocatore"
          icon="pi pi-user-plus"
          severity="secondary"
          outlined
          @click="openCreate"
        />
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

  <!-- Section: Player invitation dialog -->
  <Dialog v-model:visible="inviteOpen" modal header="Invita un giocatore" class="mx-3 w-full max-w-2xl">
    <div class="grid gap-4">
      <p class="text-sm leading-relaxed text-(--color-text-muted)">
        Invita un profilo TLA in <strong class="text-(--color-text)">{{ activeOrganization?.name }}</strong>.
        Riceverà una notifica e potrà scegliere se entrare nell’organizzazione.
      </p>

      <Message v-if="inviteMessage" severity="success" :closable="false">{{ inviteMessage }}</Message>
      <Message v-if="inviteError" severity="error" :closable="false">{{ inviteError }}</Message>

      <Tabs value="players">
        <TabList>
          <Tab value="players"><i class="pi pi-users mr-2" />Giocatori TLA</Tab>
          <Tab value="email"><i class="pi pi-envelope mr-2" />Usa email</Tab>
        </TabList>
        <TabPanels class="px-0! pb-0!">
          <TabPanel value="players">
            <div class="grid gap-3">
              <label for="invite-player-search" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">
                Cerca nei giocatori globali
                <InputText id="invite-player-search" v-model="inviteSearch" placeholder="Nome del giocatore" fluid />
              </label>

              <div v-if="inviteLoading" class="grid gap-2">
                <Skeleton v-for="item in 3" :key="item" height="4.5rem" border-radius="0.75rem" />
              </div>
              <div v-else-if="inviteCandidates.length" class="grid max-h-72 gap-2 overflow-y-auto pr-1">
                <article v-for="candidate in inviteCandidates" :key="candidate.player_id" class="flex items-center gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-ground) p-3">
                  <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-50 font-bold text-primary">{{ candidate.name.slice(0, 1).toUpperCase() }}</span>
                  <div class="min-w-0 flex-1">
                    <strong class="block truncate text-sm">{{ candidate.name }}</strong>
                    <small class="block truncate text-(--color-text-muted)">{{ candidate.club || 'Club non specificato' }}</small>
                  </div>
                  <Button label="Invita" icon="pi pi-send" size="small" :loading="invitingPlayerId === candidate.player_id" @click="invitePlayer(candidate)" />
                </article>
              </div>
              <Message v-else severity="secondary" :closable="false">
                Nessun altro giocatore globale disponibile per questa organizzazione.
              </Message>
            </div>
          </TabPanel>

          <TabPanel value="email">
            <form class="grid gap-3" @submit.prevent="inviteByEmail">
              <label for="invite-player-email" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">
                Email dell’account TLA
                <InputText id="invite-player-email" v-model="inviteEmail" type="email" autocomplete="off" placeholder="giocatore@email.it" fluid />
              </label>
              <p class="text-xs leading-relaxed text-(--color-text-muted)">
                L’indirizzo deve appartenere a un account TLA che ha già creato la propria scheda giocatore.
              </p>
              <Button type="submit" label="Invia invito" icon="pi pi-send" class="sm:justify-self-start" :loading="invitingEmail" />
            </form>
          </TabPanel>
        </TabPanels>
      </Tabs>

      <section class="grid gap-2 rounded-lg border border-(--color-border) bg-(--color-surface-ground) p-3">
        <div class="flex items-center gap-2 text-sm font-bold"><i class="pi pi-share-alt text-primary" />In alternativa, condividi il codice</div>
        <InputGroup v-if="activeOrganization?.join_code">
          <InputText id="player-invite-code" :model-value="activeOrganization.join_code" readonly aria-label="Codice invito organizzazione" />
          <Button label="Copia" icon="pi pi-copy" aria-label="Copia codice invito" @click="copyInviteCode" />
        </InputGroup>
        <small v-else class="text-(--color-text-muted)">Il codice può essere rigenerato dalle impostazioni dell’organizzazione.</small>
      </section>
    </div>

    <template #footer>
      <Button label="Gestisci organizzazione" icon="pi pi-cog" severity="secondary" text @click="openOrganizationSettings" />
      <Button label="Chiudi" severity="secondary" outlined @click="inviteOpen = false" />
    </template>
  </Dialog>
</template>
