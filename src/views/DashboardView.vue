<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import moment from 'moment'
import 'moment/locale/it.js'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import Tag from 'primevue/tag'
import DashboardStatCard from '@/components/dashboard/DashboardStatCard.vue'
import DashboardTournamentItem from '@/components/dashboard/DashboardTournamentItem.vue'
import { playersService } from '@/services/playersApi'
import { requestsService } from '@/services/requestsApi'
import { tournamentsService } from '@/services/tournamentsApi'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationsStore } from '@/stores/organizations'
import type {
  OrganizationRequest,
  Player,
  PlayerMatchHistory,
  Tournament,
} from '@/types'

interface DashboardPriority {
  key: string
  icon: string
  title: string
  description: string
  to: RouteLocationRaw
}

interface DashboardQuickAction {
  label: string
  description: string
  icon: string
  to: RouteLocationRaw
}

const auth = useAuthStore()
const organizations = useOrganizationsStore()

const tournaments = ref<Tournament[]>([])
const requests = ref<OrganizationRequest[]>([])
const playersTotal = ref(0)
const player = ref<Player | null>(null)
const playerHistory = ref<PlayerMatchHistory | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

const firstName = computed(() => {
  const value = auth.user?.name?.trim() || auth.user?.email?.split('@')[0] || 'giocatore'
  return value.split(/\s+/)[0] ?? value
})
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Buongiorno'
  if (hour < 18) return 'Buon pomeriggio'
  return 'Buonasera'
})
const contextLabel = computed(() => organizations.activeOrganization?.name ?? 'tutti i tuoi contenuti')
const dashboardDescription = computed(() => {
  if (auth.isAdmin) return `Controlla le priorità di ${contextLabel.value} e porta avanti la competizione.`
  if (auth.isGuest) return 'Scopri tornei, giocatori e attività della community.'
  return `Segui i tornei di ${contextLabel.value} e la tua attività sportiva.`
})

const ongoingTournaments = computed(() => tournaments.value.filter((item) => item.status === 'ongoing'))
const upcomingTournaments = computed(() => tournaments.value.filter((item) => item.status === 'upcoming'))
const draftTournaments = computed(() => tournaments.value.filter((item) => !item.published))
const activeRequests = computed(() => requests.value.filter((item) => ['open', 'planned', 'in_progress'].includes(item.status)))
const registrationOpenTournaments = computed(() => tournaments.value.filter((item) => {
  if (!item.published || item.status !== 'upcoming') return false
  const today = moment()
  const starts = item.registration_start_date ? moment(item.registration_start_date) : null
  const ends = item.registration_end_date ? moment(item.registration_end_date) : null
  return (!starts?.isValid() || !today.isBefore(starts, 'day'))
    && (!ends?.isValid() || !today.isAfter(ends, 'day'))
}))
const relevantTournaments = computed(() => [...tournaments.value]
  .filter((item) => item.status !== 'completed')
  .sort((left, right) => {
    if (left.status !== right.status) return left.status === 'ongoing' ? -1 : 1
    const leftDate = left.start_date ? moment(left.start_date).valueOf() : Number.MAX_SAFE_INTEGER
    const rightDate = right.start_date ? moment(right.start_date).valueOf() : Number.MAX_SAFE_INTEGER
    return leftDate - rightDate
  })
  .slice(0, 4))

const stats = computed(() => {
  if (auth.isAdmin) {
    return [
      { label: 'In corso', value: ongoingTournaments.value.length, icon: 'pi pi-play-circle', hint: 'tornei' },
      { label: 'In programma', value: upcomingTournaments.value.length, icon: 'pi pi-calendar-clock', hint: 'tornei' },
      { label: 'Giocatori', value: playersTotal.value, icon: 'pi pi-users', hint: 'nel contesto' },
      { label: 'Richieste attive', value: activeRequests.value.length, icon: 'pi pi-lightbulb', hint: organizations.activeOrganization ? 'da valutare' : 'seleziona un club' },
    ]
  }
  return [
    { label: 'Iscrizioni aperte', value: registrationOpenTournaments.value.length, icon: 'pi pi-user-plus', hint: 'tornei' },
    { label: 'In corso', value: ongoingTournaments.value.length, icon: 'pi pi-play-circle', hint: 'tornei' },
    { label: 'Partite giocate', value: playerHistory.value?.stats.played ?? 0, icon: 'pi pi-chart-line', hint: auth.isGuest ? 'accedi per i dati' : 'personali' },
    { label: 'Vittorie', value: playerHistory.value ? `${playerHistory.value.stats.win_rate}%` : '—', icon: 'pi pi-trophy', hint: 'percentuale' },
  ]
})

const priorities = computed<DashboardPriority[]>(() => {
  const items: DashboardPriority[] = []
  if (auth.isAdmin) {
    if (ongoingTournaments.value.length > 0) {
      const tournament = ongoingTournaments.value[0]!
      items.push({
        key: 'ongoing',
        icon: 'pi pi-bolt',
        title: `${ongoingTournaments.value.length} ${ongoingTournaments.value.length === 1 ? 'torneo in corso' : 'tornei in corso'}`,
        description: 'Controlla incontri e risultati ancora da registrare.',
        to: { name: 'tournament-detail', params: { id: tournament.id } },
      })
    }
    if (draftTournaments.value.length > 0) {
      items.push({
        key: 'drafts',
        icon: 'pi pi-eye-slash',
        title: `${draftTournaments.value.length} ${draftTournaments.value.length === 1 ? 'torneo da pubblicare' : 'tornei da pubblicare'}`,
        description: 'Completa le informazioni e rendi visibili le iscrizioni.',
        to: { name: 'tournaments' },
      })
    }
    if (activeRequests.value.length > 0 && organizations.activeOrganization) {
      items.push({
        key: 'requests',
        icon: 'pi pi-inbox',
        title: `${activeRequests.value.length} ${activeRequests.value.length === 1 ? 'richiesta attiva' : 'richieste attive'}`,
        description: 'Valuta le segnalazioni e aggiorna il loro avanzamento.',
        to: { name: 'requests' },
      })
    }
  } else {
    if (registrationOpenTournaments.value.length > 0) {
      const tournament = registrationOpenTournaments.value[0]!
      items.push({
        key: 'registrations',
        icon: 'pi pi-user-plus',
        title: 'Iscrizioni aperte',
        description: `${registrationOpenTournaments.value.length} ${registrationOpenTournaments.value.length === 1 ? 'torneo disponibile' : 'tornei disponibili'} per la tua prossima sfida.`,
        to: { name: 'tournament-detail', params: { id: tournament.id } },
      })
    }
    if (!auth.isGuest && !player.value) {
      items.push({
        key: 'player-profile',
        icon: 'pi pi-id-card',
        title: 'Completa la tua attività sportiva',
        description: 'La scheda giocatore verrà creata alla tua prima iscrizione.',
        to: { name: 'tournaments' },
      })
    }
  }
  return items.slice(0, 3)
})

const quickActions = computed<DashboardQuickAction[]>(() => {
  if (auth.isAdmin) {
    return [
      { label: 'Nuovo torneo', description: 'Configura formato e iscrizioni', icon: 'pi pi-plus', to: { name: 'tournament-create' } },
      { label: 'Nuovo giocatore', description: 'Aggiungi una scheda atleta', icon: 'pi pi-user-plus', to: { name: 'player-create' } },
      organizations.activeOrganization
        ? { label: 'Richieste', description: 'Gestisci il backlog del club', icon: 'pi pi-lightbulb', to: { name: 'requests' } }
        : { label: 'Organizzazioni', description: 'Gestisci i tuoi spazi', icon: 'pi pi-building', to: { name: 'organizations' } },
    ]
  }
  return [
    { label: 'Trova un torneo', description: 'Scopri le prossime competizioni', icon: 'pi pi-search', to: { name: 'tournaments' } },
    { label: 'Giocatori', description: 'Consulta ranking e profili', icon: 'pi pi-users', to: { name: 'players' } },
    auth.isGuest
      ? { label: 'Organizzazioni', description: 'Esplora i club disponibili', icon: 'pi pi-map', to: { name: 'organizations-explore' } }
      : { label: 'Il mio profilo', description: 'Risultati e preferenze', icon: 'pi pi-user', to: { name: 'profile' } },
  ]
})

function requestStatusLabel(status: OrganizationRequest['status']): string {
  return {
    open: 'Aperta',
    planned: 'Pianificata',
    in_progress: 'In lavorazione',
    done: 'Completata',
    rejected: 'Rifiutata',
  }[status]
}

function requestStatusSeverity(status: OrganizationRequest['status']): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  if (status === 'done') return 'success'
  if (status === 'in_progress') return 'info'
  if (status === 'planned') return 'warn'
  if (status === 'rejected') return 'danger'
  return 'secondary'
}

async function loadPersonalActivity(): Promise<void> {
  if (auth.isGuest || auth.isAdmin) return
  player.value = await playersService.getMyPlayer()
  if (player.value) playerHistory.value = await playersService.getMatchHistory(player.value.id)
}

async function loadDashboard(): Promise<void> {
  loading.value = true
  error.value = null
  const organizationId = organizations.activeId ?? 'mine'
  const [tournamentsResult, playersResult, requestsResult, personalResult] = await Promise.allSettled([
    tournamentsService.getAll({ page: 0, perPage: 100, organizationId }),
    playersService.getAll({ page: 0, perPage: 1, organizationId }),
    organizations.activeOrganization && !auth.isGuest ? requestsService.getAll() : Promise.resolve([]),
    loadPersonalActivity(),
  ])

  if (tournamentsResult.status === 'fulfilled') tournaments.value = tournamentsResult.value.values
  else error.value = 'Non siamo riusciti a caricare i tornei della dashboard.'
  if (playersResult.status === 'fulfilled') playersTotal.value = playersResult.value.total
  if (requestsResult.status === 'fulfilled') requests.value = requestsResult.value
  if (personalResult.status === 'rejected' && !error.value) error.value = 'Alcune informazioni personali non sono disponibili.'
  loading.value = false
}

onMounted(loadDashboard)
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <main class="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 text-(--color-text) sm:gap-5">
    <!------------------------------>
    <!-- Section: Control room hero -->
    <!------------------------------>
    <header class="overflow-hidden rounded-xl bg-linear-to-br from-(--color-sidebar-start) to-(--color-sidebar-end) p-5 text-white sm:p-7 lg:p-8">
      <div class="grid items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
        <div class="min-w-0">
          <p class="mb-2 text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-(--color-accent)">Control room</p>
          <h1 class="text-3xl font-bold leading-tight tracking-tighter sm:text-4xl lg:text-5xl">{{ greeting }}, {{ firstName }}</h1>
          <p class="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">{{ dashboardDescription }}</p>
        </div>
        <div class="flex flex-col gap-2 sm:flex-row lg:justify-end">
          <Button
            v-if="auth.isAdmin"
            label="Nuovo torneo"
            icon="pi pi-plus"
            class="border-(--color-accent)! bg-(--color-accent)! text-(--color-primary-900)!"
            @click="$router.push({ name: 'tournament-create' })"
          />
          <Button
            v-else
            label="Esplora tornei"
            icon="pi pi-arrow-right"
            icon-pos="right"
            class="border-white/20! bg-white/10! text-white! hover:bg-white/15!"
            @click="$router.push({ name: 'tournaments' })"
          />
        </div>
      </div>
      <div class="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-white/10 pt-4 text-xs text-white/55">
        <span class="inline-flex items-center gap-2"><i class="pi pi-filter text-(--color-accent)" /> {{ contextLabel }}</span>
        <span class="inline-flex items-center gap-2"><i class="pi pi-play-circle text-(--color-accent)" /> {{ ongoingTournaments.length }} in corso</span>
        <span class="inline-flex items-center gap-2"><i class="pi pi-calendar text-(--color-accent)" /> {{ upcomingTournaments.length }} in programma</span>
      </div>
    </header>

    <Message v-if="error" severity="warn" :closable="false">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <span>{{ error }}</span>
        <Button label="Riprova" icon="pi pi-refresh" size="small" severity="secondary" text @click="loadDashboard" />
      </div>
    </Message>

    <!------------------------------>
    <!-- Section: Essential indicators -->
    <!------------------------------>
    <section aria-label="Indicatori principali">
      <div v-if="loading" class="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <Skeleton v-for="index in 4" :key="index" height="4.75rem" border-radius="0.75rem" />
      </div>
      <div v-else class="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <DashboardStatCard v-for="stat in stats" :key="stat.label" v-bind="stat" />
      </div>
    </section>

    <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)] xl:gap-5">
      <div class="grid min-w-0 gap-4 sm:gap-5">
        <!------------------------------>
        <!-- Section: Operational priorities -->
        <!------------------------------>
        <section class="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-card)" aria-labelledby="dashboard-priorities-title">
          <header class="flex items-center justify-between gap-4 border-b border-(--color-border) px-4 py-4 sm:px-5">
            <div>
              <p class="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-primary">Oggi</p>
              <h2 id="dashboard-priorities-title" class="mt-1 text-lg font-bold tracking-tight">Priorità</h2>
            </div>
            <span v-if="!loading" class="rounded-full bg-(--color-surface-soft) px-2.5 py-1 text-xs font-bold text-(--color-text-muted)">{{ priorities.length }}</span>
          </header>
          <div v-if="loading" class="grid gap-3 p-4 sm:p-5"><Skeleton height="4rem" /><Skeleton height="4rem" /></div>
          <div v-else-if="priorities.length" class="divide-y divide-(--color-border)">
            <RouterLink
              v-for="item in priorities"
              :key="item.key"
              :to="item.to"
              class="group grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-4 text-inherit no-underline transition-colors hover:bg-(--color-surface-soft) sm:px-5"
            >
              <span class="grid size-10 place-items-center rounded-lg bg-primary-50 text-primary"><i :class="item.icon" /></span>
              <span class="grid min-w-0 gap-0.5">
                <strong class="truncate text-sm group-hover:text-primary sm:text-base">{{ item.title }}</strong>
                <small class="line-clamp-2 text-xs leading-relaxed text-(--color-text-muted)">{{ item.description }}</small>
              </span>
              <i class="pi pi-chevron-right text-xs text-(--color-text-subtle) transition-transform group-hover:translate-x-0.5" />
            </RouterLink>
          </div>
          <div v-else class="grid min-h-36 place-items-center p-6 text-center">
            <div>
              <span class="mx-auto grid size-11 place-items-center rounded-full bg-emerald-50 text-emerald-700"><i class="pi pi-check" /></span>
              <h3 class="mt-3 font-bold">Tutto sotto controllo</h3>
              <p class="mt-1 text-sm text-(--color-text-muted)">Non ci sono attività urgenti in questo momento.</p>
            </div>
          </div>
        </section>

        <!------------------------------>
        <!-- Section: Relevant tournaments -->
        <!------------------------------>
        <section class="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-card)" aria-labelledby="dashboard-tournaments-title">
          <header class="flex items-center justify-between gap-4 border-b border-(--color-border) px-4 py-4 sm:px-5">
            <div>
              <p class="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-primary">Competizioni</p>
              <h2 id="dashboard-tournaments-title" class="mt-1 text-lg font-bold tracking-tight">{{ auth.isAdmin ? 'Tornei da seguire' : 'Prossimi tornei' }}</h2>
            </div>
            <Button label="Vedi tutti" icon="pi pi-arrow-right" icon-pos="right" size="small" text @click="$router.push({ name: 'tournaments' })" />
          </header>
          <div v-if="loading" class="grid gap-3 p-4 sm:p-5"><Skeleton v-for="index in 3" :key="index" height="4rem" /></div>
          <div v-else-if="relevantTournaments.length">
            <DashboardTournamentItem v-for="tournament in relevantTournaments" :key="tournament.id" :tournament="tournament" />
          </div>
          <div v-else class="grid min-h-36 place-items-center p-6 text-center">
            <div>
              <i class="pi pi-calendar text-xl text-(--color-text-subtle)" />
              <p class="mt-2 text-sm text-(--color-text-muted)">Nessun torneo attivo o in programma.</p>
              <Button v-if="auth.isAdmin" class="mt-3" label="Crea il primo torneo" icon="pi pi-plus" size="small" @click="$router.push({ name: 'tournament-create' })" />
            </div>
          </div>
        </section>
      </div>

      <aside class="grid min-w-0 gap-4 sm:gap-5">
        <!------------------------------>
        <!-- Section: Quick actions -->
        <!------------------------------>
        <section class="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-card)" aria-labelledby="dashboard-actions-title">
          <header class="border-b border-(--color-border) px-4 py-4 sm:px-5">
            <h2 id="dashboard-actions-title" class="font-bold">Accessi rapidi</h2>
            <p class="mt-0.5 text-xs text-(--color-text-muted)">Le azioni che usi più spesso.</p>
          </header>
          <nav aria-label="Accessi rapidi">
            <RouterLink
              v-for="action in quickActions"
              :key="action.label"
              :to="action.to"
              class="group grid min-h-17 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-(--color-border) px-4 py-3 text-inherit no-underline transition-colors last:border-b-0 hover:bg-(--color-surface-soft) sm:px-5"
            >
              <span class="grid size-9 place-items-center rounded-lg bg-(--color-surface-soft) text-primary"><i :class="action.icon" /></span>
              <span class="grid min-w-0 gap-0.5"><strong class="text-sm group-hover:text-primary">{{ action.label }}</strong><small class="truncate text-xs text-(--color-text-muted)">{{ action.description }}</small></span>
              <i class="pi pi-chevron-right text-[0.65rem] text-(--color-text-subtle)" />
            </RouterLink>
          </nav>
        </section>

        <!------------------------------>
        <!-- Section: Community activity -->
        <!------------------------------>
        <section v-if="organizations.activeOrganization && !auth.isGuest" class="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-card)" aria-labelledby="dashboard-requests-title">
          <header class="flex items-center justify-between gap-3 border-b border-(--color-border) px-4 py-4 sm:px-5">
            <div>
              <h2 id="dashboard-requests-title" class="font-bold">Attività del club</h2>
              <p class="mt-0.5 text-xs text-(--color-text-muted)">Richieste e segnalazioni recenti.</p>
            </div>
            <Button icon="pi pi-arrow-right" text rounded aria-label="Apri tutte le richieste" @click="$router.push({ name: 'requests' })" />
          </header>
          <div v-if="loading" class="grid gap-3 p-4"><Skeleton height="3rem" /><Skeleton height="3rem" /></div>
          <div v-else-if="requests.length" class="divide-y divide-(--color-border)">
            <RouterLink
              v-for="request in requests.slice(0, 3)"
              :key="request.id"
              :to="{ name: 'request-detail', params: { id: request.id } }"
              class="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 text-inherit no-underline transition-colors hover:bg-(--color-surface-soft) sm:px-5"
            >
              <span class="truncate text-sm font-semibold">{{ request.title }}</span>
              <Tag :value="requestStatusLabel(request.status)" :severity="requestStatusSeverity(request.status)" />
            </RouterLink>
          </div>
          <p v-else class="p-5 text-sm text-(--color-text-muted)">Nessuna richiesta recente.</p>
        </section>

        <!------------------------------>
        <!-- Section: Personal performance -->
        <!------------------------------>
        <section v-if="!auth.isAdmin && !auth.isGuest" class="rounded-xl border border-(--color-border) bg-(--color-surface-card) p-4 sm:p-5">
          <p class="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-primary">La tua stagione</p>
          <template v-if="player && playerHistory">
            <div class="mt-3 flex items-center justify-between gap-4">
              <div class="min-w-0"><h2 class="truncate text-lg font-bold">{{ player.name }}</h2><p class="mt-1 truncate text-xs text-(--color-text-muted)">{{ player.club ?? 'Club non specificato' }}</p></div>
              <strong class="text-3xl tracking-tight">{{ playerHistory.stats.win_rate }}%</strong>
            </div>
            <div class="mt-4 grid grid-cols-3 gap-2 border-t border-(--color-border) pt-4 text-center">
              <div><strong class="block">{{ playerHistory.stats.played }}</strong><small class="text-[0.65rem] text-(--color-text-muted)">Giocate</small></div>
              <div><strong class="block text-emerald-700">{{ playerHistory.stats.wins }}</strong><small class="text-[0.65rem] text-(--color-text-muted)">Vinte</small></div>
              <div><strong class="block">{{ playerHistory.stats.losses }}</strong><small class="text-[0.65rem] text-(--color-text-muted)">Perse</small></div>
            </div>
          </template>
          <div v-else class="mt-3">
            <h2 class="font-bold">Inizia a giocare</h2>
            <p class="mt-1 text-sm leading-relaxed text-(--color-text-muted)">Iscriviti a un torneo: creeremo automaticamente la tua scheda giocatore.</p>
          </div>
        </section>
      </aside>
    </div>
  </main>
</template>
