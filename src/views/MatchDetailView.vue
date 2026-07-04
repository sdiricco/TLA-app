<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../stores/auth'
import { useMatchesStore } from '../stores/matches'
import { usePlayersStore } from '../stores/players'
import { useTournamentsStore } from '../stores/tournaments'
import type { Match, Player, TournamentWithPlayers } from '../types'
import { formatAge, getPlayerInitials } from '@/utils/main'

/**
 * Stores and router
 */
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const tournamentsStore = useTournamentsStore()
const playersStore = usePlayersStore()
const matchesStore = useMatchesStore()
const toast = useToast()

/**
 * Local state
 */
const tournament = ref<TournamentWithPlayers | null>(null)
const enrolledPlayers = ref<Player[]>([])
const loading = ref(true)
const savingAssignments = ref(false)
const savingResult = ref(false)
const player1Id = ref<string | null>(null)
const player2Id = ref<string | null>(null)
const resultValue = ref('')
const winnerId = ref<string | null>(null)

/**
 * Computed helpers
 */
const canModify = computed(() => auth.isAdmin && !auth.isGuest)
const match = computed<Match | null>(() =>
  matchesStore.matches.find((entry) => entry.id === (route.params['matchId'] as string)) ?? null,
)
const playerById = computed(() => new Map(enrolledPlayers.value.map((player) => [player.id, player])))
const player1 = computed(() => (match.value?.player1_id ? playerById.value.get(match.value.player1_id) ?? null : null))
const player2 = computed(() => (match.value?.player2_id ? playerById.value.get(match.value.player2_id) ?? null : null))
const effectiveWinnerId = computed(() => {
  return match.value?.winner_id ?? null
})
const roundLabel = computed(() =>
  matchesStore.rounds.find((round) => round.index === match.value?.round_index)?.name ?? 'Turno',
)
const availablePlayer1Options = computed(() => enrolledPlayers.value.filter((player) => player.id !== player2Id.value))
const availablePlayer2Options = computed(() => enrolledPlayers.value.filter((player) => player.id !== player1Id.value))

/**
 * Function: format date for the player cards
 */
function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/**
 * Function: load tournament, match list and enrolled players
 */
async function loadPage(): Promise<void> {
  loading.value = true
  try {
    const tournamentId = route.params['id'] as string
    const loadedTournament = await tournamentsStore.getById(tournamentId)
    tournament.value = loadedTournament
    await matchesStore.loadForTournament(tournamentId)

    const enrolledIds =
      loadedTournament.tournament_players
        ?.slice()
        .sort((left, right) => (left.seed ?? Number.MAX_SAFE_INTEGER) - (right.seed ?? Number.MAX_SAFE_INTEGER))
        .map((entry) => entry.player_id) ?? []

    const loadedPlayers = await Promise.all(
      enrolledIds.map(async (playerId) => {
        try {
          return await playersStore.getById(playerId)
        } catch {
          return null
        }
      }),
    )

    enrolledPlayers.value = loadedPlayers.filter((player): player is Player => Boolean(player))

    if (!match.value) {
      throw new Error('Match not found')
    }

    player1Id.value = match.value.player1_id
    player2Id.value = match.value.player2_id
    resultValue.value = match.value.result ?? ''
    winnerId.value = match.value.winner_id
  } catch {
    toast.add({ severity: 'error', summary: 'Errore', detail: 'Match non trovato', life: 3000 })
    await router.push({ name: 'tournament-detail', params: { id: route.params['id'] as string } })
  } finally {
    loading.value = false
  }
}

watch(
  () => [route.params['id'], route.params['matchId']],
  () => {
    void loadPage()
  },
  { immediate: true },
)

/**
 * Function: save both player assignments from the detail page
 */
async function saveAssignments(): Promise<void> {
  if (!canModify.value || !match.value) return
  savingAssignments.value = true
  try {
    if (player1Id.value !== match.value.player1_id) {
      await matchesStore.assignPlayer(match.value.id, {
        slot: 'player1_id',
        player_id: player1Id.value,
      })
    }

    if (player2Id.value !== match.value.player2_id) {
      await matchesStore.assignPlayer(match.value.id, {
        slot: 'player2_id',
        player_id: player2Id.value,
      })
    }

    await loadPage()
    toast.add({ severity: 'success', summary: 'Salvato', detail: 'Assegnazioni aggiornate', life: 3000 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    savingAssignments.value = false
  }
}

/**
 * Function: save result and selected winner
 */
async function saveResult(): Promise<void> {
  if (!canModify.value || !match.value || !resultValue.value || !winnerId.value) return
  savingResult.value = true
  try {
    await matchesStore.enterResult(match.value.id, {
      result: resultValue.value,
      winner_id: winnerId.value,
    })
    await loadPage()
    toast.add({ severity: 'success', summary: 'Salvato', detail: 'Risultato aggiornato', life: 3000 })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    savingResult.value = false
  }
}

/**
 * Function: render slot placeholders for BYE or TBD
 */
function getSlotName(playerId: string | null): string {
  if (playerId === null) return 'TBD'
  return playerById.value.get(playerId)?.name ?? 'Giocatore non trovato'
}

/**
 * Function: return the current round label for the header
 */
</script>

<template>
  <div class="match-page">
    <header class="page-header">
      <div>
        <button class="back-link" type="button" @click="router.push({ name: 'tournament-detail', params: { id: route.params['id'] } })"><i class="pi pi-arrow-left" /> Torna al torneo</button>
        <p class="eyebrow">MATCH CENTER</p>
        <h1>Dettaglio incontro</h1>
        <p v-if="tournament && match" class="page-subtitle">{{ tournament.name }} · {{ roundLabel }}</p>
      </div>
      <span v-if="match" class="header-status" :class="{ completed: match.status === 'completed' }"><i />{{ match.status === 'completed' ? 'Completato' : 'Da giocare' }}</span>
    </header>

    <div v-if="loading" class="match-loading">
      <i class="pi pi-spin pi-spinner" /><span>Prepariamo il match…</span>
    </div>

    <template v-else-if="match">
      <section class="match-arena">
        <div class="arena-pattern" />
        <div class="arena-topline">
          <span><i class="pi pi-calendar" /> {{ roundLabel }}</span>
          <strong v-if="match.result">{{ match.result }}</strong>
          <span v-else>Risultato da inserire</span>
        </div>

        <div class="players-versus">
          <article class="arena-player" :class="{ winner: effectiveWinnerId === match.player1_id && match.player1_id }">
            <span v-if="effectiveWinnerId === match.player1_id && match.player1_id" class="winner-badge"><i class="pi pi-trophy" /> VINCITORE</span>
            <div class="arena-avatar"><Avatar :label="player1 ? getPlayerInitials(player1) : 'TBD'" :image="player1?.photo_url ?? undefined" shape="circle" /></div>
            <h2>{{ getSlotName(match.player1_id) }}</h2>
            <p><i class="pi pi-building-columns" /> {{ player1?.club ?? 'Club non disponibile' }}</p>
            <div class="player-stats">
              <div><small>RANKING</small><strong>#{{ player1?.ranking ?? '—' }}</strong></div>
              <div><small>ETÀ</small><strong>{{ player1 ? formatAge(player1.birth_date) : '—' }}</strong></div>
              <div><small>NASCITA</small><strong>{{ player1 ? formatDate(player1.birth_date) : '—' }}</strong></div>
            </div>
          </article>

          <div class="versus-center">
            <span>VS</span>
            <i />
          </div>

          <article class="arena-player" :class="{ winner: effectiveWinnerId === match.player2_id && match.player2_id }">
            <span v-if="effectiveWinnerId === match.player2_id && match.player2_id" class="winner-badge"><i class="pi pi-trophy" /> VINCITORE</span>
            <div class="arena-avatar"><Avatar :label="player2 ? getPlayerInitials(player2) : 'TBD'" :image="player2?.photo_url ?? undefined" shape="circle" /></div>
            <h2>{{ getSlotName(match.player2_id) }}</h2>
            <p><i class="pi pi-building-columns" /> {{ player2?.club ?? 'Club non disponibile' }}</p>
            <div class="player-stats">
              <div><small>RANKING</small><strong>#{{ player2?.ranking ?? '—' }}</strong></div>
              <div><small>ETÀ</small><strong>{{ player2 ? formatAge(player2.birth_date) : '—' }}</strong></div>
              <div><small>NASCITA</small><strong>{{ player2 ? formatDate(player2.birth_date) : '—' }}</strong></div>
            </div>
          </article>
        </div>

        <div class="arena-summary">
          <div><span class="summary-icon"><i class="pi pi-sitemap" /></span><p><small>TURNO</small><strong>{{ roundLabel }}</strong></p></div>
          <div><span class="summary-icon"><i class="pi pi-chart-bar" /></span><p><small>RISULTATO</small><strong>{{ match.result ?? 'Non ancora inserito' }}</strong></p></div>
          <div><span class="summary-icon"><i class="pi pi-trophy" /></span><p><small>VINCITORE</small><strong>{{ effectiveWinnerId ? getSlotName(effectiveWinnerId) : 'Da definire' }}</strong></p></div>
        </div>
      </section>

      <section v-if="canModify" class="management-section">
        <header class="management-heading"><span><i class="pi pi-sliders-h" /></span><div><p>GESTIONE INCONTRO</p><h2>Aggiorna il match</h2></div></header>

        <div class="management-grid">
          <form class="management-card" @submit.prevent="saveAssignments">
            <header><span><i class="pi pi-users" /></span><div><h3>Assegnazione giocatori</h3><p>Modifica gli atleti presenti nei due slot.</p></div></header>
            <div class="form-field">
              <label for="match-player-1">Giocatore 1</label>
              <Select id="match-player-1" v-model="player1Id" :options="availablePlayer1Options" option-label="name" option-value="id" placeholder="Seleziona giocatore" fluid />
            </div>
            <div class="form-field">
              <label for="match-player-2">Giocatore 2</label>
              <Select id="match-player-2" v-model="player2Id" :options="availablePlayer2Options" option-label="name" option-value="id" placeholder="Seleziona giocatore" fluid />
            </div>
            <footer><span>Salva entrambi gli slot</span><Button type="submit" label="Salva assegnazioni" icon="pi pi-check" :loading="savingAssignments" /></footer>
          </form>

          <form class="management-card result-card" @submit.prevent="saveResult">
            <header><span><i class="pi pi-flag" /></span><div><h3>Risultato finale</h3><p>Registra punteggio e vincitore.</p></div></header>
            <div class="form-field">
              <label for="match-result">Risultato</label>
              <span class="input-wrap"><i class="pi pi-chart-bar" /><InputText id="match-result" v-model="resultValue" placeholder="es. 6-3 6-4" fluid /></span>
            </div>
            <div class="form-field">
              <label for="match-winner">Vincitore</label>
              <Select id="match-winner" v-model="winnerId" :options="[player1, player2].filter(Boolean)" option-label="name" option-value="id" placeholder="Seleziona vincitore" fluid />
            </div>
            <footer><span>Il vincitore avanzerà automaticamente</span><Button type="submit" label="Salva risultato" icon="pi pi-trophy" :loading="savingResult" :disabled="!resultValue || !winnerId" /></footer>
          </form>
        </div>
      </section>
    </template>
  </div>
</template>

<style scoped>
.match-page { --green: #047857; --lime: #b7f34a; display: flex; max-width: 1480px; margin: 0 auto; flex-direction: column; gap: 1.5rem; color: #17211d; }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; padding-top: 0.2rem; }
.back-link { display: inline-flex; align-items: center; gap: 0.45rem; margin: 0 0 1.25rem; padding: 0; border: 0; background: transparent; color: #6e7c75; font: inherit; font-size: 0.72rem; font-weight: 650; cursor: pointer; }
.back-link:hover { color: var(--green); }
.eyebrow { margin: 0 0 0.5rem; color: var(--green); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.16em; }
.page-header h1 { margin: 0; font-size: clamp(2rem, 3vw, 3rem); line-height: 1; letter-spacing: -0.055em; }
.page-subtitle { margin: 0.75rem 0 0; color: #68756f; font-size: 0.95rem; }
.header-status { display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.5rem 0.7rem; border-radius: 99px; background: #f1f5f3; color: #718079; font-size: 0.62rem; font-weight: 800; text-transform: uppercase; }
.header-status i { width: 6px; height: 6px; border-radius: 50%; background: #94a3b8; }
.header-status.completed { background: #e3f8ee; color: #08764f; }
.header-status.completed i { background: #10b981; }
.match-loading { display: flex; min-height: 360px; flex-direction: column; align-items: center; justify-content: center; gap: 0.8rem; color: #82908a; font-size: 0.72rem; }
.match-loading i { color: #10b981; font-size: 2rem; }
.match-arena { position: relative; isolation: isolate; overflow: hidden; padding: clamp(1.2rem, 3vw, 2rem); border-radius: 22px; background: linear-gradient(140deg, #073d31, #075f49); color: white; box-shadow: 0 18px 38px rgb(18 73 51 / 16%); }
.arena-pattern { position: absolute; z-index: -1; inset: 0; opacity: 0.16; background-image: radial-gradient(rgb(255 255 255 / 48%) 0.7px, transparent 0.7px); background-size: 14px 14px; mask-image: linear-gradient(90deg, transparent, black, transparent); }
.match-arena::after { position: absolute; z-index: -1; width: 360px; height: 360px; right: -210px; bottom: -250px; border: 1px solid rgb(255 255 255 / 12%); border-radius: 50%; box-shadow: 0 0 0 50px rgb(255 255 255 / 3%), 0 0 0 100px rgb(255 255 255 / 2%); content: ''; }
.arena-topline { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgb(255 255 255 / 11%); color: rgb(255 255 255 / 48%); font-size: 0.61rem; font-weight: 700; }
.arena-topline span { display: flex; align-items: center; gap: 0.4rem; }
.arena-topline strong { padding: 0.38rem 0.6rem; border-radius: 99px; background: var(--lime); color: #315d0b; font-size: 0.67rem; }
.players-versus { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: clamp(1rem, 4vw, 4rem); padding: 2.2rem 1rem 1.8rem; }
.arena-player { position: relative; display: flex; min-width: 0; flex-direction: column; align-items: center; text-align: center; }
.winner-badge { position: absolute; top: -0.5rem; display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.35rem 0.55rem; border-radius: 99px; background: var(--lime); color: #315d0b; font-size: 0.52rem; font-weight: 850; letter-spacing: 0.07em; transform: translateY(-100%); }
.arena-avatar :deep(.p-avatar) { width: clamp(6.5rem, 11vw, 9rem); height: clamp(6.5rem, 11vw, 9rem); border: 5px solid rgb(255 255 255 / 15%); background: #e6efeb; color: #25483b; font-size: 2rem; box-shadow: 0 16px 32px rgb(0 0 0 / 20%); }
.arena-player.winner .arena-avatar :deep(.p-avatar) { box-shadow: 0 0 0 4px #b7f34a, 0 16px 32px rgb(0 0 0 / 24%); }
.arena-player h2 { overflow: hidden; max-width: 100%; margin: 1rem 0 0.35rem; font-size: clamp(1.25rem, 2.5vw, 1.9rem); letter-spacing: -0.04em; text-overflow: ellipsis; white-space: nowrap; }
.arena-player > p { display: flex; align-items: center; gap: 0.35rem; margin: 0; color: rgb(255 255 255 / 50%); font-size: 0.65rem; }
.player-stats { display: grid; width: 100%; grid-template-columns: repeat(3, 1fr); gap: 0.35rem; margin-top: 1.25rem; }
.player-stats > div { display: grid; gap: 0.15rem; padding: 0.65rem 0.3rem; border-radius: 9px; background: rgb(255 255 255 / 7%); }
.player-stats small { color: rgb(255 255 255 / 35%); font-size: 0.43rem; font-weight: 850; letter-spacing: 0.09em; }
.player-stats strong { overflow: hidden; color: rgb(255 255 255 / 78%); font-size: 0.62rem; text-overflow: ellipsis; white-space: nowrap; }
.versus-center { display: flex; flex-direction: column; align-items: center; gap: 0.7rem; }
.versus-center span { display: grid; place-items: center; width: 3.2rem; height: 3.2rem; border: 1px solid rgb(255 255 255 / 17%); border-radius: 50%; background: rgb(255 255 255 / 9%); color: var(--lime); font-size: 0.8rem; font-weight: 900; box-shadow: 0 8px 20px rgb(0 0 0 / 12%); }
.versus-center i { width: 1px; height: 2.5rem; background: linear-gradient(transparent, rgb(255 255 255 / 20%), transparent); }
.arena-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; padding-top: 1.15rem; border-top: 1px solid rgb(255 255 255 / 11%); }
.arena-summary > div { display: flex; align-items: center; gap: 0.65rem; min-width: 0; padding-right: 0.7rem; border-right: 1px solid rgb(255 255 255 / 9%); }
.arena-summary > div:last-child { border-right: 0; }
.summary-icon { display: grid; place-items: center; width: 2.2rem; height: 2.2rem; flex: 0 0 auto; border-radius: 9px; background: rgb(255 255 255 / 9%); color: #c8fa72; font-size: 0.7rem; }
.arena-summary p { display: grid; min-width: 0; gap: 0.12rem; margin: 0; }
.arena-summary small { color: rgb(255 255 255 / 35%); font-size: 0.45rem; font-weight: 850; letter-spacing: 0.1em; }
.arena-summary strong { overflow: hidden; color: rgb(255 255 255 / 80%); font-size: 0.67rem; text-overflow: ellipsis; white-space: nowrap; }
.management-section { display: flex; flex-direction: column; gap: 1rem; }
.management-heading { display: flex; align-items: center; gap: 0.7rem; }
.management-heading > span { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border-radius: 10px; background: #d1fae5; color: var(--green); }
.management-heading p { margin: 0; color: var(--green); font-size: 0.5rem; font-weight: 850; letter-spacing: 0.12em; }
.management-heading h2 { margin: 0.15rem 0 0; font-size: 1rem; letter-spacing: -0.025em; }
.management-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.management-card { display: flex; flex-direction: column; gap: 1rem; padding: 1.25rem; border: 1px solid #e0e8e4; border-radius: 18px; background: white; box-shadow: 0 8px 26px rgb(29 63 49 / 6%); }
.management-card > header { display: flex; align-items: center; gap: 0.7rem; padding-bottom: 0.9rem; border-bottom: 1px solid #edf1ef; }
.management-card > header > span { display: grid; place-items: center; width: 2.2rem; height: 2.2rem; border-radius: 9px; background: #f0f7f4; color: var(--green); }
.management-card h3 { margin: 0; font-size: 0.88rem; }
.management-card header p { margin: 0.18rem 0 0; color: #8a9690; font-size: 0.59rem; }
.form-field { display: flex; flex-direction: column; gap: 0.4rem; }
.form-field label { color: #5d6964; font-size: 0.66rem; font-weight: 750; }
.form-field :deep(.p-inputtext), .form-field :deep(.p-select) { height: 3rem; border-color: #dce5e1; border-radius: 11px; background: #fbfdfc; font-size: 0.78rem; }
.form-field :deep(.p-inputtext:focus), .form-field :deep(.p-select.p-focus) { border-color: #10b981; box-shadow: 0 0 0 3px rgb(16 185 129 / 10%); }
.input-wrap { position: relative; }
.input-wrap > i { position: absolute; z-index: 2; top: 50%; left: 0.9rem; transform: translateY(-50%); color: #8b9892; font-size: 0.72rem; }
.input-wrap :deep(.p-inputtext) { padding-left: 2.4rem; }
.management-card footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; margin: auto -1.25rem -1.25rem; padding: 0.85rem 1.25rem; border-top: 1px solid #edf1ef; border-radius: 0 0 18px 18px; background: #fafcfb; }
.management-card footer > span { color: #909c96; font-size: 0.55rem; }
.management-card footer :deep(.p-button) { height: 2.7rem; border-color: var(--green); border-radius: 10px; background: var(--green); font-size: 0.66rem; font-weight: 750; }

@media (max-width: 900px) { .management-grid { grid-template-columns: 1fr; } }
@media (max-width: 680px) {
  .match-page { gap: 0.8rem; }
  .page-header { align-items: flex-start; gap: 0.7rem; }
  .back-link { margin-bottom: 0.65rem; }
  .eyebrow, .page-subtitle { display: none; }
  .page-header h1 { font-size: 1.65rem; }
  .header-status { padding: 0.4rem 0.55rem; }
  .header-status, .arena-topline, .arena-topline strong, .winner-badge, .arena-player > p { font-size: 0.75rem; }
  .match-arena { padding: 0.85rem; border-radius: 14px; box-shadow: 0 8px 24px rgb(18 73 51 / 12%); }
  .arena-topline { padding-bottom: 0.65rem; }
  .players-versus { grid-template-columns: 1fr; gap: 0.7rem; padding: 1rem 0 0.8rem; }
  .versus-center { flex-direction: row; }
  .versus-center i { width: 3rem; height: 1px; }
  .arena-player { width: 100%; }
  .arena-player :deep(.p-avatar) { width: 4rem; height: 4rem; }
  .arena-player h2 { margin-top: 0.55rem; font-size: 1.25rem; white-space: normal; }
  .player-stats { max-width: 340px; margin-top: 0.65rem; }
  .player-stats small, .arena-summary small { font-size: 0.75rem; letter-spacing: 0.04em; }
  .player-stats strong, .arena-summary strong { font-size: 0.8125rem; }
  .winner-badge { position: static; margin-bottom: 0.7rem; transform: none; }
  .arena-summary { grid-template-columns: repeat(3, 1fr); gap: 0.25rem; padding-top: 0.75rem; }
  .arena-summary > div { display: grid; justify-items: center; gap: 0.35rem; padding: 0 0.25rem; border-right: 1px solid rgb(255 255 255 / 8%); text-align: center; }
  .summary-icon { width: 1.8rem; height: 1.8rem; }
  .management-section { gap: 0.7rem; }
  .management-card { padding: 0.85rem; border-radius: 14px; box-shadow: none; }
  .management-heading p, .management-card header p, .form-field label, .management-card footer > span { font-size: 0.75rem; }
  .management-card :deep(.p-inputtext), .management-card :deep(.p-select), .management-card footer :deep(.p-button) { font-size: 0.875rem; }
  .management-card footer { align-items: stretch; flex-direction: column; }
  .management-card footer :deep(.p-button) { width: 100%; }
  .management-card footer { position: sticky; bottom: calc(4.8rem + env(safe-area-inset-bottom)); z-index: 4; margin: auto -0.85rem -0.85rem; padding: 0.65rem 0.85rem; }
}
</style>
