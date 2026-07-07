<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../stores/auth'
import { usePlayersStore } from '../stores/players'
import type { Player, PlayerMatchHistory } from '../types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const store = usePlayersStore()
const confirm = useConfirm()
const toast = useToast()

const player = ref<Player | null>(null)
const matchHistory = ref<PlayerMatchHistory>({
  stats: { played: 0, wins: 0, losses: 0, win_rate: 0 },
  recent_form: [],
  recent_matches: [],
})
const loading = ref(true)

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatAge(birthDate: string | null | undefined): string {
  if (!birthDate) return 'Età non disponibile'
  const dob = new Date(birthDate)
  if (Number.isNaN(dob.getTime())) return 'Età non disponibile'
  const diff = Date.now() - dob.getTime()
  const ageDate = new Date(diff)
  return `${Math.abs(ageDate.getUTCFullYear() - 1970)} anni`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function openMatch(tournamentId: string, matchId: string): void {
  void router.push({ name: 'match-detail', params: { id: tournamentId, matchId } })
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
        toast.add({
          severity: 'success',
          summary: 'Eliminato',
          detail: `${player.value.name} rimosso`,
          life: 3000,
        })
        await router.push({ name: 'players' })
      } catch (error) {
        toast.add({
          severity: 'error',
          summary: 'Errore',
          detail: (error as Error).message,
          life: 4000,
        })
      }
    },
  })
}

watch(() => route.params['id'], loadPlayer, { immediate: true })

const fullName = computed(() => player.value?.name ?? '')
</script>

<template>
  <div class="profile-page">
    <header class="page-header">
      <div>
        <button class="back-link" type="button" @click="router.push({ name: 'players' })"><i class="pi pi-arrow-left" /> Tutti i giocatori</button>
        <p class="eyebrow">SCHEDA ATLETA</p>
        <h1>Profilo giocatore</h1>
        <p class="page-subtitle">Identità, contatti e informazioni sportive.</p>
      </div>
    </header>

    <div v-if="loading" class="profile-grid">
      <div class="hero-card loading-card"><Skeleton shape="circle" size="8rem" /><div><Skeleton width="7rem" height="1.5rem" /><Skeleton width="15rem" height="2.5rem" /><Skeleton width="10rem" height="1rem" /></div></div>
      <div class="details-card loading-details"><Skeleton width="8rem" height="1.5rem" /><Skeleton v-for="item in 4" :key="item" width="100%" height="3.5rem" borderRadius="12px" /></div>
      <div class="activity-card loading-activity"><Skeleton width="11rem" height="1.5rem" /><Skeleton v-for="item in 3" :key="item" width="100%" height="3.5rem" /></div>
    </div>

    <div v-else-if="!player" class="empty-state">
      <span><i class="pi pi-user-minus" /></span>
      <h3>Giocatore non trovato</h3>
      <p>Il profilo richiesto non è disponibile.</p>
    </div>

    <div v-else class="profile-grid">
      <section class="hero-card">
        <div class="player-avatar-wrap">
          <Avatar :label="getInitials(player.name)" :image="player.photo_url ?? undefined" shape="circle" />
        </div>

        <div class="hero-copy">
          <h2>{{ fullName }}</h2>
          <div class="hero-meta">
            <span><i class="pi pi-building-columns" /> {{ player.club ?? 'Club non specificato' }}</span>
            <strong>#{{ player.ranking || '—' }}</strong>
          </div>
        </div>

        <div class="hero-stats">
          <div><small>POSIZIONE</small><strong>#{{ player.ranking || '—' }}</strong><span>Ranking del club</span></div>
          <div><small>ETÀ</small><strong>{{ player.birth_date ? formatAge(player.birth_date).replace(' anni', '') : '—' }}</strong><span>{{ player.birth_date ? 'anni' : 'Non disponibile' }}</span></div>
          <div><small>STATO</small><strong class="status-value"><i /> Attivo</strong><span>Profilo registrato</span></div>
        </div>
      </section>

      <section class="details-card">
        <header class="card-heading">
          <div class="card-heading-copy"><span class="heading-icon"><i class="pi pi-id-card" /></span><div><h2>Informazioni personali</h2><p>Dati anagrafici e contatti</p></div></div>
          <Button
            v-if="auth.isAdmin"
            class="edit-profile-button"
            label="Modifica profilo"
            icon="pi pi-pencil"
            severity="secondary"
            outlined
            @click="router.push({ name: 'player-edit', params: { id: player.id } })"
          />
        </header>
        <div class="details-list">
          <div class="detail-row"><span class="detail-icon"><i class="pi pi-calendar" /></span><div><small>DATA DI NASCITA</small><strong>{{ formatDate(player.birth_date) }}</strong></div></div>
          <div class="detail-row"><span class="detail-icon"><i class="pi pi-clock" /></span><div><small>ETÀ</small><strong>{{ formatAge(player.birth_date) }}</strong></div></div>
          <div class="detail-row"><span class="detail-icon"><i class="pi pi-building-columns" /></span><div><small>CLUB</small><strong>{{ player.club ?? '—' }}</strong></div></div>
          <div class="detail-row"><span class="detail-icon"><i class="pi pi-phone" /></span><div><small>CONTATTO</small><strong>{{ player.phone ?? '—' }}</strong></div></div>
        </div>
      </section>

      <section class="activity-card">
        <header class="card-heading activity-heading">
          <div class="card-heading-copy"><span class="heading-icon"><i class="pi pi-chart-line" /></span><div><h2>Risultati e statistiche</h2><p>Andamento nelle partite completate</p></div></div>
          <div v-if="matchHistory.recent_form.length" class="recent-form" aria-label="Forma recente">
            <span v-for="(outcome, index) in matchHistory.recent_form" :key="index" :class="outcome">{{ outcome === 'win' ? 'V' : 'S' }}</span>
          </div>
        </header>

        <div class="stats-grid">
          <div><small>GIOCATE</small><strong>{{ matchHistory.stats.played }}</strong></div>
          <div><small>VITTORIE</small><strong>{{ matchHistory.stats.wins }}</strong></div>
          <div><small>SCONFITTE</small><strong>{{ matchHistory.stats.losses }}</strong></div>
          <div><small>VITTORIE %</small><strong>{{ matchHistory.stats.win_rate }}%</strong></div>
        </div>

        <div v-if="matchHistory.recent_matches.length" class="recent-matches">
          <button
            v-for="match in matchHistory.recent_matches"
            :key="match.id"
            class="recent-match"
            type="button"
            @click="openMatch(match.tournament_id, match.id)"
          >
            <span class="outcome-mark" :class="match.outcome">{{ match.outcome === 'win' ? 'V' : 'S' }}</span>
            <Avatar :label="getInitials(match.opponent_name)" :image="match.opponent_photo_url ?? undefined" shape="circle" />
            <span class="match-copy"><small>{{ match.tournament_name }}</small><strong>vs {{ match.opponent_name }}</strong></span>
            <span class="match-result"><strong>{{ match.result }}</strong><small>{{ formatDate(match.played_at) }}</small></span>
            <i class="pi pi-chevron-right" />
          </button>
        </div>

        <div v-else class="no-matches"><i class="pi pi-chart-line" /><span><strong>Nessuna partita completata</strong><small>Le statistiche appariranno dopo il primo risultato.</small></span></div>
      </section>

      <section class="system-card">
        <header class="card-heading"><span class="heading-icon secondary"><i class="pi pi-database" /></span><div><h2>Dati di sistema</h2><p>Collegamenti tecnici del profilo</p></div></header>
        <div class="system-grid">
          <div><small>ID GIOCATORE</small><code>{{ player.id }}</code></div>
          <div><small>ID UTENTE COLLEGATO</small><code>{{ player.user_id ?? 'Non collegato' }}</code></div>
          <div class="photo-data"><small>IMMAGINE PROFILO</small><span>{{ player.photo_url ? 'Immagine personalizzata' : 'Avatar con iniziali' }}</span></div>
        </div>
      </section>

      <section v-if="auth.isAdmin" class="danger-card">
        <div><span><i class="pi pi-exclamation-triangle" /></span><div><h3>Zona amministrativa</h3><p>L’eliminazione del giocatore è permanente e non può essere annullata.</p></div></div>
        <Button class="danger-action" label="Elimina giocatore" icon="pi pi-trash" severity="danger" text @click="confirmDelete" />
      </section>
    </div>
  </div>
</template>

<style scoped>
.profile-page { --green: var(--color-primary-700); --lime: var(--color-accent); display: flex; max-width: 1480px; margin: 0 auto; flex-direction: column; gap: 1.5rem; color: var(--color-text); }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; padding-top: 0.2rem; }
.back-link { display: inline-flex; align-items: center; gap: 0.45rem; margin: 0 0 1.25rem; padding: 0; border: 0; background: transparent; color: var(--color-text-muted); font: inherit; font-size: 0.72rem; font-weight: 650; cursor: pointer; }
.back-link:hover { color: var(--green); }
.eyebrow { margin: 0 0 0.5rem; color: var(--green); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.16em; }
.page-header h1 { margin: 0; font-size: clamp(2rem, 3vw, 3rem); line-height: 1; letter-spacing: -0.055em; }
.page-subtitle { margin: 0.75rem 0 0; color: var(--color-text-muted); font-size: 0.95rem; }
.profile-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr); gap: 1rem; }
.hero-card, .details-card, .activity-card, .system-card, .danger-card { border: 1px solid var(--color-border); border-radius: 0; background: var(--color-surface-card); box-shadow: 0 8px 26px rgb(var(--color-shadow-rgb) / 6%); }
.hero-card { position: relative; display: grid; grid-template-columns: auto 1fr; align-items: center; min-height: 330px; overflow: hidden; padding: clamp(1.5rem, 4vw, 2.5rem); background: var(--color-primary-800); color: var(--color-white); }
.player-avatar-wrap { position: relative; margin-right: clamp(1.4rem, 3vw, 2.3rem); }
.player-avatar-wrap :deep(.p-avatar) { width: clamp(7rem, 12vw, 9rem); height: clamp(7rem, 12vw, 9rem); border: 5px solid rgb(var(--color-white-rgb) / 18%); background: var(--color-surface-muted); color: var(--color-text-muted); font-size: 2.2rem; box-shadow: 0 18px 35px rgb(var(--color-black-rgb) / 20%); }
.hero-copy { min-width: 0; }
.hero-copy h2 { overflow: hidden; margin: 0 0 0.55rem; font-size: clamp(2rem, 4vw, 3rem); line-height: 1; letter-spacing: -0.055em; text-overflow: ellipsis; }
.hero-meta { display: flex; align-items: center; gap: 1rem; color: rgb(var(--color-white-rgb) / 68%); font-size: 0.875rem; }
.hero-meta span { display: flex; min-width: 0; align-items: center; gap: 0.45rem; }
.hero-meta strong { color: var(--lime); font-size: 1rem; font-variant-numeric: tabular-nums; }
.hero-stats { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 2.2rem; padding-top: 1.35rem; border-top: 1px solid rgb(var(--color-white-rgb) / 12%); }
.hero-stats > div { display: grid; gap: 0.25rem; padding-inline: 1rem; border-right: 1px solid rgb(var(--color-white-rgb) / 10%); }
.hero-stats > div:first-child { padding-left: 0; }
.hero-stats > div:last-child { border-right: 0; }
.hero-stats small { color: rgb(var(--color-white-rgb) / 40%); font-size: 0.52rem; font-weight: 800; letter-spacing: 0.12em; }
.hero-stats strong { font-size: 1.35rem; }
.hero-stats span { color: rgb(var(--color-white-rgb) / 42%); font-size: 0.59rem; }
.status-value { display: flex; align-items: center; gap: 0.4rem; font-size: 0.9rem !important; }
.status-value i { width: 7px; height: 7px; border-radius: 50%; background: var(--lime); box-shadow: 0 0 0 4px rgb(var(--color-accent-rgb) / 12%); }
.details-card, .system-card { padding: 1.35rem; }
.card-heading { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 1.15rem; }
.card-heading-copy { display: flex; min-width: 0; align-items: center; gap: 0.75rem; }
.edit-profile-button { flex: 0 0 auto; font-size: 0.8125rem; }
.heading-icon { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; flex: 0 0 auto; border-radius: 0; background: var(--color-primary-soft-surface); color: var(--green); }
.heading-icon.secondary { background: var(--color-surface-muted); color: var(--color-text-muted); }
.card-heading h2, .danger-card h3 { margin: 0; font-size: 0.95rem; letter-spacing: -0.02em; }
.card-heading p, .danger-card p { margin: 0.2rem 0 0; color: var(--color-text-subtle); font-size: 0.64rem; }
.details-list { display: flex; flex-direction: column; gap: 0.55rem; }
.detail-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.72rem; border-radius: 0; background: var(--color-surface-soft); }
.detail-icon { display: grid; place-items: center; width: 2rem; height: 2rem; flex: 0 0 auto; border-radius: 0; background: var(--color-surface-card); color: var(--color-primary-300); font-size: 0.72rem; box-shadow: 0 2px 7px rgb(var(--color-shadow-rgb) / 7%); }
.detail-row > div { display: grid; min-width: 0; gap: 0.16rem; }
.detail-row small, .system-grid small { color: var(--color-text-subtle); font-size: 0.51rem; font-weight: 800; letter-spacing: 0.09em; }
.detail-row strong { overflow: hidden; color: var(--color-text-muted); font-size: 0.72rem; text-overflow: ellipsis; white-space: nowrap; }
.activity-card { grid-column: 1 / -1; padding: 1.35rem; }
.activity-heading { align-items: center; }
.recent-form { display: flex; gap: 0.35rem; }
.recent-form span, .outcome-mark { display: grid; place-items: center; width: 1.65rem; height: 1.65rem; flex: 0 0 auto; background: var(--color-surface-muted); color: var(--color-text-muted); font-size: 0.65rem; font-weight: 850; }
.recent-form .win, .outcome-mark.win { background: var(--color-success-soft); color: var(--color-success); }
.recent-form .loss, .outcome-mark.loss { background: var(--color-danger-soft); color: var(--color-danger); }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.65rem; margin-bottom: 1rem; }
.stats-grid > div { display: grid; gap: 0.25rem; padding: 0.8rem; border: 1px solid var(--color-border); background: var(--color-surface-soft); }
.stats-grid small { color: var(--color-text-subtle); font-size: 0.55rem; font-weight: 850; letter-spacing: 0.09em; }
.stats-grid strong { color: var(--color-text); font-size: 1.35rem; }
.recent-matches { display: grid; border-top: 1px solid var(--color-border); }
.recent-match { display: grid; grid-template-columns: auto auto minmax(0, 1fr) auto auto; align-items: center; gap: 0.75rem; min-height: 4.25rem; padding: 0.55rem 0.3rem; border: 0; border-bottom: 1px solid var(--color-border); background: transparent; color: var(--color-text); cursor: pointer; text-align: left; }
.recent-match:hover { background: var(--color-surface-soft); }
.recent-match :deep(.p-avatar) { width: 2.35rem; height: 2.35rem; background: var(--color-surface-muted); color: var(--color-text-muted); font-size: 0.7rem; }
.match-copy, .match-result { display: grid; min-width: 0; gap: 0.18rem; }
.match-copy small, .match-result small { overflow: hidden; color: var(--color-text-subtle); font-size: 0.65rem; text-overflow: ellipsis; white-space: nowrap; }
.match-copy strong { overflow: hidden; font-size: 0.82rem; text-overflow: ellipsis; white-space: nowrap; }
.match-result { min-width: 7rem; text-align: right; }
.match-result strong { font-size: 0.8rem; font-variant-numeric: tabular-nums; }
.recent-match > .pi-chevron-right { color: var(--color-text-subtle); font-size: 0.65rem; }
.no-matches { display: flex; min-height: 6rem; align-items: center; justify-content: center; gap: 0.75rem; background: var(--color-surface-soft); color: var(--color-text-subtle); }
.no-matches > i { font-size: 1.25rem; }
.no-matches > span { display: grid; gap: 0.2rem; }
.no-matches strong { color: var(--color-text-muted); font-size: 0.8rem; }
.no-matches small { font-size: 0.7rem; }
.system-card { grid-column: 1 / -1; }
.system-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.7rem; }
.system-grid > div { display: grid; min-width: 0; gap: 0.35rem; padding: 0.85rem; border: 1px solid var(--color-surface-muted); border-radius: 0; background: var(--color-surface-soft); }
.system-grid code, .system-grid span { overflow: hidden; color: var(--color-text-muted); font: inherit; font-size: 0.68rem; text-overflow: ellipsis; white-space: nowrap; }
.danger-card { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.2rem; border-color: var(--color-danger-soft); background: var(--color-surface-muted); box-shadow: none; }
.danger-card > div { display: flex; align-items: center; gap: 0.75rem; }
.danger-card > div > span { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; flex: 0 0 auto; border-radius: 0; background: var(--color-danger-soft); color: var(--color-danger); }
.danger-action { color: var(--color-danger); white-space: nowrap; }
.loading-card { display: flex; gap: 2rem; background: var(--color-surface-card); }
.loading-card > div { display: flex; flex-direction: column; gap: 1rem; }
.loading-details { display: flex; flex-direction: column; gap: 0.8rem; }
.loading-activity { grid-column: 1 / -1; display: flex; flex-direction: column; gap: 0.8rem; padding: 1.35rem; }
.empty-state { display: flex; min-height: 300px; flex-direction: column; align-items: center; justify-content: center; border: 1px dashed var(--color-border); border-radius: 0; background: var(--color-surface-soft); text-align: center; }
.empty-state > span { display: grid; place-items: center; width: 3.5rem; height: 3.5rem; border-radius: 50%; background: var(--color-primary-soft-surface); color: var(--green); font-size: 1.3rem; }
.empty-state h3 { margin: 1rem 0 0.3rem; }
.empty-state p { margin: 0; color: var(--color-text-muted); font-size: 0.8rem; }

@media (max-width: 900px) {
  .profile-grid { grid-template-columns: 1fr; }
  .activity-card, .system-card, .danger-card { grid-column: auto; }
  .system-grid { grid-template-columns: 1fr; }
}
@media (max-width: 620px) {
  .profile-page { gap: 0.8rem; }
  .page-header { align-items: center; flex-direction: row; gap: 0.7rem; }
  .page-header > div { min-width: 0; flex: 1; }
  .back-link { margin-bottom: 0.65rem; }
  .eyebrow, .page-subtitle { display: none; }
  .page-header h1 { font-size: 1.65rem; }
  .hero-card { grid-template-columns: auto 1fr; min-height: auto; justify-items: start; padding: 0.9rem; border-radius: 0; text-align: left; }
  .player-avatar-wrap { margin: 0 0.8rem 0 0; }
  .player-avatar-wrap :deep(.p-avatar) { width: 4.5rem; height: 4.5rem; border-width: 3px; font-size: 1.25rem; box-shadow: none; }
  .hero-copy h2 { margin: 0 0 0.35rem; font-size: 1.45rem; white-space: normal; }
  .hero-meta { align-items: flex-start; flex-direction: column; gap: 0.25rem; font-size: 0.8125rem; }
  .hero-meta strong { font-size: 0.875rem; }
  .hero-stats { width: 100%; }
  .hero-stats { margin-top: 0.8rem; padding-top: 0.75rem; }
  .hero-stats > div { padding-inline: 0.45rem; }
  .hero-stats strong { font-size: 1rem; }
  .hero-stats small, .hero-stats span { font-size: 0.75rem; }
  .details-card, .activity-card, .system-card { padding: 0.85rem; border-radius: 0; box-shadow: none; }
  .card-heading { align-items: stretch; flex-direction: column; }
  .edit-profile-button { width: 100%; }
  .detail-row { padding: 0.55rem; }
  .card-heading p, .danger-card p, .detail-row small { font-size: 0.75rem; }
  .detail-row strong { font-size: 0.875rem; }
  .activity-heading { align-items: flex-start; }
  .recent-form { width: 100%; }
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .stats-grid strong { font-size: 1.1rem; }
  .recent-match { grid-template-columns: auto auto minmax(0, 1fr) auto; gap: 0.55rem; }
  .match-result { grid-column: 3; min-width: 0; text-align: left; }
  .recent-match > .pi-chevron-right { grid-column: 4; grid-row: 1 / 3; }
  .system-card { display: none; }
  .loading-card { display: grid; grid-template-columns: auto 1fr; align-items: center; gap: 0.8rem; min-height: 7rem; padding: 0.9rem; }
  .loading-card > :deep(.p-skeleton) { width: 4.5rem !important; height: 4.5rem !important; }
  .loading-card > div { min-width: 0; gap: 0.6rem; }
  .loading-card > div :deep(.p-skeleton) { max-width: 100%; }
  .danger-card { align-items: stretch; flex-direction: column; }
  .danger-action { width: 100%; }
}
</style>
