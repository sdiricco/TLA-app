<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import Avatar from 'primevue/avatar'
  import Button from 'primevue/button'
  import InputText from 'primevue/inputtext'
  import Select from 'primevue/select'
  import Skeleton from 'primevue/skeleton'
  import { useAuthStore } from '../stores/auth'
  import { usePlayersStore } from '../stores/players'
  import type { Player, PlayerSortField, SortOrder } from '../types'
  import { getPlayerInitials } from '@/utils/main'

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
  const mobileFiltersOpen = ref(false)
  const searchClub = ref('')
  const sortBy = ref<PlayerSortField>('ranking')
  const sortOrder = ref<SortOrder>('asc')
  const hasMorePlayers = computed(() => store.players.length < store.total)
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
      <Button
        v-if="canViewAdmin"
        class="create-button"
        label="Nuovo giocatore"
        icon="pi pi-plus"
        :disabled="auth.isGuest"
        @click="openCreate"
      />
    </header>

    <section class="summary-strip">
      <div class="summary-icon"><i class="pi pi-users" /></div>
      <div><strong>{{ store.total }}</strong><span>Giocatori registrati</span></div>
      <span class="summary-copy">Una community, infinite sfide.</span>
    </section>

    <section class="filters-panel" :class="{ 'mobile-open': mobileFiltersOpen }" aria-label="Filtri giocatori">
      <button class="filter-title" type="button" :aria-expanded="mobileFiltersOpen" @click="mobileFiltersOpen = !mobileFiltersOpen"><i class="pi pi-sliders-h" /><span>Cerca e ordina</span><span class="mobile-filter-count"><i class="pi pi-chevron-down" /></span></button>
      <div class="filters-grid">
        <div class="filter-field search-name-field">
        <label for="player-name-filter" class="text-sm font-medium">Cerca per nome</label>
          <span class="input-wrap"><i class="pi pi-search" /><InputText id="player-name-filter" v-model="searchName" placeholder="Es. Mario Rossi" fluid /></span>
        </div>

        <div class="filter-field">
        <label for="player-club-filter" class="text-sm font-medium">Cerca per club</label>
          <span class="input-wrap"><i class="pi pi-building-columns" /><InputText id="player-club-filter" v-model="searchClub" placeholder="Es. TC Milano" fluid /></span>
        </div>

        <div class="filter-field">
        <label for="player-sort-field" class="text-sm font-medium">Ordina per</label>
          <Select
          id="player-sort-field"
          v-model="sortBy"
          :options="sortFieldOptions"
          option-label="label"
          option-value="value"
          fluid
          />
        </div>

        <div class="filter-field compact-sort">
        <label for="player-sort-order" class="text-sm font-medium">Direzione</label>
          <Select
          id="player-sort-order"
          v-model="sortOrder"
          :options="sortOrderOptions"
          option-label="label"
          option-value="value"
          fluid
          />
        </div>

        <div class="filter-action">
          <Button label="Azzera" icon="pi pi-refresh" severity="secondary" text @click="clearFilters" />
        </div>
      </div>
    </section>

    <div class="section-heading">
      <div><h2>Giocatori</h2><span>{{ store.total }} profili</span></div>
      <span class="view-label"><i class="pi pi-th-large" /> Vista griglia</span>
    </div>

    <div v-if="store.loading" class="players-grid">
      <div v-for="item in 8" :key="item" class="player-card skeleton-card">
        <div class="skeleton-topline"><Skeleton width="2rem" height="1rem" /><Skeleton width="2rem" height="2rem" /></div>
        <div class="skeleton-identity">
          <Skeleton class="skeleton-avatar" shape="circle" size="4.4rem" />
          <Skeleton class="skeleton-name" width="65%" height="1.15rem" />
        </div>
        <div class="skeleton-details"><Skeleton height="3.2rem" /><Skeleton height="3.2rem" /></div>
      </div>
    </div>

    <div v-else-if="store.players.length === 0" class="empty-state">
      <span><i class="pi pi-users" /></span>
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
          <span v-if="player.ranking" class="ranking-value">#{{ player.ranking }}</span>
          <span class="card-arrow"><i class="pi pi-arrow-up-right" /></span>
        </div>

        <div class="player-identity">
          <div class="avatar-wrap">
            <Avatar :label="getPlayerInitials(player)" :image="player.photo_url ?? undefined" shape="circle" size="xlarge" />
          </div>
          <div><h3>{{ player.name }}</h3></div>
        </div>

        <div class="player-details">
          <div><span class="detail-icon"><i class="pi pi-building-columns" /></span><p><small>CLUB</small>{{ formatValue(player.club) }}</p></div>
          <div><span class="detail-icon"><i class="pi pi-phone" /></span><p><small>TELEFONO</small>{{ formatValue(player.phone) }}</p></div>
        </div>

        <footer class="card-footer"><span>Profilo giocatore</span><span>Visualizza <i class="pi pi-chevron-right" /></span></footer>
      </article>

      <div class="load-more-area">
        <Button
          v-if="hasMorePlayers"
          label="Carica altro"
          icon="pi pi-chevron-down"
          severity="secondary"
          outlined
          :loading="store.loadingMore"
          @click="loadMore"
        />

        <p v-else class="all-loaded"><i class="pi pi-check-circle" /> Hai visualizzato tutti i giocatori</p>
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
  .create-button { height: 3rem; border-color: var(--green); border-radius: 0; background: var(--green); box-shadow: 0 10px 22px rgb(var(--color-primary-rgb) / 18%); font-weight: 700; }
  .summary-strip { display: flex; align-items: center; gap: 0.9rem; padding: 0.85rem 1rem; border: 1px solid var(--color-border); border-radius: 0; background: linear-gradient(90deg, var(--color-white), var(--color-surface-soft)); }
  .summary-icon { display: grid; place-items: center; width: 2.65rem; height: 2.65rem; border-radius: 0; background: var(--color-primary-soft-surface); color: var(--green); }
  .summary-strip div:nth-child(2) { display: grid; min-width: 125px; }
  .summary-strip strong { font-size: 1.15rem; line-height: 1; }
  .summary-strip div span { margin-top: 0.25rem; color: var(--color-text-muted); font-size: 0.68rem; }
  .summary-copy { margin-left: auto; color: var(--color-text-muted); font-size: 0.76rem; font-style: italic; }
  .filters-panel { padding: 1rem; border: 1px solid var(--color-border); border-radius: 0; background: rgb(var(--color-white-rgb) / 88%); box-shadow: 0 8px 30px rgb(var(--color-shadow-rgb) / 5%); }
  .filter-title { display: flex; width: 100%; align-items: center; gap: 0.5rem; margin-bottom: 0.8rem; padding: 0; border: 0; background: transparent; color: var(--color-text-muted); font-size: 0.75rem; font-weight: 800; text-align: left; }
  .filter-title i { color: var(--green); }
  .mobile-filter-count { display: none; }
  .filters-grid { display: grid; grid-template-columns: 1.15fr 1.15fr 0.9fr 0.9fr auto; gap: 0.75rem; }
  .filter-field { display: flex; min-width: 0; flex-direction: column; gap: 0.4rem; }
  .filter-field label { color: var(--color-text-muted); font-size: 0.68rem; font-weight: 700; }
  .input-wrap { position: relative; }
  .input-wrap > i { position: absolute; z-index: 2; top: 50%; left: 0.9rem; transform: translateY(-50%); color: var(--color-text-subtle); font-size: 0.8rem; }
  .input-wrap :deep(.p-inputtext) { padding-left: 2.4rem; }
  .filter-field :deep(.p-inputtext), .filter-field :deep(.p-select) { height: 2.75rem; border-color: var(--color-border); border-radius: 0; background: var(--color-surface-soft); font-size: 0.82rem; }
  .filter-field :deep(.p-inputtext:focus), .filter-field :deep(.p-select.p-focus) { border-color: var(--color-primary-500); box-shadow: 0 0 0 3px rgb(var(--color-primary-500-rgb) / 10%); }
  .filter-action { display: flex; align-items: flex-end; }
  .filter-action :deep(.p-button) { height: 2.75rem; color: var(--color-text-muted); font-size: 0.78rem; }
  .section-heading { display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem; }
  .section-heading > div { display: flex; align-items: baseline; gap: 0.65rem; }
  .section-heading h2 { margin: 0; font-size: 1.2rem; letter-spacing: -0.025em; }
  .section-heading span { color: var(--color-text-subtle); font-size: 0.72rem; }
  .view-label { display: flex; align-items: center; gap: 0.4rem; }
  .players-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(310px, 100%), 1fr)); gap: 1rem; }
  .player-card { position: relative; overflow: hidden; padding: 1.2rem; border: 1px solid var(--color-border); border-radius: 0; background: var(--color-surface-card); box-shadow: 0 8px 24px rgb(var(--color-shadow-rgb) / 6%); cursor: pointer; transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
  .player-card::before { position: absolute; inset: 0 0 auto; height: 3px; background: var(--color-border-strong); content: ''; }
  .player-card:hover, .player-card:focus-visible { transform: translateY(-3px); border-color: var(--color-primary-300); box-shadow: 0 16px 36px rgb(var(--color-shadow-rgb) / 11%); outline: none; }
  .card-topline { display: flex; align-items: center; justify-content: space-between; }
  .ranking-value { color: var(--color-text-muted); font-size: 0.82rem; font-weight: 800; font-variant-numeric: tabular-nums; }
  .card-arrow { display: grid; place-items: center; width: 2rem; height: 2rem; border-radius: 50%; background: var(--color-surface-muted); color: var(--green); font-size: 0.72rem; transition: 180ms; }
  .player-card:hover .card-arrow { background: var(--green); color: var(--color-white); }
  .player-identity { display: flex; align-items: center; gap: 1rem; padding: 1.35rem 0 1.15rem; }
  .avatar-wrap { position: relative; }
  .avatar-wrap :deep(.p-avatar) { width: 4.4rem; height: 4.4rem; border: 3px solid white; background: var(--color-border); color: var(--color-text-muted); font-size: 1.35rem; box-shadow: 0 5px 16px rgb(var(--color-shadow-rgb) / 13%); }
  .player-identity > div:last-child { min-width: 0; }
  .player-identity h3 { overflow: hidden; margin: 0; font-size: 1.08rem; letter-spacing: -0.025em; text-overflow: ellipsis; white-space: nowrap; }
  .player-identity > div:last-child span { display: flex; align-items: center; gap: 0.35rem; margin-top: 0.35rem; color: var(--color-text-muted); font-size: 0.68rem; }
  .player-details { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .player-details > div { display: flex; align-items: center; gap: 0.6rem; min-width: 0; padding: 0.7rem; border-radius: 0; background: var(--color-surface-soft); }
  .detail-icon { display: grid; place-items: center; width: 1.8rem; height: 1.8rem; flex: 0 0 auto; border-radius: 0; background: var(--color-surface-card); color: var(--color-primary-300); font-size: 0.7rem; box-shadow: 0 2px 7px rgb(var(--color-shadow-rgb) / 7%); }
  .player-details p { display: grid; min-width: 0; margin: 0; overflow: hidden; color: var(--color-text-muted); font-size: 0.67rem; text-overflow: ellipsis; white-space: nowrap; }
  .player-details small { margin-bottom: 0.17rem; color: var(--color-text-subtle); font-size: 0.51rem; font-weight: 800; letter-spacing: 0.08em; }
  .card-footer { display: flex; align-items: center; justify-content: space-between; margin-top: 1rem; padding-top: 0.8rem; border-top: 1px solid var(--color-surface-muted); color: var(--color-text-subtle); font-size: 0.62rem; }
  .card-footer span:last-child { display: flex; align-items: center; gap: 0.35rem; color: var(--green); font-weight: 750; }
  .skeleton-card { min-height: 290px; cursor: default; }
  .skeleton-topline { display: flex; align-items: center; justify-content: space-between; }
  .skeleton-identity { display: flex; align-items: center; gap: 1rem; padding: 1.35rem 0 1.15rem; }
  .skeleton-details { display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; }
  .empty-state { display: flex; min-height: 280px; flex-direction: column; align-items: center; justify-content: center; border: 1px dashed var(--color-border); border-radius: 0; background: var(--color-surface-soft); text-align: center; }
  .empty-state > span { display: grid; place-items: center; width: 3.5rem; height: 3.5rem; border-radius: 50%; background: var(--color-primary-soft-surface); color: var(--green); font-size: 1.3rem; }
  .empty-state h3 { margin: 1rem 0 0.3rem; }
  .empty-state p { margin: 0; color: var(--color-text-muted); font-size: 0.8rem; }
  .load-more-area { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; gap: 1rem; padding-top: 0.35rem; }
  .all-loaded { display: flex; align-items: center; gap: 0.4rem; margin: 0; color: var(--color-text-subtle); font-size: 0.72rem; }
  .all-loaded i { color: var(--color-primary-500); }

  @media (max-width: 1050px) { .filters-grid { grid-template-columns: 1fr 1fr; } .filter-action { align-items: flex-end; } }
  @media (max-width: 800px) { .page-header { align-items: flex-start; } .page-subtitle, .summary-copy, .view-label { display: none; } }
  @media (max-width: 620px) {
    .players-page { gap: 0.8rem; }
    .page-header { align-items: center; flex-direction: row; gap: 0.75rem; padding-top: 0; }
    .page-header > div { min-width: 0; flex: 1; }
    .eyebrow { display: none; }
    .page-header h1 { overflow: hidden; font-size: 1.7rem; line-height: 1.1; text-overflow: ellipsis; white-space: nowrap; }
    .create-button { width: 2.75rem; min-width: 2.75rem; padding: 0; border-radius: 50%; }
    .create-button :deep(.p-button-label) { display: none; }
    .summary-strip { display: none; }
    .filters-panel { padding: 0.65rem; border-radius: 0; box-shadow: none; }
    .filter-title { min-height: 2rem; margin: 0; padding-inline: 0.2rem; font-size: 0.875rem; }
    .mobile-filter-count { display: inline-flex; margin-left: auto; }
    .mobile-filter-count i { transition: transform 160ms; }
    .mobile-open .mobile-filter-count i { transform: rotate(180deg); }
    .filters-grid { grid-template-columns: 1fr; }
    .filters-grid { margin-top: 0.55rem; }
    .filters-grid > :not(.search-name-field) { display: none; }
    .mobile-open .filters-grid > * { display: flex; }
    .filter-action :deep(.p-button) { width: 100%; }
    .section-heading h2 { font-size: 1.05rem; }
    .section-heading span { font-size: 0.75rem; }
    .players-grid { display: flex; flex-direction: column; gap: 0.45rem; }
    .player-card { display: grid; min-height: 4rem; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 0.45rem; padding: 0.45rem 0.55rem; border-radius: 0; box-shadow: none; }
    .player-card::before { width: 3px; height: auto; inset: 0 auto 0 0; }
    .player-card:hover { transform: none; }
    .card-topline { display: contents; }
    .ranking-value { grid-column: 3; grid-row: 1; padding-left: 0; color: var(--color-text-muted); font-size: 0.875rem; }
    .card-arrow { grid-column: 4; grid-row: 1; width: 2rem; height: 2rem; background: transparent; }
    .player-identity { display: contents; }
    .avatar-wrap { grid-column: 1; grid-row: 1; margin-right: 0; }
    .avatar-wrap :deep(.p-avatar) { width: 2.75rem; height: 2.75rem; border-width: 2px; font-size: 0.9rem; box-shadow: none; }
    .player-identity > div:last-child { grid-column: 2; grid-row: 1; }
    .player-identity h3 { font-size: 1rem; }
    .player-details, .card-footer { display: none; }
    .skeleton-card { display: grid; min-height: 4rem; }
    .skeleton-topline, .skeleton-identity { display: contents; }
    .skeleton-avatar { grid-column: 1; grid-row: 1; width: 2.75rem !important; height: 2.75rem !important; margin-right: 0; }
    .skeleton-name { grid-column: 2; grid-row: 1; width: min(10rem, 72%) !important; }
    .skeleton-topline > :deep(.p-skeleton:first-child) { grid-column: 3; grid-row: 1; width: 1.6rem !important; margin-left: 0; }
    .skeleton-topline > :deep(.p-skeleton:last-child) { grid-column: 4; grid-row: 1; width: 2rem !important; height: 2rem !important; }
    .skeleton-details { display: none; }
    .load-more-area { width: 100%; }
    .load-more-area :deep(.p-button) { width: 100%; }
  }

  /* Player collections always use the compact list-item language. */
  .players-grid { display: grid; grid-template-columns: 1fr; gap: 0.45rem; }
  .player-card { display: grid; min-height: 4rem; grid-template-columns: auto minmax(0, 1fr) auto auto; align-items: center; gap: 0.45rem; padding: 0.45rem 0.55rem; box-shadow: none; }
  .player-card::before { width: 3px; height: auto; inset: 0 auto 0 0; }
  .player-card:hover { transform: none; }
  .card-topline, .player-identity { display: contents; }
  .avatar-wrap { grid-column: 1; grid-row: 1; margin-right: 0; }
  .avatar-wrap :deep(.p-avatar) { width: 2.75rem; height: 2.75rem; border-width: 2px; font-size: 0.9rem; box-shadow: none; }
  .player-identity > div:last-child { grid-column: 2; grid-row: 1; }
  .player-identity h3 { font-size: 1rem; }
  .ranking-value { grid-column: 3; grid-row: 1; padding-left: 0; color: var(--color-text-muted); font-size: 0.875rem; }
  .card-arrow { grid-column: 4; grid-row: 1; width: 2rem; height: 2rem; background: transparent; }
  .player-details, .card-footer { display: none; }
  .load-more-area { width: 100%; }

  .skeleton-card { display: grid; min-height: 4rem; }
  .skeleton-topline, .skeleton-identity { display: contents; }
  .skeleton-avatar { grid-column: 1; grid-row: 1; width: 2.75rem !important; height: 2.75rem !important; margin-right: 0; }
  .skeleton-name { grid-column: 2; grid-row: 1; width: min(10rem, 72%) !important; }
  .skeleton-topline > :deep(.p-skeleton:first-child) { grid-column: 3; grid-row: 1; width: 1.6rem !important; margin-left: 0; }
  .skeleton-topline > :deep(.p-skeleton:last-child) { grid-column: 4; grid-row: 1; width: 2rem !important; height: 2rem !important; }
  .skeleton-details { display: none; }

  @media (min-width: 768px) {
    .players-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }

  @media (min-width: 1200px) {
    .players-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
</style>
