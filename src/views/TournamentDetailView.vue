<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import TournamentDetailHero from '@/components/tournaments/TournamentDetailHero.vue'
import { tournamentDetailKey } from '@/components/tournaments/tournamentDetailContext'
import { useAuthStore } from '@/stores/auth'
import { useTournamentsStore } from '@/stores/tournaments'
import type { TournamentStatus, TournamentWithPlayers } from '@/types'

// -----------------------------------------------------------------------------
// Route services and shared application state
// -----------------------------------------------------------------------------
const route = useRoute()
const router = useRouter()
const tournamentsStore = useTournamentsStore()
const auth = useAuthStore()
const confirm = useConfirm()
const toast = useToast()

// -----------------------------------------------------------------------------
// Shared page state
// The parent owns only the tournament data required by the hero and both child
// routes. Players and matches are deliberately loaded inside their subpages.
// -----------------------------------------------------------------------------
const tournament = ref<TournamentWithPlayers | null>(null)
const loading = ref(true)
const updatingStatus = ref(false)

const enrolledPlayersCount = computed(() => {
  if (!tournament.value) return 0
  return tournament.value.playerIds?.length ?? tournament.value.tournament_players?.length ?? 0
})
const canViewAdmin = computed(() => auth.isAdmin)
const canModify = computed(() => !auth.isGuest)

// PrimeVue Menu consumes a declarative list. Commands remain here because they
// modify the shared tournament and therefore affect both subpages.
const tournamentActions = computed(() => [
  {
    label: tournament.value?.published ? 'Nascondi torneo' : 'Pubblica torneo',
    icon: tournament.value?.published ? 'pi pi-eye-slash' : 'pi pi-eye',
    command: publishToggle,
  },
  { separator: true },
  {
    label: 'Elimina torneo',
    icon: 'pi pi-trash',
    class: 'text-red-600',
    command: confirmDelete,
  },
])

// -----------------------------------------------------------------------------
// Loading and synchronization
// Child pages call this function after a mutation so the hero and navigation
// counters never display stale tournament data.
// -----------------------------------------------------------------------------
async function reloadTournament(): Promise<void> {
  tournament.value = await tournamentsStore.getById(route.params['id'] as string)
}

async function loadPage(): Promise<void> {
  loading.value = true
  try {
    await reloadTournament()
  } catch {
    toast.add({ severity: 'error', summary: 'Errore', detail: 'Torneo non trovato', life: 3000 })
    await router.push({ name: 'tournaments' })
  } finally {
    loading.value = false
  }
}

// -----------------------------------------------------------------------------
// Tournament-level actions
// -----------------------------------------------------------------------------
function openEdit(): void {
  if (!tournament.value) return
  void router.push({ name: 'tournament-edit', params: { id: tournament.value.id } })
}

function confirmDelete(): void {
  if (!tournament.value) return
  const currentTournament = tournament.value
  confirm.require({
    message: `Eliminare il torneo "${currentTournament.name}"? Tutti i dati correlati verranno rimossi.`,
    header: 'Conferma eliminazione',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Annulla',
    acceptLabel: 'Elimina',
    acceptSeverity: 'danger',
    accept: async () => {
      try {
        await tournamentsStore.remove(currentTournament.id)
        toast.add({ severity: 'success', summary: 'Eliminato', detail: `${currentTournament.name} rimosso`, life: 3000 })
        await router.push({ name: 'tournaments' })
      } catch (error) {
        toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
      }
    },
  })
}

async function publishToggle(): Promise<void> {
  if (auth.isGuest || !tournament.value) return
  await tournamentsStore.setPublished(tournament.value.id, !tournament.value.published)
  await reloadTournament()
}

async function setTournamentStatus(status: TournamentStatus): Promise<void> {
  if (auth.isGuest || !tournament.value || tournament.value.status === status) return
  updatingStatus.value = true
  try {
    await tournamentsStore.update(tournament.value.id, { status })
    await reloadTournament()
    toast.add({
      severity: 'success',
      summary: 'Aggiornato',
      detail: `Torneo segnato come ${{ upcoming: 'in programma', ongoing: 'in corso', completed: 'completato' }[status]}`,
      life: 3000,
    })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    updatingStatus.value = false
  }
}

onMounted(loadPage)

// -----------------------------------------------------------------------------
// Child-route context
// RouterView is rendered only after the tournament exists. The computed ref can
// therefore expose a non-null contract and keep child components reactive.
// -----------------------------------------------------------------------------
provide(tournamentDetailKey, {
  tournament: computed(() => {
    if (!tournament.value) throw new Error('Tournament is not loaded')
    return tournament.value
  }),
  reloadTournament,
})
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <div class="mx-auto flex max-w-screen-2xl flex-col gap-3 text-(--color-text) sm:gap-4">
    <!------------------------------>
    <!-- Section: Loading tournament -->
    <!------------------------------>
    <div v-if="loading" class="flex min-h-90 flex-col items-center justify-center gap-3 text-xs text-muted-color" role="status">
      <ProgressSpinner class="size-10" stroke-width="4" />
      <span>Prepariamo il campo…</span>
    </div>

    <template v-else-if="tournament">
      <!------------------------------>
      <!-- Section: Tournament hero -->
      <!------------------------------>
      <TournamentDetailHero
        :tournament="tournament"
        :enrolled-players-count="enrolledPlayersCount"
        :can-modify="canModify"
        :can-view-admin="canViewAdmin"
        :guest="auth.isGuest"
        :updating-status="updatingStatus"
        :actions="tournamentActions"
        @back="router.push({ name: 'tournaments' })"
        @edit="openEdit"
        @status-change="setTournamentStatus"
      />

      <!------------------------------>
      <!-- Section: Tournament subpages -->
      <!------------------------------>
      <nav class="flex overflow-x-auto border border-(--color-border) bg-(--color-surface-card) p-1" aria-label="Sezioni torneo">
        <RouterLink
          :to="{ name: 'tournament-draw', params: { id: tournament.id } }"
          class="flex min-w-max items-center gap-2 px-4 py-2.5 text-sm font-semibold text-muted-color transition-colors hover:bg-surface-50 hover:text-color"
          active-class="bg-primary-50 text-primary-700"
        >
          <i class="pi pi-sitemap" />
          Tabellone e incontri
        </RouterLink>
        <RouterLink
          :to="{ name: 'tournament-players', params: { id: tournament.id } }"
          class="flex min-w-max items-center gap-2 px-4 py-2.5 text-sm font-semibold text-muted-color transition-colors hover:bg-surface-50 hover:text-color"
          active-class="bg-primary-50 text-primary-700"
        >
          <i class="pi pi-users" />
          Giocatori iscritti ({{ enrolledPlayersCount }})
        </RouterLink>
      </nav>

      <main class="border border-(--color-border) bg-(--color-surface-card) p-3 shadow-sm sm:p-5">
        <RouterView />
      </main>
    </template>
  </div>
</template>
