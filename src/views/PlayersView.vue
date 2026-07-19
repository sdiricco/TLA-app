<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import Avatar from 'primevue/avatar'
  import Button from 'primevue/button'
  import Drawer from 'primevue/drawer'
  import InputText from 'primevue/inputtext'
  import Select from 'primevue/select'
  import Skeleton from 'primevue/skeleton'
  import { useAuthStore } from '../stores/auth'
  import { usePlayersStore } from '../stores/players'
  import type { Player, PlayerSortField, SortOrder } from '../types'
  import { getPlayerInitials } from '@/utils/main'
  import OrganizationFilter from '../components/filters/OrganizationFilter.vue'
  import type { OrganizationFilter as OrganizationFilterValue } from '../types'

  interface SelectOption<T> {
    label: string
    value: T
  }

  /**
   * Stores
   */
  const store = usePlayersStore();
  const auth = useAuthStore();
  const router = useRouter();

  /**
   * Reactive vars
   */
  const canViewAdmin = computed(() => auth.isAdmin)
  const searchName = ref('')
  const filtersOpen = ref(false)
  const searchClub = ref('')
  const sortBy = ref<PlayerSortField>('ranking')
  const sortOrder = ref<SortOrder>('asc')
  const organizationFilter = ref<OrganizationFilterValue>('mine')
  const hasMorePlayers = computed(() => store.players.length < store.total)
  const activeFiltersCount = computed(() => [
    searchName.value.trim() !== '',
    searchClub.value.trim() !== '',
    sortBy.value !== 'ranking',
    sortOrder.value !== 'asc',
    organizationFilter.value !== 'mine',
  ].filter(Boolean).length)
  let searchTimer: ReturnType<typeof setTimeout> | null = null

  /**
   * Sorting options
   */
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

  /**
   * Function: Format fallback content
   */
  function formatValue(value: string | null | undefined): string {
    return value?.trim() ? value : '—'
  }

  /**
   * Action: open create player page
   */
  function openCreate(): void {
    if (auth.isGuest) return
    void router.push({ name: 'player-create' })
  }

  /**
   * Action: open player detail page
   */
  function openDetail(player: Player): void {
    void router.push({ name: 'player-detail', params: { id: player.id } })
  }

  /**
   * Function: Load players from the server with the current filters
   */
  async function loadPlayers(page = 0, perPage = store.perPage): Promise<void> {
    await store.fetchAll({
      name: searchName.value.trim() || undefined,
      club: searchClub.value.trim() || undefined,
      page,
      perPage,
      sortBy: sortBy.value,
      sortOrder: sortOrder.value,
      organizationId: organizationFilter.value,
    })
  }

  /**
   * Function: Load the next page and append it to the list
   */
  async function loadMore(): Promise<void> {
    if (store.loadingMore || !hasMorePlayers.value) return

    await store.fetchAll(
      {
        name: searchName.value.trim() || undefined,
        club: searchClub.value.trim() || undefined,
        page: store.page + 1,
        perPage: store.perPage,
        sortBy: sortBy.value,
        sortOrder: sortOrder.value,
      },
      { append: true },
    )
  }

  /**
   * Function: Clear the search filters
   */
  function clearFilters(): void {
    searchName.value = ''
    searchClub.value = ''
    sortBy.value = 'ranking'
    sortOrder.value = 'asc'
    organizationFilter.value = 'mine'
    void loadPlayers(0, store.perPage)
  }

  /**
   * Hooks
   */
  onMounted(() => {
    void loadPlayers()
  })

  watch([searchName, searchClub, sortBy, sortOrder], () => {
    if (searchTimer) clearTimeout(searchTimer)
    searchTimer = setTimeout(() => {
      void loadPlayers(0, store.perPage)
    }, 300)
  })
  watch(organizationFilter, () => void loadPlayers(0, store.perPage))

  onBeforeUnmount(() => {
    if (searchTimer) clearTimeout(searchTimer)
  })
</script>

<template>
  <div class="players-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">ROSTER DEL CIRCOLO</p>
        <h1>I protagonisti del campo.</h1>
        <p class="page-subtitle">Consulta profili, ranking e informazioni dei tuoi giocatori.</p>
      </div>
    </header>

    <section class="summary-strip">
      <div class="summary-icon"><IconifyIcon icon="mdi:account-group-outline" /></div>
      <div><strong>{{ store.total }}</strong><span>Giocatori registrati</span></div>
      <Button
        v-if="canViewAdmin"
        class="create-button"
        label="Aggiungi"
        icon="pi pi-user-plus"
        text
        aria-label="Aggiungi giocatore"
        title="Aggiungi giocatore"
        :disabled="auth.isGuest"
        @click="openCreate"
      />
    </section>

    <div class="section-heading">
      <div><h2>Giocatori</h2><span>{{ store.total }} profili</span></div>
      <div class="heading-actions">
        <button class="open-filters-button" type="button" @click="filtersOpen = true">
          <IconifyIcon icon="mdi:tune-variant" />
          <span>Filtri</span>
          <strong v-if="activeFiltersCount">{{ activeFiltersCount }}</strong>
        </button>
        <span class="view-label"><IconifyIcon icon="mdi:view-grid-outline" /> Vista griglia</span>
      </div>
    </div>

    <Drawer v-model:visible="filtersOpen" position="right" header="Filtra giocatori" class="filters-drawer" :style="{ width: 'min(26rem, 100vw)' }">
      <div class="drawer-filters">
        <div class="filter-field search-name-field">
          <label for="player-name-filter" class="text-sm font-medium">Cerca per nome</label>
          <span class="input-wrap"><IconifyIcon icon="mdi:magnify" /><InputText id="player-name-filter" v-model="searchName" placeholder="Es. Mario Rossi" fluid /></span>
        </div>

        <div class="filter-field">
          <label for="player-club-filter" class="text-sm font-medium">Cerca per club</label>
          <span class="input-wrap"><IconifyIcon icon="mdi:domain" /><InputText id="player-club-filter" v-model="searchClub" placeholder="Es. TC Milano" fluid /></span>
        </div>

        <div class="filter-field">
          <label for="player-organization-filter">Organizzazione</label>
          <OrganizationFilter id="player-organization-filter" v-model="organizationFilter" />
        </div>

        <div class="filter-field">
          <label for="player-sort-field" class="text-sm font-medium">Ordina per</label>
          <Select id="player-sort-field" v-model="sortBy" :options="sortFieldOptions" option-label="label" option-value="value" fluid />
        </div>

        <div class="filter-field compact-sort">
          <label for="player-sort-order" class="text-sm font-medium">Direzione</label>
          <Select id="player-sort-order" v-model="sortOrder" :options="sortOrderOptions" option-label="label" option-value="value" fluid />
        </div>
      </div>

      <template #footer>
        <div class="drawer-actions">
          <Button label="Azzera" icon="pi pi-refresh" severity="secondary" outlined @click="clearFilters" />
          <Button :label="`Mostra ${store.total} risultati`" icon="pi pi-check" @click="filtersOpen = false" />
        </div>
      </template>
    </Drawer>

    <div v-if="store.loading" class="players-grid">
      <div v-for="item in 8" :key="item" class="player-card skeleton-card">
        <div class="skeleton-topline"><Skeleton class="skeleton-arrow" width="1rem" height="1rem" /></div>
        <div class="skeleton-identity">
          <Skeleton class="skeleton-avatar" shape="square" size="4.4rem" />
          <div class="skeleton-name-wrap">
            <Skeleton class="skeleton-name" width="65%" height="1.15rem" />
            <Skeleton class="skeleton-ranking" width="3rem" height="0.9rem" />
          </div>
        </div>
        <div class="skeleton-details"><Skeleton height="3.2rem" /><Skeleton height="3.2rem" /></div>
      </div>
    </div>

    <div v-else-if="store.players.length === 0" class="empty-state">
      <span><IconifyIcon icon="mdi:account-group-outline" /></span>
      <h3>Nessun giocatore trovato</h3>
      <p>Modifica i filtri oppure aggiungi il primo giocatore.</p>
    </div>

    <div v-else class="players-grid">
      <article
        v-for="player in store.players"
        :key="player.id"
        class="player-card"
        tabindex="0"
        @click="openDetail(player)"
        @keydown.enter="openDetail(player)"
      >
        <div class="card-topline">
          <span class="card-arrow"><IconifyIcon icon="mdi:arrow-top-right" /></span>
        </div>

        <div class="player-identity">
          <div class="avatar-wrap">
            <Avatar :label="getPlayerInitials(player)" :image="player.photo_url ?? undefined" shape="circle" size="xlarge" />
          </div>
          <div>
            <h3>
              {{ player.name }}
              <span v-if="player.ranking" class="player-ranking">(#{{ player.ranking }})</span>
            </h3>
          </div>
        </div>

        <div class="player-details">
          <div><span class="detail-icon"><IconifyIcon icon="mdi:domain" /></span><p><small>CLUB</small>{{ formatValue(player.club) }}</p></div>
          <div><span class="detail-icon"><IconifyIcon icon="mdi:phone-outline" /></span><p><small>TELEFONO</small>{{ formatValue(player.phone) }}</p></div>
        </div>

        <footer class="card-footer"><span>Profilo giocatore</span><span>Visualizza <IconifyIcon icon="mdi:chevron-right" /></span></footer>
      </article>

      <div class="load-more-area">
        <Button
          v-if="hasMorePlayers"
          class="load-more-button"
          label="Carica altro"
          icon="pi pi-chevron-down"
          aria-label="Carica altri giocatori"
          title="Carica altri giocatori"
          severity="secondary"
          text
          :loading="store.loadingMore"
          @click="loadMore"
        />

        <p v-else class="all-loaded"><IconifyIcon icon="mdi:check-circle-outline" /> Hai visualizzato tutti i giocatori</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
  .players-page { --green: var(--color-primary-700); --lime: var(--color-accent); display: flex; max-width: 1480px; margin: 0 auto; flex-direction: column; gap: 1.5rem; color: var(--color-text); }
  .page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; padding-top: 0.4rem; }
  .eyebrow { margin: 0 0 0.5rem; color: var(--green); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.16em; }
  .page-header h1 { margin: 0; font-size: clamp(2rem, 3vw, 3rem); line-height: 1; letter-spacing: -0.055em; }
  .page-subtitle { margin: 0.75rem 0 0; color: var(--color-text-muted); font-size: 0.95rem; }
  .create-button { min-width: auto; height: 2.75rem; margin-left: auto; padding-inline: 0.35rem; border: 0; border-radius: 0; background: transparent; box-shadow: none; color: var(--green); font-weight: 700; }
  .create-button:hover { background: rgb(var(--color-primary-rgb) / 8%) !important; color: var(--color-primary-800) !important; }
  .summary-strip { display: flex; align-items: center; gap: 0.9rem; padding: 0.85rem 1rem; border: 1px solid var(--color-border); border-radius: 0; background: linear-gradient(90deg, var(--color-white), var(--color-surface-soft)); }
  .summary-icon { display: grid; place-items: center; width: 2.65rem; height: 2.65rem; border-radius: 0; background: var(--color-primary-soft-surface); color: var(--green); }
  .summary-strip div:nth-child(2) { display: grid; min-width: 125px; }
  .summary-strip strong { font-size: 1.15rem; line-height: 1; }
  .summary-strip div span { margin-top: 0.25rem; color: var(--color-text-muted); font-size: 0.68rem; }
  .filters-panel { padding: 1rem; border: 1px solid var(--color-border); border-radius: 0; background: rgb(var(--color-white-rgb) / 88%); box-shadow: 0 8px 30px rgb(var(--color-shadow-rgb) / 5%); }
  .filters-header { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.8rem; }
  .filter-toolbar { display: flex; min-width: 0; align-items: center; gap: .35rem; }
  .filter-title { display: flex; min-width: 0; flex: 1; align-items: center; gap: 0.5rem; padding: 0; border: 0; background: transparent; color: var(--color-text-muted); font-size: 0.75rem; font-weight: 800; text-align: left; }
  .filter-title :deep(svg) { color: var(--green); width: 1rem; height: 1rem; }
  .mobile-filter-count { display: none; }
  .filters-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem; }
  .filter-field { display: flex; min-width: 0; flex-direction: column; gap: 0.4rem; }
  .filter-field label { color: var(--color-text-muted); font-size: 0.68rem; font-weight: 700; }
  .input-wrap { position: relative; }
  .input-wrap > :deep(svg) { position: absolute; z-index: 2; top: 50%; left: 0.9rem; transform: translateY(-50%); color: var(--color-text-subtle); width: 0.85rem; height: 0.85rem; }
  .input-wrap :deep(.p-inputtext) { padding-left: 2.4rem; }
  .filter-field :deep(.p-inputtext), .filter-field :deep(.p-select) { height: 2.75rem; border-color: var(--color-border); border-radius: 0; background: var(--color-surface-soft); font-size: 0.82rem; }
  .filter-field :deep(.p-inputtext:focus), .filter-field :deep(.p-select.p-focus) { border-color: var(--color-primary-500); box-shadow: 0 0 0 3px rgb(var(--color-primary-500-rgb) / 10%); }
  .filter-action { display: flex; align-items: flex-end; }
  .filter-action :deep(.p-button) { height: 2.75rem; color: var(--color-text-muted); font-size: 0.78rem; }
  .filter-action-mobile { display: none; }
  .section-heading { display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem; }
  .section-heading > div { display: flex; align-items: baseline; gap: 0.65rem; }
  .section-heading h2 { margin: 0; font-size: 1.2rem; letter-spacing: -0.025em; }
  .section-heading span { color: var(--color-text-subtle); font-size: 0.72rem; }
  .heading-actions { display: flex; align-items: center !important; gap: .75rem !important; }
  .open-filters-button { display: inline-flex; height: 2.35rem; align-items: center; gap: .45rem; padding: 0 .75rem; border: 1px solid var(--color-border); border-radius: 0; background: var(--color-surface-card); color: var(--color-text); font-size: .78rem; font-weight: 700; cursor: pointer; }
  .open-filters-button:hover { border-color: var(--color-primary-500); color: var(--green); }
  .open-filters-button strong { display: grid; min-width: 1.2rem; height: 1.2rem; place-items: center; border-radius: 999px; background: var(--green); color: var(--color-white); font-size: .65rem; }
  .filters-drawer { width: min(26rem, 100vw) !important; }
  .drawer-filters { display: flex; flex-direction: column; gap: 1.15rem; }
  .drawer-filters .filter-field { gap: .45rem; }
  .drawer-filters .filter-field label { color: var(--color-text-muted); font-size: .7rem; font-weight: 750; letter-spacing: .02em; }
  .drawer-actions { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: .65rem; }
  .drawer-actions :deep(.p-button) { justify-content: center; border-radius: 0; }
  .view-label { display: flex; align-items: center; gap: 0.4rem; }
  .view-label :deep(svg) { width: 0.95rem; height: 0.95rem; }
  .players-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(310px, 100%), 1fr)); gap: 1rem; }
  .player-card { position: relative; overflow: hidden; padding: 1.2rem; border: 1px solid var(--color-border); border-radius: 0; background: var(--color-surface-card); box-shadow: 0 8px 24px rgb(var(--color-shadow-rgb) / 6%); cursor: pointer; transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
  .player-card::before { position: absolute; inset: 0 0 auto; height: 3px; background: var(--color-border-strong); content: ''; }
  .player-card:hover, .player-card:focus-visible { transform: translateY(-3px); border-color: var(--color-primary-300); box-shadow: 0 16px 36px rgb(var(--color-shadow-rgb) / 11%); outline: none; }
  .card-topline { display: flex; align-items: center; justify-content: space-between; }
  .card-arrow { display: inline-flex; align-items: center; justify-content: center; color: var(--green); font-size: 0.72rem; line-height: 1; }
  .card-arrow :deep(svg) { width: 0.95rem; height: 0.95rem; }
  .player-identity { display: flex; align-items: center; gap: 1rem; padding: 1.35rem 0 1.15rem; }
  .avatar-wrap { position: relative; }
  .avatar-wrap :deep(.p-avatar) { width: 4.4rem; height: 4.4rem; border: 3px solid var(--color-border); border-radius: 0; background: transparent; color: var(--color-text-muted); font-size: 1.35rem; box-shadow: none; }
  .player-identity > div:last-child { min-width: 0; }
  .player-identity h3 { overflow: hidden; margin: 0; font-size: 1.08rem; letter-spacing: -0.025em; text-overflow: ellipsis; white-space: nowrap; }
  .player-ranking { color: var(--color-text-subtle); font-size: 0.78em; font-weight: 700; }
  .player-identity > div:last-child span { display: flex; align-items: center; gap: 0.35rem; margin-top: 0.35rem; color: var(--color-text-muted); font-size: 0.68rem; }
  .player-details { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .player-details > div { display: flex; align-items: center; gap: 0.6rem; min-width: 0; padding: 0.7rem; border-radius: 0; background: var(--color-surface-soft); }
  .detail-icon { display: grid; place-items: center; width: 1.8rem; height: 1.8rem; flex: 0 0 auto; border-radius: 0; background: var(--color-surface-card); color: var(--color-primary-300); font-size: 0.7rem; box-shadow: 0 2px 7px rgb(var(--color-shadow-rgb) / 7%); }
  .detail-icon :deep(svg) { width: 1em; height: 1em; }
  .player-details p { display: grid; min-width: 0; margin: 0; overflow: hidden; color: var(--color-text-muted); font-size: 0.67rem; text-overflow: ellipsis; white-space: nowrap; }
  .player-details small { margin-bottom: 0.17rem; color: var(--color-text-subtle); font-size: 0.51rem; font-weight: 800; letter-spacing: 0.08em; }
  .card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 1rem; padding-top: 0.8rem; border-top: 1px solid var(--color-surface-muted); color: var(--color-text-subtle); font-size: 0.62rem; }
  .card-footer span:last-child { display: flex; align-items: center; gap: 0.35rem; color: var(--green); font-weight: 750; }
  .skeleton-card { min-height: 290px; cursor: default; }
  .skeleton-topline { display: flex; align-items: center; justify-content: space-between; }
  .skeleton-identity { display: flex; align-items: center; gap: 1rem; padding: 1.35rem 0 1.15rem; }
  .skeleton-name-wrap { display: grid; min-width: 0; gap: 0.22rem; }
  .skeleton-details { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .empty-state { display: flex; min-height: 280px; flex-direction: column; align-items: center; justify-content: center; border: 1px dashed var(--color-border); border-radius: 0; background: var(--color-surface-soft); text-align: center; }
  .empty-state > span { display: grid; place-items: center; width: 3.5rem; height: 3.5rem; border-radius: 50%; background: var(--color-primary-soft-surface); color: var(--green); font-size: 1.3rem; }
  .empty-state > span :deep(svg) { width: 1.35rem; height: 1.35rem; }
  .empty-state h3 { margin: 1rem 0 0.3rem; }
  .empty-state p { margin: 0; color: var(--color-text-muted); font-size: 0.8rem; }
  .load-more-area { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; gap: 1rem; padding-top: 0.35rem; }
  .load-more-button { min-width: auto; height: 2.75rem; padding-inline: 0.35rem; border-radius: 0; color: var(--color-text-muted); font-size: 0.78rem; }
  .all-loaded { display: flex; align-items: center; gap: 0.4rem; margin: 0; color: var(--color-text-subtle); font-size: 0.72rem; }
  .all-loaded :deep(svg) { width: 1rem; height: 1rem; color: var(--color-primary-500); }

  @media (max-width: 1050px) { .filter-action { align-items: flex-end; } }
  @media (max-width: 800px) { .page-header { align-items: flex-start; } .page-subtitle, .view-label { display: none; } }
  @media (max-width: 620px) {
    .players-page { gap: 0.8rem; }
    .page-header { align-items: center; flex-direction: row; gap: 0.75rem; padding-top: 0; }
    .page-header > div { min-width: 0; flex: 1; }
    .eyebrow { display: none; }
    .page-header h1 { overflow: hidden; font-size: 1.7rem; line-height: 1.1; text-overflow: ellipsis; white-space: nowrap; }
    .create-button { min-width: auto; height: 2.4rem; padding-inline: 0.2rem; }
    .summary-strip { display: flex; align-items: center; gap: 0.7rem; padding: 0.7rem 0.8rem; }
    .summary-icon { width: 2.2rem; height: 2.2rem; }
    .summary-strip strong { font-size: 1rem; }
    .summary-strip div:nth-child(2) span { font-size: 0.72rem; }
    .filters-panel { padding: 0.65rem; border-radius: 0; box-shadow: none; }
    .filters-header { align-items: center; gap: 0.5rem; margin-bottom: 0; }
    .filter-title { min-height: 2rem; padding-inline: 0.2rem; font-size: 0.875rem; }
    .filters-header .filter-action { display: none; }
    .mobile-filter-count { display: inline-flex; margin-left: auto; }
    .mobile-filter-count i { transition: transform 160ms; }
    .mobile-open .mobile-filter-count i { transform: rotate(180deg); }
    .filters-grid { grid-template-columns: 1fr; }
    .filters-grid { margin-top: 0.55rem; }
    .filters-grid > :not(.search-name-field) { display: none; }
    .mobile-open .filters-grid > * { display: flex; }
    .filter-action-mobile { display: flex; margin-top: 0.65rem; }
    .filter-action-mobile :deep(.p-button) { width: 100%; height: 2.2rem; padding-inline: 0.35rem; }
    .heading-actions { gap: .35rem !important; }
    .open-filters-button { height: 2.2rem; padding-inline: .65rem; }
    .filters-drawer { width: 100vw !important; }
    .drawer-actions { grid-template-columns: 1fr; }
    .section-heading h2 { font-size: 1.05rem; }
    .section-heading span { font-size: 0.75rem; }
    .players-grid { display: flex; flex-direction: column; gap: 0.45rem; }
    .player-card { display: grid; min-height: 4rem; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 0.45rem; padding: 0.45rem 0.55rem; border-radius: 0; box-shadow: none; }
    .player-card::before { width: 3px; height: auto; inset: 0 auto 0 0; }
    .player-card:hover { transform: none; }
    .card-topline { display: contents; }
    .card-arrow { grid-column: 4; grid-row: 1; }
    .player-identity { display: contents; }
    .avatar-wrap { grid-column: 1; grid-row: 1; margin-right: 0; }
    .avatar-wrap :deep(.p-avatar) { width: 2.75rem; height: 2.75rem; border-width: 2px; border-radius: 0; background: transparent; font-size: 0.9rem; box-shadow: none; }
    .player-identity > div:last-child { grid-column: 2 / 4; grid-row: 1; }
    .player-identity h3 { font-size: 1rem; }
    .player-details, .card-footer { display: none; }
    .skeleton-card { display: grid; min-height: 4rem; }
    .skeleton-topline, .skeleton-identity { display: contents; }
    .skeleton-avatar { grid-column: 1; grid-row: 1; width: 2.75rem !important; height: 2.75rem !important; margin-right: 0; border-radius: 0 !important; }
    .skeleton-name-wrap { grid-column: 2 / 4; grid-row: 1; }
    .skeleton-name { width: min(10rem, 72%) !important; }
    .skeleton-ranking { width: 2.4rem !important; }
    .skeleton-topline > :deep(.p-skeleton) { grid-column: 4; grid-row: 1; width: 1rem !important; height: 1rem !important; margin-left: 0; }
    .skeleton-details { display: none; }
    .load-more-area { width: 100%; }
    .load-more-button { min-width: auto; height: 2.4rem; padding-inline: 0.2rem; }
  }

  /* Player collections always use the compact list-item language. */
  .players-grid { display: grid; grid-template-columns: 1fr; gap: 0.45rem; }
  .player-card { display: grid; min-height: 4rem; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 0.45rem; padding: 0.45rem 0.55rem; box-shadow: none; }
  .player-card::before { width: 3px; height: auto; inset: 0 auto 0 0; }
  .player-card:hover { transform: none; }
  .card-topline, .player-identity { display: contents; }
  .avatar-wrap { grid-column: 1; grid-row: 1; margin-right: 0; }
  .avatar-wrap :deep(.p-avatar) { width: 2.75rem; height: 2.75rem; border-width: 2px; border-radius: 0; background: transparent; font-size: 0.9rem; box-shadow: none; }
  .player-identity > div:last-child { grid-column: 2 / 4; grid-row: 1; }
  .player-identity h3 { font-size: 1rem; }
  .card-arrow { grid-column: 4; grid-row: 1; }
  .player-details, .card-footer { display: none; }
  .load-more-area { width: 100%; }

  .skeleton-card { display: grid; min-height: 4rem; }
  .skeleton-topline, .skeleton-identity { display: contents; }
  .skeleton-avatar { grid-column: 1; grid-row: 1; width: 2.75rem !important; height: 2.75rem !important; margin-right: 0; border-radius: 0 !important; }
  .skeleton-name-wrap { grid-column: 2 / 4; grid-row: 1; }
  .skeleton-name { width: min(10rem, 72%) !important; }
  .skeleton-ranking { width: 2.4rem !important; }
  .skeleton-topline > :deep(.p-skeleton) { grid-column: 4; grid-row: 1; width: 1rem !important; height: 1rem !important; margin-left: 0; }
  .skeleton-details { display: none; }

  @media (min-width: 768px) {
    .players-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (min-width: 1200px) {
    .players-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
</style>
