<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import TournamentDetailHero from '@/components/tournaments/TournamentDetailHero.vue'
import { tournamentDetailKey } from '@/components/tournaments/tournamentDetailContext'
import { useAuthStore } from '@/stores/auth'
import { useLayoutStore } from '@/stores/layout'
import { useTournamentsStore } from '@/stores/tournaments'
import type { TournamentStatus, TournamentWithPlayers } from '@/types'

// -----------------------------------------------------------------------------
// Route services and shared application state
// -----------------------------------------------------------------------------
const route = useRoute()
const router = useRouter()
const tournamentsStore = useTournamentsStore()
const auth = useAuthStore()
const layout = useLayoutStore()
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
const downloadingRegulation = ref(false)

const enrolledPlayersCount = computed(() => {
  if (!tournament.value) return 0
  return tournament.value.playerIds?.length ?? tournament.value.tournament_players?.length ?? 0
})
const canViewAdmin = computed(() => auth.isAdmin)
const canModify = computed(() => !auth.isGuest)
// PrimeVue Menu consumes a declarative list. Commands remain here because they
// modify the shared tournament and therefore affect both subpages.
const tournamentActions = computed(() => {
  const actions = []

  if (tournament.value?.status === 'ongoing') {
    actions.push(
      {
        label: 'Chiudi torneo',
        icon: 'pi pi-check-circle',
        disabled: updatingStatus.value,
        command: confirmCloseTournament,
      },
      { separator: true },
    )
  }

  actions.push(
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
  )

  return actions
})

// -----------------------------------------------------------------------------
// Loading and synchronization
// Child pages call this function after a mutation so the hero and navigation
// counters never display stale tournament data.
// -----------------------------------------------------------------------------
async function reloadTournament(): Promise<void> {
  tournament.value = await tournamentsStore.getById(route.params['id'] as string)
  layout.setTopbarContext({
    title: tournament.value.name,
    backTo: '/tournaments',
    backLabel: 'Torna a tutti i tornei',
  })
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

async function downloadRegulation(): Promise<void> {
  if (!tournament.value?.regulation_name) return
  downloadingRegulation.value = true
  try {
    const blob = await tournamentsStore.downloadRegulation(tournament.value.id)
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = tournament.value.regulation_name
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Download non riuscito', detail: (error as Error).message, life: 4000 })
  } finally {
    downloadingRegulation.value = false
  }
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

function confirmCloseTournament(): void {
  if (!tournament.value) return
  confirm.require({
    message: `Chiudere il torneo "${tournament.value.name}"? Il torneo verrà segnato come completato.`,
    header: 'Chiudi torneo',
    icon: 'pi pi-check-circle',
    rejectLabel: 'Annulla',
    acceptLabel: 'Chiudi torneo',
    acceptSeverity: 'danger',
    accept: () => void setTournamentStatus('completed'),
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
onBeforeUnmount(layout.clearTopbarContext)

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
        :downloading-regulation="downloadingRegulation"
        :actions="tournamentActions"
        @download-regulation="downloadRegulation"
        @edit="openEdit"
        @status-change="setTournamentStatus"
      />

      <!------------------------------>
      <!-- Section: Tournament content -->
      <!------------------------------>
      <main class="rounded-lg border border-(--color-border) bg-(--color-surface-card) p-3 sm:p-5">
        <header v-if="route.name === 'tournament-players'" class="mb-4 border-b border-(--color-border) pb-4">
          <RouterLink
            :to="{ name: 'tournament-draw', params: { id: tournament.id } }"
            class="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-colors hover:text-primary-700"
          >
            <i class="pi pi-arrow-left" aria-hidden="true" />
            Torna al tabellone
          </RouterLink>
          <h2 class="mt-3 text-xl font-bold tracking-tight text-color">Giocatori iscritti</h2>
          <p class="mt-1 text-sm text-muted-color">Consulta e gestisci i partecipanti del torneo.</p>
        </header>
        <RouterView />
      </main>
    </template>
  </div>
</template>
