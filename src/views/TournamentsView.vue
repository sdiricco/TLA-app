<script setup lang="ts">
  import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
  import { useRouter } from 'vue-router'
  import Button from 'primevue/button'
  import Card from 'primevue/card'
  import Dropdown from 'primevue/dropdown'
  import InputText from 'primevue/inputtext'
  import Paginator from 'primevue/paginator'
  import Tag from 'primevue/tag'
  import { useConfirm } from 'primevue/useconfirm'
  import { useToast } from 'primevue/usetoast'
  import { useAuthStore } from '../stores/auth'
  import { useTournamentsStore } from '../stores/tournaments'
  import type { Tournament, TournamentCategory, TournamentStatus } from '../types'

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
  const confirm = useConfirm()
  const toast = useToast()

  /**
   * Reactive vars
   */
  const searchName = ref('')
  const categoryFilter = ref<'all' | TournamentCategory>('all')
  const statusFilter = ref<'all' | TournamentStatus>('all')
  const filtersTimer = ref<ReturnType<typeof setTimeout> | null>(null)

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
    { label: 'Singolo', value: 'singles' },
    { label: 'Doppio', value: 'doubles' },
  ]

  const formatLabels: Record<string, string> = {
    single_elimination: 'Eliminazione diretta',
    double_elimination: 'Doppia eliminazione',
    round_robin: "Girone all'italiana",
    round_robin_elimination: 'Gironi + finale',
  }

  const categoryLabels: Record<TournamentCategory, string> = {
    singles: 'Singolo',
    doubles: 'Doppio',
  }

  const canViewAdmin = computed(() => auth.isAdmin || auth.isGuest)

  /**
   * Function: Map status to severity
   */
  function statusSeverity(status: TournamentStatus): 'info' | 'success' | 'secondary' {
    return { upcoming: 'info', ongoing: 'success', completed: 'secondary' }[status]
  }

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
   * Function: Open edit form
   */
  function openEdit(tournament: Tournament): void {
    if (auth.isGuest) return
    void router.push({ name: 'tournament-edit', params: { id: tournament.id } })
  }

  /**
   * Function: Confirm deletion
   */
  function confirmDelete(tournament: Tournament): void {
    if (auth.isGuest) return
    confirm.require({
      message: `Eliminare il torneo "${tournament.name}"? Tutti i dati correlati verranno rimossi.`,
      header: 'Conferma eliminazione',
      icon: 'pi pi-exclamation-triangle',
      rejectLabel: 'Annulla',
      acceptLabel: 'Elimina',
      acceptSeverity: 'danger',
      accept: async () => {
        try {
          await store.remove(tournament.id)
          await loadTournaments(store.page, store.perPage)
          toast.add({ severity: 'success', summary: 'Eliminato', detail: `${tournament.name} rimosso`, life: 3000 })
        } catch (e) {
          toast.add({ severity: 'error', summary: 'Errore', detail: (e as Error).message, life: 4000 })
        }
      },
    })
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
   * Function: Handle page change
   */
  function onPage(event: { page?: number; rows?: number }): void {
    void loadTournaments(event.page ?? 0, event.rows ?? store.perPage)
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
  <div class="flex flex-col gap-5">
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 class="m-0 text-2xl">Tornei</h2>
        <p class="mt-1 mb-0 text-sm text-muted-color">{{ store.total }} tornei totali</p>
      </div>
      <Button v-if="canViewAdmin" label="Nuovo torneo" icon="pi pi-plus" :disabled="auth.isGuest" @click="openCreate" />
    </div>

    <div class="grid gap-3 rounded-2xl border border-surface-200 bg-surface-0 p-4 lg:grid-cols-4">
      <div class="flex flex-col gap-1.5">
        <label for="tournament-name-filter" class="text-sm font-medium">Cerca per nome</label>
        <InputText id="tournament-name-filter" v-model="searchName" placeholder="Open 2026" fluid />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="tournament-category-filter" class="text-sm font-medium">Categoria</label>
        <Dropdown
          id="tournament-category-filter"
          v-model="categoryFilter"
          :options="categoryOptions"
          option-label="label"
          option-value="value"
          fluid
        />
      </div>

      <div class="flex flex-col gap-1.5">
        <label for="tournament-status-filter" class="text-sm font-medium">Stato</label>
        <Dropdown
          id="tournament-status-filter"
          v-model="statusFilter"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          fluid
        />
      </div>

      <div class="flex items-end">
        <Button label="Azzera filtri" severity="secondary" outlined fluid @click="clearFilters" />
      </div>
    </div>

    <div v-if="store.loading" class="flex flex-col items-center gap-3 py-10 text-muted-color text-center">
      <i class="pi pi-spin pi-spinner text-[2rem] text-primary-500" />
    </div>

    <div v-else-if="store.tournaments.length === 0" class="flex flex-col items-center gap-3 py-10 text-muted-color text-center">
      <i class="pi pi-trophy text-[2.5rem] text-muted-color" />
      <p class="m-0 leading-relaxed">
        Nessun torneo trovato.
        <br />
        Clicca <strong>Nuovo torneo</strong> per iniziare.
      </p>
    </div>

    <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      <Card
        v-for="t in store.tournaments"
        :key="t.id"
        class="cursor-pointer"
        @click="router.push({ name: 'tournament-detail', params: { id: t.id } })"
      >
        <template #header>
          <div class="flex items-center justify-between px-[0.875rem] pt-[0.875rem]">
            <Tag :value="statusLabel(t.status)" :severity="statusSeverity(t.status)" />
            <div class="flex gap-[0.125rem]">
              <Button v-if="canViewAdmin" icon="pi pi-pencil" text rounded size="small" aria-label="Modifica" :disabled="auth.isGuest" @click.stop="openEdit(t)" />
              <Button v-if="canViewAdmin" icon="pi pi-trash" text rounded size="small" severity="danger" aria-label="Elimina" :disabled="auth.isGuest" @click.stop="confirmDelete(t)" />
            </div>
          </div>
        </template>

        <template #title>
          <div class="flex items-center gap-2">
            <span class="text-[1.0625rem] font-semibold">{{ t.name }}</span>
            <Tag v-if="!t.published" value="Bozza" severity="secondary" class="text-xs" />
          </div>
        </template>

        <template #subtitle>
          <span v-if="t.location" class="flex items-center gap-[0.375rem] text-[0.8125rem] text-muted-color">
            <i class="pi pi-map-marker" /> {{ t.location }}
          </span>
        </template>

        <template #content>
          <div class="mt-2 flex flex-col gap-2">
            <div class="flex items-center gap-2 text-sm text-muted-color">
              <i class="pi pi-calendar text-[0.8125rem] w-4 text-center" />
              <span>
                {{ formatDate(t.start_date) }}
                <template v-if="t.end_date"> → {{ formatDate(t.end_date) }}</template>
              </span>
            </div>
            <div class="flex items-center gap-2 text-sm text-muted-color">
              <i class="pi pi-sitemap text-[0.8125rem] w-4 text-center" />
              <span>{{ formatLabels[t.format] ?? t.format }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm text-muted-color">
              <i class="pi pi-user text-[0.8125rem] w-4 text-center" />
              <span>{{ categoryLabels[t.category] ?? t.category }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm text-muted-color">
              <i class="pi pi-users text-[0.8125rem] w-4 text-center" />
              <span>Limite partecipanti: {{ t.participant_limit ?? 'Illimitato' }}</span>
            </div>
            <div v-if="t.format === 'round_robin_elimination'" class="flex items-center gap-2 text-sm text-muted-color">
              <i class="pi pi-sitemap text-[0.8125rem] w-4 text-center" />
              <span>{{ t.group_count ?? '—' }} gironi · {{ t.qualifiers_per_group ?? '—' }} qualificati/girone</span>
            </div>
          </div>
        </template>
      </Card>
    </div>

    <div class="flex justify-center pt-2">
      <Paginator
        :rows="store.perPage"
        :first="store.page * store.perPage"
        :total-records="store.total"
        :rows-per-page-options="[6, 12, 24]"
        @page="onPage"
      />
    </div>
  </div>
</template>
