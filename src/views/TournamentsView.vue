<script setup lang="ts">
  // Vue and third-party dependencies
  import { computed, onMounted, ref } from 'vue';
  import { useRouter } from 'vue-router';
  import { watchDebounced } from '@vueuse/core';
  import moment from 'moment';
  import 'moment/locale/it.js';
  import Button from 'primevue/button';
  import Chip from 'primevue/chip';
  import InputText from 'primevue/inputtext';

  // Page components and tournament filter types
  import TournamentEmptyState from '@/components/tournaments/TournamentEmptyState.vue';
  import TournamentFiltersDrawer from '@/components/tournaments/TournamentFiltersDrawer.vue';
  import TournamentListItem from '@/components/tournaments/TournamentListItem.vue';
  import TournamentListSkeleton from '@/components/tournaments/TournamentListSkeleton.vue';
  import type {
    TournamentFilterKey,
    TournamentFilterOption,
    TournamentFilters,
  } from '@/components/tournaments/tournamentFilters';

  // Stores and domain types
  import { useAuthStore } from '../stores/auth';
  import { useOrganizationsStore } from '../stores/organizations';
  import { useTournamentsStore } from '../stores/tournaments';
  import type { TournamentCategory, TournamentStatus } from '../types';

  /**
   * View models
   *
   * Represents an applied filter as displayed in the removable chip list.
   */
  interface ActiveTournamentFilter {
    key: TournamentFilterKey;
    label: string;
  }

  /**
   * Stores and router
   */
  const auth = useAuthStore();
  const organizationsStore = useOrganizationsStore();
  const store = useTournamentsStore();
  const router = useRouter();

  /**
   * Local state
   *
   * Draft filters belong to the open drawer. Applied filters are the values
   * currently used by API requests, so closing the drawer does not apply
   * incomplete or unwanted edits.
   */
  const filtersOpen = ref(false);
  const searchName = ref('');
  const draftFilters = ref<TournamentFilters>(createDefaultFilters());
  const appliedFilters = ref<TournamentFilters>(createDefaultFilters());

  /**
   * Filter options
   */
  const statusOptions: TournamentFilterOption<TournamentStatus>[] = [
    { label: 'Tutti', value: 'all', icon: 'mdi:format-list-bulleted' },
    { label: 'In programma', value: 'upcoming', icon: 'mdi:calendar-clock-outline' },
    { label: 'In corso', value: 'ongoing', icon: 'mdi:progress-clock' },
    { label: 'Completati', value: 'completed', icon: 'mdi:check-circle-outline' },
  ];

  const categoryOptions: TournamentFilterOption<TournamentCategory>[] = [
    { label: 'Tutte le categorie', value: 'all', icon: 'mdi:gender-male-female' },
    { label: 'Maschile', value: 'maschile', icon: 'mdi:gender-male' },
    { label: 'Femminile', value: 'femminile', icon: 'mdi:gender-female' },
  ];

  /**
   * Derived state
   */
  const canViewAdmin = computed(() => auth.isAdmin);
  const hasMoreTournaments = computed(() => store.tournaments.length < store.total);
  const draftTournaments = computed(() =>
    store.tournaments.filter((tournament) => !tournament.published)
  );
  const publishedTournaments = computed(() =>
    store.tournaments.filter((tournament) => tournament.published)
  );

  // A date range is sent to the API only when both endpoints are selected.
  const completedDateRange = computed(() => {
    const [from, to] = appliedFilters.value.dateRange ?? [];
    return from && to ? ([from, to] as const) : null;
  });

  const activeFiltersCount = computed(
    () =>
      [
        appliedFilters.value.category !== 'all',
        completedDateRange.value !== null,
        appliedFilters.value.organizationId !== 'mine',
      ].filter(Boolean).length
  );

  // Converts applied filter values into the presentation model used by PrimeVue chips.
  const activeFilterChips = computed<ActiveTournamentFilter[]>(() => {
    const filters = appliedFilters.value;
    const chips: ActiveTournamentFilter[] = [];

    if (filters.category !== 'all') {
      const option = categoryOptions.find((item) => item.value === filters.category);
      if (option) chips.push({ key: 'category', label: option.label });
    }
    if (completedDateRange.value) {
      const [from, to] = completedDateRange.value;
      chips.push({
        key: 'dateRange',
        label: `${moment(from).locale('it').format('L')} – ${moment(to).locale('it').format('L')}`,
      });
    }
    if (filters.organizationId !== 'mine') {
      const label =
        filters.organizationId === 'global'
          ? 'Contenuti globali'
          : (organizationsStore.organizations.find(
              (organization) => organization.id === filters.organizationId
            )?.name ?? 'Organizzazione');
      chips.push({ key: 'organizationId', label });
    }

    return chips;
  });

  /**
   * Filter and query helpers
   */

  // Returns a fresh object so draft and applied filters never share mutable state.
  function createDefaultFilters(): TournamentFilters {
    return {
      category: 'all',
      status: 'all',
      dateRange: null,
      organizationId: 'mine',
    };
  }

  // Moment formats the local calendar date without introducing a UTC day shift.
  function toDateQuery(date: Date | null | undefined): string | undefined {
    if (!date) return undefined;
    return moment(date).format('YYYY-MM-DD');
  }

  // Normalizes UI-only values such as "all" into the optional API query fields.
  function currentFilters() {
    const filters = appliedFilters.value;
    return {
      name: searchName.value.trim() || undefined,
      category: filters.category === 'all' ? undefined : filters.category,
      status: filters.status === 'all' ? undefined : filters.status,
      dateFrom: toDateQuery(completedDateRange.value?.[0]),
      dateTo: toDateQuery(completedDateRange.value?.[1]),
      organizationId: filters.organizationId,
    };
  }

  /**
   * Navigation actions
   */
  function openCreate(): void {
    if (auth.isGuest) return;
    void router.push({ name: 'tournament-create' });
  }

  /**
   * Data loading
   */
  async function loadTournaments(page = 0, perPage = store.perPage): Promise<void> {
    await store.fetchAll({
      ...currentFilters(),
      page,
      perPage,
    });
  }

  // Loads the following page without replacing tournaments already displayed.
  async function loadMore(): Promise<void> {
    if (store.loadingMore || !hasMoreTournaments.value) return;

    await store.fetchAll(
      {
        ...currentFilters(),
        page: store.page + 1,
        perPage: store.perPage,
      },
      { append: true }
    );
  }

  /**
   * Filter actions
   */

  // Starts each drawer session from the filters currently applied to the list.
  function openFilters(): void {
    const dateRange = appliedFilters.value.dateRange;
    draftFilters.value = {
      ...appliedFilters.value,
      dateRange: dateRange ? [...dateRange] : null,
    };
    filtersOpen.value = true;
  }

  // Commits the drawer draft and reloads the first page with the new query.
  function applyFilters(): void {
    const dateRange = draftFilters.value.dateRange;
    appliedFilters.value = {
      ...draftFilters.value,
      dateRange: dateRange ? [...dateRange] : null,
    };
    filtersOpen.value = false;
    void loadTournaments(0, store.perPage);
  }

  // Status is exposed as a quick filter because it is the most common list operation.
  function applyStatus(status: TournamentStatus | 'all'): void {
    if (appliedFilters.value.status === status) return;

    appliedFilters.value = { ...appliedFilters.value, status };
    void loadTournaments(0, store.perPage);
  }

  // Removing a chip updates the applied filters immediately and refreshes the list.
  function removeFilter(key: TournamentFilterKey): void {
    const filters = { ...appliedFilters.value };
    if (key === 'category') filters.category = 'all';
    if (key === 'status') filters.status = 'all';
    if (key === 'dateRange') filters.dateRange = null;
    if (key === 'organizationId') filters.organizationId = 'mine';
    appliedFilters.value = filters;
    void loadTournaments(0, store.perPage);
  }

  // Resets only the drawer draft; the reset takes effect when the user applies it.
  function clearFilters(): void {
    draftFilters.value = createDefaultFilters();
  }

  function clearAppliedFilters(): void {
    appliedFilters.value = createDefaultFilters();
    void loadTournaments(0, store.perPage);
  }

  /**
   * Lifecycle and reactive effects
   */

  // Performs the initial request when the route view becomes active.
  onMounted(() => {
    void loadTournaments();
  });

  // Waits until typing pauses before querying, avoiding one request per keystroke.
  // VueUse also disposes the pending watcher automatically on component unmount.
  watchDebounced(
    searchName,
    () => {
      void loadTournaments(0, store.perPage);
    },
    { debounce: 300 }
  );
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <div class="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 text-(--color-text) sm:gap-5">
    <!------------------------------>
    <!-- Section: Header -->
    <!------------------------------>
    <header class="flex items-start justify-between gap-4 pb-1">
      <div class="min-w-0">
        <h1 class="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Tornei</h1>
        <p class="mt-1 text-sm text-(--color-text-muted) sm:text-base">
          Gestisci le competizioni della tua organizzazione.
        </p>
      </div>
      <Button
        v-if="canViewAdmin"
        class="sm:hidden"
        icon="pi pi-plus"
        aria-label="Crea un nuovo torneo"
        :disabled="auth.isGuest"
        @click="openCreate"
      />
      <Button
        v-if="canViewAdmin"
        class="hidden sm:inline-flex"
        label="Nuovo torneo"
        icon="pi pi-plus"
        aria-label="Crea un nuovo torneo"
        :disabled="auth.isGuest"
        @click="openCreate"
      />
    </header>

    <!------------------------------>
    <!-- Section: Search and filters -->
    <!------------------------------>
    <section class="rounded-lg border border-(--color-border) bg-(--color-surface-card) p-3 sm:p-4">
      <header class="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 class="text-base font-bold tracking-tight">Cerca e filtra</h2>
          <p class="mt-1 text-sm text-(--color-text-muted)">
            Trova rapidamente il torneo che vuoi gestire.
          </p>
        </div>
        <p class="shrink-0 text-sm font-semibold text-(--color-text-muted)">
          {{ store.total }} {{ store.total === 1 ? 'torneo' : 'tornei' }}
        </p>
      </header>

      <div class="flex items-center gap-2">
        <span class="min-w-0 flex-1">
          <InputText
            v-model="searchName"
            aria-label="Cerca torneo per nome"
            placeholder="Cerca torneo per nome"
            fluid
          />
        </span>
        <Button
          label="Filtri"
          icon="pi pi-sliders-h"
          severity="secondary"
          outlined
          :badge="activeFiltersCount ? String(activeFiltersCount) : undefined"
          aria-label="Apri filtri tornei"
          title="Filtra tornei"
          @click="openFilters"
        />
      </div>

      <div class="mt-3 min-w-0 overflow-x-auto pb-1">
          <div
            class="flex w-max gap-2"
            role="group"
            aria-label="Filtra tornei per stato"
          >
            <Button
              v-for="option in statusOptions"
              :key="option.value"
              class="shrink-0"
              :label="option.label"
              size="small"
              :severity="appliedFilters.status === option.value ? undefined : 'secondary'"
              :outlined="appliedFilters.status !== option.value"
              :aria-pressed="appliedFilters.status === option.value"
              @click="applyStatus(option.value)"
            />
          </div>
      </div>

      <div
        v-if="activeFilterChips.length"
        class="mt-3 flex min-w-0 items-center gap-2 border-t border-(--color-border) pt-3"
      >
        <div class="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">
          <Chip
            v-for="chip in activeFilterChips"
            :key="chip.key"
            class="shrink-0"
            :label="chip.label"
            removable
            :aria-label="`Filtro ${chip.label}`"
            @remove="removeFilter(chip.key)"
          />
        </div>
        <Button
          class="shrink-0 sm:hidden"
          icon="pi pi-times"
          severity="secondary"
          text
          size="small"
          aria-label="Cancella tutti i filtri"
          @click="clearAppliedFilters"
        />
        <Button
          class="hidden shrink-0 sm:inline-flex"
          label="Cancella filtri"
          severity="secondary"
          variant="link"
          size="small"
          @click="clearAppliedFilters"
        />
      </div>
    </section>

    <!------------------------------>
    <!-- Section: Loading tournaments -->
    <!------------------------------>
    <TournamentListSkeleton v-if="store.loading" />

    <!------------------------------>
    <!-- Section: No tournaments -->
    <!------------------------------>
    <TournamentEmptyState v-else-if="store.tournaments.length === 0" />

    <!------------------------------>
    <!-- Section: Tournament list -->
    <!------------------------------>
    <div v-else class="flex flex-col gap-6">
      <section v-if="draftTournaments.length" class="flex flex-col gap-2">
        <header class="flex items-baseline gap-2.5">
          <h2 class="text-lg font-bold tracking-tight sm:text-xl">Bozze</h2>
          <span class="text-xs text-(--color-text-subtle)">
            {{ draftTournaments.length }} da completare
          </span>
        </header>
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          <TournamentListItem
            v-for="tournament in draftTournaments"
            :key="tournament.id"
            :tournament="tournament"
            @open="router.push({ name: 'tournament-detail', params: { id: tournament.id } })"
          />
        </div>
      </section>

      <section v-if="publishedTournaments.length" class="flex flex-col gap-2">
        <header class="flex items-baseline gap-2.5">
          <h2 class="text-lg font-bold tracking-tight sm:text-xl">Tornei pubblicati</h2>
          <span class="text-xs text-(--color-text-subtle)">
            {{ publishedTournaments.length }}
          </span>
        </header>
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          <TournamentListItem
            v-for="tournament in publishedTournaments"
            :key="tournament.id"
            :tournament="tournament"
            @open="router.push({ name: 'tournament-detail', params: { id: tournament.id } })"
          />
        </div>
      </section>
    </div>

    <!------------------------------>
    <!-- Section: Pagination -->
    <!------------------------------>
    <div
      v-if="!store.loading && store.tournaments.length > 0"
      class="flex flex-col items-center gap-4"
    >
      <TournamentListSkeleton v-if="store.loadingMore" :count="3" />

      <Button
        v-if="hasMoreTournaments"
        label="Carica altro"
        icon="pi pi-chevron-down"
        severity="secondary"
        outlined
        :loading="store.loadingMore"
        @click="loadMore"
      />
    </div>
  </div>

  <!------------------------------>
  <!-- Section: Filters sidebar -->
  <!------------------------------>
  <TournamentFiltersDrawer
    v-model:visible="filtersOpen"
    v-model:filters="draftFilters"
    :category-options="categoryOptions"
    :status-options="statusOptions"
    @reset="clearFilters"
    @apply="applyFilters"
  />
</template>
