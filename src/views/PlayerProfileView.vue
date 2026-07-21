<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import moment from 'moment'
import 'moment/locale/it.js'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '@/stores/auth'
import { usePlayersStore } from '@/stores/players'
import type { Player, PlayerMatchHistory } from '@/types'

// Route services, stores and profile state.
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const store = usePlayersStore()
const confirm = useConfirm()
const toast = useToast()
const player = ref<Player | null>(null)
const matchHistory = ref<PlayerMatchHistory>({ stats: { played: 0, wins: 0, losses: 0, win_rate: 0 }, recent_form: [], recent_matches: [] })
const loading = ref(true)

const fullName = computed(() => player.value?.name ?? '')
const personalDetails = computed(() => player.value ? [
  { icon: 'pi pi-calendar', label: 'DATA DI NASCITA', value: formatDate(player.value.birth_date) },
  { icon: 'pi pi-clock', label: 'ETÀ', value: formatAge(player.value.birth_date) },
  { icon: 'pi pi-building-columns', label: 'CLUB', value: player.value.club ?? '—' },
  { icon: 'pi pi-phone', label: 'CONTATTO', value: player.value.phone ?? '—' },
] : [])
const summaryStats = computed(() => [
  { label: 'GIOCATE', value: matchHistory.value.stats.played },
  { label: 'VITTORIE', value: matchHistory.value.stats.wins },
  { label: 'SCONFITTE', value: matchHistory.value.stats.losses },
  { label: 'VITTORIE %', value: `${matchHistory.value.stats.win_rate}%` },
])

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const date = moment(value, moment.ISO_8601, true)
  return date.isValid() ? date.locale('it').format('DD MMM YYYY') : '—'
}

function formatAge(value: string | null | undefined): string {
  if (!value) return 'Età non disponibile'
  const date = moment(value, moment.ISO_8601, true)
  return date.isValid() ? `${moment().diff(date, 'years')} anni` : 'Età non disponibile'
}

function getInitials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
}

async function loadPlayer(): Promise<void> {
  loading.value = true
  try {
    const playerId = route.params['id'] as string
    const [loadedPlayer, loadedHistory] = await Promise.all([
      store.getById(playerId),
      store.getMatchHistory(playerId),
    ])
    player.value = loadedPlayer
    matchHistory.value = loadedHistory
  } catch {
    toast.add({ severity: 'error', summary: 'Errore', detail: 'Giocatore non trovato', life: 3000 })
    await router.push({ name: 'players' })
  } finally {
    loading.value = false
  }
}

function confirmDelete(): void {
  if (!auth.isAdmin || !player.value) return
  confirm.require({
    message: `Eliminare ${player.value.name}?`,
    header: 'Conferma eliminazione',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Annulla',
    acceptLabel: 'Elimina',
    acceptSeverity: 'danger',
    accept: async () => {
      if (!player.value) return
      try {
        await store.remove(player.value.id)
        toast.add({ severity: 'success', summary: 'Eliminato', detail: `${player.value.name} rimosso`, life: 3000 })
        await router.push({ name: 'players' })
      } catch (error) {
        toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
      }
    },
  })
}

watch(() => route.params['id'], loadPlayer, { immediate: true })
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <div class="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 text-(--color-text) sm:gap-6">
    <!-- Section: Header -->
    <header><Button class="-ml-3 mb-2" label="Tutti i giocatori" icon="pi pi-arrow-left" text severity="secondary" @click="router.push({ name: 'players' })" /><p class="mb-2 hidden text-xs font-extrabold tracking-[0.16em] text-primary-700 sm:block">SCHEDA ATLETA</p><h1 class="text-3xl font-bold tracking-tight sm:text-5xl">Profilo giocatore</h1><p class="mt-3 hidden text-(--color-text-muted) sm:block">Identità, contatti e informazioni sportive.</p></header>

    <!-- Section: Loading profile -->
    <div v-if="loading" class="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]"><div class="flex items-center gap-5 border border-(--color-border) bg-(--color-surface-card) p-5"><Skeleton shape="circle" size="8rem" /><div class="grid gap-3"><Skeleton width="7rem" height="1.5rem" /><Skeleton width="15rem" height="2.5rem" /><Skeleton width="10rem" height="1rem" /></div></div><div class="grid gap-3 border border-(--color-border) bg-(--color-surface-card) p-5"><Skeleton width="8rem" height="1.5rem" /><Skeleton v-for="item in 4" :key="item" width="100%" height="3.5rem" /></div></div>

    <div v-else-if="!player" class="flex min-h-75 flex-col items-center justify-center border border-dashed border-(--color-border) bg-(--color-surface-soft) text-center"><span class="grid size-14 place-items-center rounded-full bg-primary-50 text-xl text-primary-700"><i class="pi pi-user-minus" /></span><h3 class="mt-4 text-xl font-bold">Giocatore non trovato</h3><p class="mt-2 text-sm text-(--color-text-muted)">Il profilo richiesto non è disponibile.</p></div>

    <div v-else class="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
      <!------------------------------>
      <!-- Section: Player hero -->
      <!------------------------------>
      <section class="grid items-center gap-4 overflow-hidden border border-(--color-border) bg-primary-800 p-4 text-white shadow-sm sm:grid-cols-[auto_1fr] sm:p-8">
        <Avatar :label="getInitials(player.name)" :image="player.photo_url ?? undefined" shape="circle" class="size-20! border-4! border-white/15! bg-surface-100! text-xl! text-(--color-text-muted)! shadow-xl sm:size-36! sm:text-3xl!" />
        <div class="min-w-0"><h2 class="truncate text-3xl font-bold tracking-tight sm:text-5xl">{{ fullName }}</h2><div class="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/70"><span class="flex items-center gap-2"><i class="pi pi-building-columns" /> {{ player.club ?? 'Club non specificato' }}</span><strong class="text-(--color-accent)">#{{ player.ranking || '—' }}</strong></div></div>
        <div class="col-span-full mt-2 grid grid-cols-3 border-t border-white/10 pt-4">
          <div v-for="stat in [{ label: 'POSIZIONE', value: `#${player.ranking || '—'}`, copy: 'Ranking del club' }, { label: 'ETÀ', value: player.birth_date ? formatAge(player.birth_date).replace(' anni', '') : '—', copy: player.birth_date ? 'anni' : 'Non disponibile' }, { label: 'STATO', value: 'Attivo', copy: 'Profilo registrato' }]" :key="stat.label" class="grid gap-1 border-r border-white/10 px-2 last:border-0 sm:px-4"><small class="text-[0.6rem] font-extrabold tracking-widest text-white/40">{{ stat.label }}</small><strong class="text-lg">{{ stat.value }}</strong><span class="text-xs text-white/40">{{ stat.copy }}</span></div>
        </div>
      </section>

      <!------------------------------>
      <!-- Section: Personal details -->
      <!------------------------------>
      <section class="border border-(--color-border) bg-(--color-surface-card) p-4 shadow-sm sm:p-5">
        <header class="mb-4 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center"><div class="flex items-center gap-3"><span class="grid size-10 shrink-0 place-items-center bg-primary-50 text-primary-700"><i class="pi pi-id-card" /></span><div><h2 class="font-bold">Informazioni personali</h2><p class="mt-1 text-xs text-(--color-text-subtle)">Dati anagrafici e contatti</p></div></div><Button v-if="auth.isAdmin" label="Modifica profilo" icon="pi pi-pencil" severity="secondary" outlined @click="router.push({ name: 'player-edit', params: { id: player.id } })" /></header>
        <div class="grid gap-2"><div v-for="detail in personalDetails" :key="detail.label" class="flex items-center gap-3 bg-(--color-surface-soft) p-3"><span class="grid size-8 shrink-0 place-items-center bg-(--color-surface-card) text-xs text-primary-400 shadow-sm"><i :class="detail.icon" /></span><div class="grid min-w-0"><small class="text-[0.6rem] font-extrabold tracking-wider text-(--color-text-subtle)">{{ detail.label }}</small><strong class="truncate text-sm text-(--color-text-muted)">{{ detail.value }}</strong></div></div></div>
      </section>

      <!------------------------------>
      <!-- Section: Match activity -->
      <!------------------------------>
      <section class="border border-(--color-border) bg-(--color-surface-card) p-4 shadow-sm lg:col-span-2 sm:p-5">
        <header class="mb-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center"><div class="flex items-center gap-3"><span class="grid size-10 shrink-0 place-items-center bg-primary-50 text-primary-700"><i class="pi pi-chart-line" /></span><div><h2 class="font-bold">Risultati e statistiche</h2><p class="mt-1 text-xs text-(--color-text-subtle)">Andamento nelle partite completate</p></div></div><div v-if="matchHistory.recent_form.length" class="flex gap-1" aria-label="Forma recente"><span v-for="(outcome, index) in matchHistory.recent_form" :key="index" class="grid size-7 place-items-center text-xs font-extrabold" :class="outcome === 'win' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'">{{ outcome === 'win' ? 'V' : 'S' }}</span></div></header>
        <div class="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><div v-for="stat in summaryStats" :key="stat.label" class="grid gap-1 border border-(--color-border) bg-(--color-surface-soft) p-3"><small class="text-[0.6rem] font-extrabold tracking-wider text-(--color-text-subtle)">{{ stat.label }}</small><strong class="text-xl">{{ stat.value }}</strong></div></div>

        <div v-if="matchHistory.recent_matches.length" class="grid border-t border-(--color-border)">
          <button v-for="recentMatch in matchHistory.recent_matches" :key="recentMatch.id" type="button" class="grid min-h-17 grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-2 border-b border-(--color-border) px-1 py-2 text-left hover:bg-(--color-surface-soft) sm:grid-cols-[auto_auto_minmax(0,1fr)_auto_auto] sm:gap-3" @click="router.push({ name: 'match-detail', params: { id: recentMatch.tournament_id, matchId: recentMatch.id } })">
            <span class="grid size-7 place-items-center text-xs font-extrabold" :class="recentMatch.outcome === 'win' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'">{{ recentMatch.outcome === 'win' ? 'V' : 'S' }}</span><Avatar :label="getInitials(recentMatch.opponent_name)" :image="recentMatch.opponent_photo_url ?? undefined" shape="circle" class="size-9! bg-(--color-surface-muted)! text-xs!" /><span class="grid min-w-0"><small class="truncate text-xs text-(--color-text-subtle)">{{ recentMatch.tournament_name }}</small><strong class="truncate text-sm">vs {{ recentMatch.opponent_name }}</strong></span><span class="grid min-w-0 text-left sm:text-right"><strong class="text-sm">{{ recentMatch.result }}</strong><small class="text-xs text-(--color-text-subtle)">{{ formatDate(recentMatch.played_at) }}</small></span><i class="pi pi-chevron-right hidden text-xs text-(--color-text-subtle) sm:block" />
          </button>
        </div>
        <div v-else class="flex min-h-24 items-center justify-center gap-3 bg-(--color-surface-soft) text-(--color-text-subtle)"><i class="pi pi-chart-line text-xl" /><span class="grid"><strong class="text-sm text-(--color-text-muted)">Nessuna partita completata</strong><small class="text-xs">Le statistiche appariranno dopo il primo risultato.</small></span></div>
      </section>

      <!-- Section: System data -->
      <section class="hidden border border-(--color-border) bg-(--color-surface-card) p-5 shadow-sm md:block lg:col-span-2"><header class="mb-4 flex items-center gap-3"><span class="grid size-10 place-items-center bg-(--color-surface-muted) text-(--color-text-muted)"><i class="pi pi-database" /></span><div><h2 class="font-bold">Dati di sistema</h2><p class="mt-1 text-xs text-(--color-text-subtle)">Collegamenti tecnici del profilo</p></div></header><div class="grid gap-3 md:grid-cols-3"><div v-for="data in [{ label: 'ID GIOCATORE', value: player.id }, { label: 'ID UTENTE COLLEGATO', value: player.user_id ?? 'Non collegato' }, { label: 'IMMAGINE PROFILO', value: player.photo_url ? 'Immagine personalizzata' : 'Avatar con iniziali' }]" :key="data.label" class="grid min-w-0 gap-2 border border-(--color-surface-muted) bg-(--color-surface-soft) p-3"><small class="text-[0.6rem] font-extrabold tracking-wider text-(--color-text-subtle)">{{ data.label }}</small><code class="truncate text-xs text-(--color-text-muted)">{{ data.value }}</code></div></div></section>

      <!-- Section: Administrative danger zone -->
      <section v-if="auth.isAdmin" class="flex flex-col items-stretch justify-between gap-4 border border-red-100 bg-(--color-surface-muted) p-4 lg:col-span-2 sm:flex-row sm:items-center"><div class="flex items-center gap-3"><span class="grid size-10 shrink-0 place-items-center bg-red-50 text-red-700"><i class="pi pi-exclamation-triangle" /></span><div><h3 class="font-bold">Zona amministrativa</h3><p class="mt-1 text-xs text-(--color-text-subtle)">L’eliminazione del giocatore è permanente e non può essere annullata.</p></div></div><Button label="Elimina giocatore" icon="pi pi-trash" severity="danger" text @click="confirmDelete" /></section>
    </div>
  </div>
</template>
