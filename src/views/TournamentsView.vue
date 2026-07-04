<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import Button from 'primevue/button'
  import InputText from 'primevue/inputtext'
  import Select from 'primevue/select'
  import Skeleton from 'primevue/skeleton'
  import { tournamentFormatLabels } from '../config/tournamentFormats'
  import { useAuthStore } from '../stores/auth'
  import { useTournamentsStore } from '../stores/tournaments'
  import type { TournamentCategory, TournamentStatus } from '../types'

  /**
   * Interfaces
   */
  interface FilterOption<T> {
    label: string
    value: 'all' | T
  }

  /**
   * Stores
   */
  const auth = useAuthStore()
  const store = useTournamentsStore()
  const router = useRouter()

  /**
   * Reactive vars
   */
  const searchName = ref('')
  const categoryFilter = ref<'all' | TournamentCategory>('all')
  const statusFilter = ref<'all' | TournamentStatus>('all')
  const filtersTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const mobileFiltersOpen = ref(false)
  const skeletonItems = Array.from({ length: 6 }, (_, index) => index)

  /**
   * Constants
   */
  const statusOptions: FilterOption<TournamentStatus>[] = [
    { label: 'Tutti', value: 'all' },
    { label: 'In programma', value: 'upcoming' },
    { label: 'In corso', value: 'ongoing' },
    { label: 'Completati', value: 'completed' },
  ]

  const categoryOptions: FilterOption<TournamentCategory>[] = [
    { label: 'Tutte le categorie', value: 'all' },
    { label: 'Maschile', value: 'maschile' },
    { label: 'Femminile', value: 'femminile' },
  ]

  const categoryLabels: Record<string, string> = {
    maschile: 'Maschile',
    femminile: 'Femminile',
    singles: 'Maschile',
    doubles: 'Femminile',
  }

  const canViewAdmin = computed(() => auth.isAdmin)
  const hasMoreTournaments = computed(() => store.tournaments.length < store.total)

  /**
   * Function: Map status to label
   */
  function statusLabel(status: TournamentStatus): string {
    return { upcoming: 'In programma', ongoing: 'In corso', completed: 'Completato' }[status]
  }

  /**
   * Function: Format a date
   */
  function formatDate(date: string | null | undefined): string {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  /**
   * Function: Open create form
   */
  function openCreate(): void {
    if (auth.isGuest) return
    void router.push({ name: 'tournament-create' })
  }

  /**
   * Function: Load tournaments from the server
   */
  async function loadTournaments(page = 0, perPage = store.perPage): Promise<void> {
    await store.fetchAll({
      name: searchName.value.trim() || undefined,
      category: categoryFilter.value === 'all' ? undefined : categoryFilter.value,
      status: statusFilter.value === 'all' ? undefined : statusFilter.value,
      page,
      perPage,
    })
  }

  /**
   * Function: Load the next page and append it to the grid
   */
  async function loadMore(): Promise<void> {
    if (store.loadingMore || !hasMoreTournaments.value) return

    await store.fetchAll(
      {
        name: searchName.value.trim() || undefined,
        category: categoryFilter.value === 'all' ? undefined : categoryFilter.value,
        status: statusFilter.value === 'all' ? undefined : statusFilter.value,
        page: store.page + 1,
        perPage: store.perPage,
      },
      { append: true },
    )
  }

  /**
   * Function: Reset filters
   */
  function clearFilters(): void {
    searchName.value = ''
    categoryFilter.value = 'all'
    statusFilter.value = 'all'
    void loadTournaments(0, store.perPage)
  }

  /**
   * Hooks
   */
  onMounted(() => {
    void loadTournaments()
  })

  watch([searchName, categoryFilter, statusFilter], () => {
    if (filtersTimer.value) clearTimeout(filtersTimer.value)
    filtersTimer.value = setTimeout(() => {
      void loadTournaments(0, store.perPage)
    }, 300)
  })

  onBeforeUnmount(() => {
    if (filtersTimer.value) clearTimeout(filtersTimer.value)
  })
</script>

<template>
  <div class="tournaments-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">GESTIONE TORNEI</p>
        <h1>Il campo è pronto.</h1>
        <p class="page-subtitle">Organizza, monitora e porta a termine ogni competizione.</p>
      </div>
      <Button v-if="canViewAdmin" class="create-button" label="Nuovo torneo" icon="pi pi-plus" :disabled="auth.isGuest" @click="openCreate" />
    </header>

    <section class="summary-strip">
      <div class="summary-icon"><i class="pi pi-trophy" /></div>
      <div><strong>{{ store.total }}</strong><span>Tornei totali</span></div>
      <span class="summary-copy">Tutto il tuo tennis, in un solo colpo d'occhio.</span>
    </section>

    <section class="filters-panel" :class="{ 'mobile-open': mobileFiltersOpen }" aria-label="Filtri tornei">
      <button class="filter-title" type="button" :aria-expanded="mobileFiltersOpen" @click="mobileFiltersOpen = !mobileFiltersOpen">
        <i class="pi pi-sliders-h" />
        <span>Filtra tornei</span>
        <span class="mobile-filter-count">{{ [categoryFilter, statusFilter].filter(value => value !== 'all').length || '' }}<i class="pi pi-chevron-down" /></span>
      </button>
      <div class="filters-grid">
        <div class="filter-field search-field">
        <label for="tournament-name-filter" class="text-sm font-medium">Cerca per nome</label>
          <span class="search-wrap"><i class="pi pi-search" /><InputText id="tournament-name-filter" v-model="searchName" placeholder="Es. Open 2026" fluid /></span>
        </div>

        <div class="filter-field">
        <label for="tournament-category-filter" class="text-sm font-medium">Categoria</label>
        <Select
          id="tournament-category-filter"
          v-model="categoryFilter"
          :options="categoryOptions"
          option-label="label"
          option-value="value"
          fluid
        />
        </div>

        <div class="filter-field">
        <label for="tournament-status-filter" class="text-sm font-medium">Stato</label>
        <Select
          id="tournament-status-filter"
          v-model="statusFilter"
          :options="statusOptions"
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
      <div><h2>I tuoi tornei</h2><span>{{ store.total }} risultati</span></div>
      <span class="view-label"><i class="pi pi-th-large" /> Vista griglia</span>
    </div>

    <div v-if="store.loading" class="tournaments-grid">
      <div v-for="item in skeletonItems" :key="item" class="tournament-card skeleton-card">
        <Skeleton width="6.5rem" height="1.5rem" borderRadius="999px" />
        <Skeleton width="75%" height="1.8rem" />
        <Skeleton width="45%" height="1rem" />
        <Skeleton width="100%" height="5.5rem" borderRadius="12px" />
      </div>
    </div>

    <div v-else-if="store.tournaments.length === 0" class="empty-state">
      <span><i class="pi pi-trophy" /></span>
      <h3>Nessun torneo in campo</h3>
      <p>Modifica i filtri oppure crea una nuova competizione.</p>
    </div>

    <div v-else class="tournaments-grid">
      <article
        v-for="t in store.tournaments"
        :key="t.id"
        class="tournament-card"
        :class="`status-${t.status}`"
        tabindex="0"
        @click="router.push({ name: 'tournament-detail', params: { id: t.id } })"
        @keydown.enter="router.push({ name: 'tournament-detail', params: { id: t.id } })"
      >
        <div class="card-topline">
          <span class="status-pill"><i />{{ statusLabel(t.status) }}</span>
          <span v-if="!t.published" class="draft-pill">Bozza</span>
        </div>

        <div class="card-title-row">
          <div>
            <h3>{{ t.name }}</h3>
            <span v-if="t.location" class="location"><i class="pi pi-map-marker" />{{ t.location }}</span>
          </div>
          <span class="card-arrow"><i class="pi pi-arrow-up-right" /></span>
        </div>

        <div class="date-panel">
          <span class="date-icon"><i class="pi pi-calendar" /></span>
          <div><small>PERIODO</small><strong>{{ formatDate(t.start_date) }}<template v-if="t.end_date"> — {{ formatDate(t.end_date) }}</template></strong></div>
        </div>

        <div class="card-meta">
          <div><i class="pi pi-sitemap" /><span><small>FORMATO</small>{{ tournamentFormatLabels[t.format] ?? t.format }}</span></div>
          <div><i class="pi pi-users" /><span><small>CATEGORIA</small>{{ categoryLabels[t.category] ?? t.category }}</span></div>
        </div>

        <footer class="card-footer">
          <span><i class="pi pi-user-plus" /> Fino a {{ t.participant_limit ?? '∞' }} giocatori</span>
          <span>Apri torneo <i class="pi pi-chevron-right" /></span>
        </footer>
      </article>
    </div>

    <div v-if="!store.loading && store.tournaments.length > 0" class="load-more-area">
      <div v-if="store.loadingMore" class="tournaments-grid loading-more-grid">
        <div v-for="item in 3" :key="`more-${item}`" class="tournament-card skeleton-card"><Skeleton width="70%" height="1.8rem" /><Skeleton width="100%" height="7rem" /></div>
      </div>

      <Button
        v-if="hasMoreTournaments"
        label="Carica altro"
        icon="pi pi-chevron-down"
        severity="secondary"
        outlined
        :loading="store.loadingMore"
        @click="loadMore"
      />

      <p v-if="!hasMoreTournaments" class="all-loaded"><i class="pi pi-check-circle" /> Hai visualizzato tutti i tornei</p>
    </div>
  </div>
</template>

<style scoped>
  .tournaments-page { --green: #047857; --lime: #b7f34a; display: flex; flex-direction: column; gap: 1.5rem; max-width: 1480px; margin: 0 auto; color: #17211d; }
  .page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; padding-top: 0.4rem; }
  .eyebrow { margin: 0 0 0.5rem; color: var(--green); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.16em; }
  .page-header h1 { margin: 0; font-size: clamp(2rem, 3vw, 3rem); line-height: 1; letter-spacing: -0.055em; }
  .page-subtitle { margin: 0.75rem 0 0; color: #68756f; font-size: 0.95rem; }
  .create-button { height: 3rem; border-color: var(--green); border-radius: 12px; background: var(--green); box-shadow: 0 10px 22px rgb(4 120 87 / 18%); font-weight: 700; }
  .summary-strip { display: flex; align-items: center; gap: 0.9rem; padding: 0.85rem 1rem; border: 1px solid #dfe9e5; border-radius: 16px; background: linear-gradient(90deg, #fff, #f4fbf8); }
  .summary-icon { display: grid; place-items: center; width: 2.65rem; height: 2.65rem; border-radius: 11px; background: #d1fae5; color: var(--green); }
  .summary-strip div:nth-child(2) { display: grid; min-width: 100px; }
  .summary-strip strong { font-size: 1.15rem; line-height: 1; }
  .summary-strip div span { margin-top: 0.25rem; color: #78847f; font-size: 0.68rem; }
  .summary-copy { margin-left: auto; color: #7b8782; font-size: 0.76rem; font-style: italic; }
  .filters-panel { padding: 1rem; border: 1px solid #dfe7e3; border-radius: 18px; background: rgb(255 255 255 / 88%); box-shadow: 0 8px 30px rgb(26 54 43 / 5%); }
  .filter-title { display: flex; width: 100%; align-items: center; gap: 0.5rem; margin-bottom: 0.8rem; padding: 0; border: 0; background: transparent; color: #3f4c46; font-size: 0.75rem; font-weight: 800; text-align: left; }
  .filter-title i { color: var(--green); }
  .mobile-filter-count { display: none; }
  .filters-grid { display: grid; grid-template-columns: 1.2fr 1fr 1fr auto; gap: 0.75rem; }
  .filter-field { display: flex; flex-direction: column; gap: 0.4rem; }
  .filter-field label { color: #69756f; font-size: 0.68rem; font-weight: 700; }
  .search-wrap { position: relative; }
  .search-wrap > i { position: absolute; z-index: 2; top: 50%; left: 0.9rem; transform: translateY(-50%); color: #91a099; font-size: 0.8rem; }
  .search-wrap :deep(.p-inputtext) { padding-left: 2.4rem; }
  .filter-field :deep(.p-inputtext), .filter-field :deep(.p-select) { height: 2.75rem; border-color: #dce5e1; border-radius: 10px; background: #fbfdfc; font-size: 0.82rem; }
  .filter-field :deep(.p-inputtext:focus), .filter-field :deep(.p-select.p-focus) { border-color: #10b981; box-shadow: 0 0 0 3px rgb(16 185 129 / 10%); }
  .filter-action { display: flex; align-items: flex-end; }
  .filter-action :deep(.p-button) { height: 2.75rem; color: #66736d; font-size: 0.78rem; }
  .section-heading { display: flex; align-items: center; justify-content: space-between; margin-top: 0.25rem; }
  .section-heading > div { display: flex; align-items: baseline; gap: 0.65rem; }
  .section-heading h2 { margin: 0; font-size: 1.2rem; letter-spacing: -0.025em; }
  .section-heading span { color: #8b9691; font-size: 0.72rem; }
  .view-label { display: flex; align-items: center; gap: 0.4rem; }
  .tournaments-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(350px, 100%), 1fr)); gap: 1rem; }
  .tournament-card { position: relative; overflow: hidden; padding: 1.25rem; border: 1px solid #e1e8e5; border-radius: 18px; background: #fff; box-shadow: 0 8px 24px rgb(30 60 48 / 6%); cursor: pointer; transition: transform 180ms ease, box-shadow 180ms ease, border-color 180ms ease; }
  .tournament-card::before { position: absolute; inset: 0 0 auto; height: 3px; background: #10b981; content: ''; }
  .tournament-card.status-upcoming::before { background: #38bdf8; }
  .tournament-card.status-completed::before { background: #94a3b8; }
  .tournament-card:hover, .tournament-card:focus-visible { transform: translateY(-3px); border-color: #b9d8cc; box-shadow: 0 16px 36px rgb(18 73 51 / 11%); outline: none; }
  .card-topline { display: flex; align-items: center; justify-content: space-between; min-height: 1.6rem; }
  .status-pill, .draft-pill { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.35rem 0.55rem; border-radius: 99px; background: #dcfce7; color: #08764f; font-size: 0.65rem; font-weight: 800; }
  .status-pill i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 3px rgb(16 185 129 / 12%); }
  .status-upcoming .status-pill { background: #e0f2fe; color: #0369a1; }
  .status-completed .status-pill { background: #f1f5f9; color: #64748b; }
  .draft-pill { background: #f1f5f9; color: #64748b; }
  .card-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin: 1.15rem 0; }
  .card-title-row h3 { margin: 0; font-size: 1.2rem; letter-spacing: -0.03em; }
  .location { display: flex; align-items: center; gap: 0.35rem; margin-top: 0.4rem; color: #83908a; font-size: 0.7rem; }
  .card-arrow { display: grid; place-items: center; width: 2rem; height: 2rem; flex: 0 0 auto; border-radius: 50%; background: #f0f7f4; color: var(--green); font-size: 0.75rem; transition: 180ms; }
  .tournament-card:hover .card-arrow { background: var(--green); color: white; }
  .date-panel { display: flex; align-items: center; gap: 0.75rem; padding: 0.8rem; border-radius: 12px; background: #f6faf8; }
  .date-icon { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; flex: 0 0 auto; border-radius: 9px; background: white; color: var(--green); box-shadow: 0 3px 9px rgb(33 67 54 / 8%); }
  .date-panel div { display: grid; gap: 0.2rem; }
  .date-panel small, .card-meta small { color: #98a39e; font-size: 0.56rem; font-weight: 800; letter-spacing: 0.1em; }
  .date-panel strong { font-size: 0.75rem; }
  .card-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; padding: 1rem 0; }
  .card-meta > div { display: flex; align-items: center; gap: 0.55rem; min-width: 0; color: #65726c; font-size: 0.7rem; }
  .card-meta > div > i { color: #79a491; }
  .card-meta span { display: grid; gap: 0.15rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .card-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-top: 0.8rem; border-top: 1px solid #edf1ef; color: #87928d; font-size: 0.65rem; }
  .card-footer span { display: flex; align-items: center; gap: 0.35rem; }
  .card-footer span:last-child { color: var(--green); font-weight: 750; }
  .skeleton-card { display: flex; min-height: 300px; flex-direction: column; gap: 1.2rem; cursor: default; }
  .empty-state { display: flex; min-height: 280px; flex-direction: column; align-items: center; justify-content: center; border: 1px dashed #cbdad4; border-radius: 18px; background: #f9fcfb; text-align: center; }
  .empty-state > span { display: grid; place-items: center; width: 3.5rem; height: 3.5rem; border-radius: 50%; background: #d1fae5; color: var(--green); font-size: 1.3rem; }
  .empty-state h3 { margin: 1rem 0 0.3rem; }
  .empty-state p { margin: 0; color: #7c8983; font-size: 0.8rem; }
  .load-more-area { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  .loading-more-grid { width: 100%; }
  .all-loaded { display: flex; align-items: center; gap: 0.4rem; margin: 0; color: #8a9690; font-size: 0.72rem; }
  .all-loaded i { color: #10b981; }

  @media (max-width: 800px) {
    .page-header { align-items: flex-start; }
    .page-subtitle, .summary-copy, .view-label { display: none; }
    .filters-grid { grid-template-columns: 1fr 1fr; }
    .search-field { grid-column: 1 / -1; }
    .filter-action { align-items: flex-end; }
  }

  @media (max-width: 520px) {
    .tournaments-page { gap: 0.8rem; }
    .page-header { align-items: center; flex-direction: row; gap: 0.75rem; padding-top: 0; }
    .page-header > div { min-width: 0; flex: 1; }
    .eyebrow { display: none; }
    .page-header h1 { overflow: hidden; font-size: 1.7rem; line-height: 1.1; text-overflow: ellipsis; white-space: nowrap; }
    .create-button { width: 2.75rem; min-width: 2.75rem; padding: 0; border-radius: 50%; }
    .create-button :deep(.p-button-label) { display: none; }
    .summary-strip { display: none; }
    .filters-panel { padding: 0.65rem; border-radius: 13px; box-shadow: none; }
    .filter-title { min-height: 2rem; margin: 0; padding-inline: 0.2rem; font-size: 0.875rem; }
    .mobile-filter-count { display: inline-flex; align-items: center; gap: 0.45rem; margin-left: auto; color: var(--green); }
    .mobile-filter-count > i { transition: transform 160ms; }
    .mobile-open .mobile-filter-count > i { transform: rotate(180deg); }
    .filters-grid { grid-template-columns: 1fr; }
    .search-field { grid-column: auto; }
    .filters-grid > :not(.search-field) { display: none; }
    .mobile-open .filters-grid > * { display: flex; }
    .filters-grid { margin-top: 0.55rem; }
    .filter-action :deep(.p-button) { width: 100%; }
    .section-heading { margin-top: 0.2rem; }
    .section-heading h2 { font-size: 1.05rem; }
    .section-heading span { font-size: 0.75rem; }
    .tournaments-grid { display: flex; flex-direction: column; gap: 0.65rem; }
    .tournament-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 0.35rem 0.65rem; padding: 0.55rem 0.65rem; border-radius: 12px; box-shadow: 0 2px 8px rgb(30 60 48 / 5%); }
    .tournament-card::before { width: 3px; height: auto; inset: 0 auto 0 0; }
    .tournament-card:hover { transform: none; }
    .card-topline { grid-column: 2; grid-row: 1; min-height: auto; }
    .status-pill { padding: 0.2rem 0.4rem; background: transparent; font-size: 0.75rem; }
    .status-upcoming .status-pill, .status-completed .status-pill { background: transparent; }
    .status-pill i { box-shadow: none; }
    .draft-pill { display: none; }
    .card-title-row { grid-column: 1; grid-row: 1; min-width: 0; margin: 0; }
    .card-title-row > div { min-width: 0; }
    .card-title-row h3 { overflow: hidden; font-size: 0.98rem; text-overflow: ellipsis; white-space: nowrap; }
    .location { display: none; }
    .card-arrow { display: none; }
    .date-panel { grid-column: 1 / -1; grid-row: 2; gap: 0.35rem; padding: 0; background: transparent; }
    .date-icon { display: inline-grid; width: 1rem; height: 1rem; background: transparent; box-shadow: none; font-size: 0.75rem; }
    .date-panel div { display: block; }
    .date-panel small, .card-meta small { display: none; }
    .date-panel strong { color: #65726c; font-size: 0.8125rem; font-weight: 600; }
    .card-meta { grid-column: 1 / -1; grid-row: 3; display: flex; gap: 0.8rem; padding: 0; }
    .card-meta > div { gap: 0.35rem; font-size: 0.8125rem; }
    .card-meta span { display: block; }
    .card-footer { display: none; }
    .skeleton-card { display: flex; min-height: 96px; }
    .load-more-area :deep(.p-button) { width: 100%; }
  }
</style>
