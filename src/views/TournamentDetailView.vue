<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import type { MenuItem } from 'primevue/menuitem'
import ProgressSpinner from 'primevue/progressspinner'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import TournamentDetailHero from '@/components/tournaments/TournamentDetailHero.vue'
import TournamentEnrollmentPanel from '@/components/tournaments/TournamentEnrollmentPanel.vue'
import { tournamentDetailKey } from '@/components/tournaments/tournamentDetailContext'
import { useAuthStore } from '@/stores/auth'
import { useLayoutStore } from '@/stores/layout'
import { useTournamentsStore } from '@/stores/tournaments'
import type { TournamentEnrollment, TournamentStatus, TournamentWithPlayers } from '@/types'

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
const enrollment = ref<TournamentEnrollment | null>(null)
const loading = ref(true)
const updatingEnrollment = ref(false)
const updatingStatus = ref(false)
const updatingVisibility = ref(false)
const downloadingRegulation = ref(false)
const tournamentActionsMenu = ref<{ toggle: (event: Event) => void } | null>(null)

const enrolledPlayersCount = computed(() => {
  if (!tournament.value) return 0
  return tournament.value.playerIds?.length ?? tournament.value.tournament_players?.length ?? 0
})
const canViewAdmin = computed(() => tournament.value?.can_manage === true)
const isEnrolled = computed(() => enrollment.value?.enrolled ?? false)
const enrolledPlayersLabel = computed(() => {
  const count = enrolledPlayersCount.value
  return `${count} ${count === 1 ? 'giocatore iscritto' : 'giocatori iscritti'}`
})
const tournamentStatusActions = computed<MenuItem[]>(() => [
  { label: 'In programma', value: 'upcoming' as const, icon: 'pi pi-clock' },
  { label: 'In corso', value: 'ongoing' as const, icon: 'pi pi-play-circle' },
  { label: 'Completato', value: 'completed' as const, icon: 'pi pi-check-circle' },
].map((option) => ({
  label: option.label,
  icon: tournament.value?.status === option.value ? 'pi pi-check' : option.icon,
  disabled: updatingStatus.value || tournament.value?.status === option.value,
  command: () => requestTournamentStatusChange(option.value),
})))
// PrimeVue Menu consumes a declarative list. Commands remain here because they
// modify the shared tournament and therefore affect both subpages.
const tournamentActions = computed<MenuItem[]>(() => {
  const actions: MenuItem[] = []

  if (canViewAdmin.value) {
    actions.push({
      label: 'Stato torneo',
      icon: 'pi pi-flag',
      items: tournamentStatusActions.value,
    })
    actions.push({
      label: tournament.value?.published ? 'Nascondi torneo' : 'Pubblica torneo',
      icon: tournament.value?.published ? 'pi pi-eye-slash' : 'pi pi-eye',
      disabled: updatingVisibility.value,
      command: publishToggle,
    })
  }

  if (canViewAdmin.value) {
    if (actions.length > 0) actions.push({ separator: true })
    actions.push({
      label: 'Modifica torneo',
      icon: 'pi pi-pencil',
      command: openEdit,
    })
  }

  if (tournament.value?.regulation_name && !auth.isGuest) {
    if (!canViewAdmin.value && actions.length > 0) actions.push({ separator: true })
    actions.push({
      label: 'Scarica regolamento',
      icon: 'pi pi-download',
      disabled: downloadingRegulation.value,
      command: downloadRegulation,
    })
  }

  if (!canViewAdmin.value) return actions

  actions.push({ separator: true })
  actions.push({
    label: 'Elimina torneo',
    icon: 'pi pi-trash',
    class: 'text-red-600',
    command: confirmDelete,
  })

  return actions
})

function toggleTournamentActions(event: Event): void {
  tournamentActionsMenu.value?.toggle(event)
}

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
    loading.value = false
    return
  }

  if (!auth.isGuest) {
    try {
      enrollment.value = await tournamentsStore.getEnrollment(route.params['id'] as string)
    } catch (error) {
      toast.add({
        severity: 'error',
        summary: 'Iscrizione non disponibile',
        detail: (error as Error).message,
        life: 4000,
      })
    }
  }
  loading.value = false
}

async function enrollInTournament(): Promise<void> {
  if (!tournament.value || updatingEnrollment.value) return
  updatingEnrollment.value = true
  try {
    enrollment.value = await tournamentsStore.enroll(tournament.value.id)
    await reloadTournament()
    toast.add({
      severity: 'success',
      summary: 'Iscrizione confermata',
      detail: `Sei iscritto a ${tournament.value.name}.`,
      life: 3500,
    })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Iscrizione non riuscita', detail: (error as Error).message, life: 4500 })
  } finally {
    updatingEnrollment.value = false
  }
}

function confirmWithdrawal(): void {
  if (!tournament.value || updatingEnrollment.value) return
  const currentTournament = tournament.value
  confirm.require({
    message: `Ritirare la tua iscrizione da "${currentTournament.name}"?`,
    header: 'Conferma ritiro',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Annulla',
    acceptLabel: 'Ritira iscrizione',
    acceptSeverity: 'danger',
    accept: () => void withdrawFromTournament(currentTournament),
  })
}

async function withdrawFromTournament(currentTournament: TournamentWithPlayers): Promise<void> {
  updatingEnrollment.value = true
  try {
    enrollment.value = await tournamentsStore.withdraw(currentTournament.id)
    await reloadTournament()
    toast.add({
      severity: 'success',
      summary: 'Iscrizione ritirata',
      detail: `Non partecipi più a ${currentTournament.name}.`,
      life: 3500,
    })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Ritiro non riuscito', detail: (error as Error).message, life: 4500 })
  } finally {
    updatingEnrollment.value = false
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

function requestTournamentStatusChange(status: TournamentStatus): void {
  if (status === 'completed' && tournament.value?.status !== 'completed') {
    confirmCloseTournament()
    return
  }
  void setTournamentStatus(status)
}

async function publishToggle(): Promise<void> {
  if (auth.isGuest || !tournament.value) return
  const nextPublished = !tournament.value.published
  updatingVisibility.value = true
  try {
    await tournamentsStore.setPublished(tournament.value.id, nextPublished)
    await reloadTournament()
    toast.add({
      severity: 'success',
      summary: 'Visibilità aggiornata',
      detail: nextPublished ? 'Il torneo è ora pubblicato.' : 'Il torneo è ora nascosto.',
      life: 3000,
    })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    updatingVisibility.value = false
  }
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
  <div class="mx-auto flex max-w-screen-2xl flex-col gap-3 pb-20 text-(--color-text) sm:gap-4 md:pb-0">
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
        :can-view-admin="canViewAdmin"
        :updating-status="updatingStatus"
        :updating-visibility="updatingVisibility"
        @status-change="requestTournamentStatusChange"
        @visibility-change="publishToggle"
      />

      <!------------------------------>
      <!-- Section: Personal enrolment -->
      <!------------------------------>
      <TournamentEnrollmentPanel
        v-if="!auth.isGuest && enrollment"
        :tournament="tournament"
        :enrolled-players-count="enrolledPlayersCount"
        :is-enrolled="isEnrolled"
        :loading="updatingEnrollment"
        @enroll="enrollInTournament"
        @withdraw="confirmWithdrawal"
      />

      <!------------------------------>
      <!-- Section: Tournament content -->
      <!------------------------------>
      <main class="rounded-lg border border-(--color-border) bg-(--color-surface-card) p-3 sm:p-5">
        <section
          v-if="tournament.status === 'upcoming' && route.name === 'tournament-draw'"
          class="flex flex-col gap-4 rounded-lg bg-(--color-surface-soft) p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
          aria-labelledby="tournament-players-cta-title"
        >
          <div class="flex min-w-0 items-center gap-3">
            <span class="grid size-11 shrink-0 place-items-center rounded-lg bg-primary-50 text-lg text-primary">
              <i class="pi pi-users" aria-hidden="true" />
            </span>
            <div class="min-w-0">
              <h2 id="tournament-players-cta-title" class="font-bold text-color">{{ enrolledPlayersLabel }}</h2>
              <p class="mt-0.5 text-sm text-muted-color">{{ canViewAdmin ? 'Consulta o gestisci i partecipanti confermati.' : 'Scopri chi parteciperà al torneo.' }}</p>
            </div>
          </div>
          <Button
            label="Vedi giocatori iscritti"
            icon="pi pi-arrow-right"
            icon-pos="right"
            severity="secondary"
            outlined
            class="w-full shrink-0 sm:w-auto"
            @click="router.push({ name: 'tournament-players', params: { id: tournament.id } })"
          />
        </section>
        <RouterView v-else />
      </main>
    </template>

    <!------------------------------>
    <!-- Section: Tournament topbar actions -->
    <!------------------------------>
    <Teleport v-if="tournament" to="#app-topbar-context-actions">
      <Button
        v-if="tournamentActions.length > 0"
        icon="pi pi-ellipsis-v"
        severity="secondary"
        text
        rounded
        aria-label="Altre azioni del torneo"
        aria-haspopup="true"
        aria-controls="tournament-actions-menu"
        title="Altre azioni"
        @click="toggleTournamentActions"
      />
      <Menu
        id="tournament-actions-menu"
        ref="tournamentActionsMenu"
        :model="tournamentActions"
        popup
      />
    </Teleport>
  </div>
</template>
