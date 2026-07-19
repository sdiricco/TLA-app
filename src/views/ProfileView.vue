<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Skeleton from 'primevue/skeleton'
import { useAuthStore } from '../stores/auth'
import { useOrganizationsStore } from '../stores/organizations'
import { playersService } from '../services/playersApi'
import { profilesService } from '../services/profilesApi'
import type { Player, PlayerMatchHistory } from '../types'

const router = useRouter()
const auth = useAuthStore()
const organizations = useOrganizationsStore()
const player = ref<Player | null>(null)
const history = ref<PlayerMatchHistory>({ stats: { played: 0, wins: 0, losses: 0, win_rate: 0 }, recent_form: [], recent_matches: [] })
const loadingPlayer = ref(true)
const editOpen = ref(false)
const editName = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

const displayName = computed(() => auth.user?.name || auth.user?.email || 'Il tuo profilo')
const email = computed(() => auth.user?.email ?? '—')
const roleLabel = computed(() => auth.isAdmin ? 'Amministratore' : 'Giocatore')
const organizationCount = computed(() => organizations.organizations.length)

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('')
}

function openEdit(): void {
  editName.value = displayName.value
  error.value = null
  editOpen.value = true
}

async function saveProfile(): Promise<void> {
  if (editName.value.trim().length < 2) {
    error.value = 'Inserisci un nome di almeno 2 caratteri.'
    return
  }
  saving.value = true
  error.value = null
  try {
    const updated = await profilesService.updateMyProfile(editName.value.trim())
    if (auth.user) auth.user.name = updated.name ?? editName.value.trim()
    editOpen.value = false
  } catch (e) { error.value = (e as Error).message }
  finally { saving.value = false }
}

async function loadPlayerCard(): Promise<void> {
  loadingPlayer.value = true
  try {
    const loadedPlayer = await playersService.getMyPlayer()
    player.value = loadedPlayer
    if (loadedPlayer) history.value = await playersService.getMatchHistory(loadedPlayer.id)
  } finally { loadingPlayer.value = false }
}

onMounted(() => { void loadPlayerCard() })
</script>

<template>
  <main class="profile-page">
    <header class="profile-hero">
      <div class="profile-identity">
        <Avatar :label="initials(displayName)" shape="circle" class="account-avatar" />
        <div>
          <p class="eyebrow">IL TUO ACCOUNT</p>
          <h1>{{ displayName }}</h1>
          <p class="email">{{ email }}</p>
        </div>
      </div>
      <div class="hero-actions">
        <Button label="Le mie organizzazioni" icon="pi pi-building" severity="secondary" outlined @click="router.push({ name: 'organizations' })" />
        <Button label="Modifica profilo" icon="pi pi-pencil" @click="openEdit" />
      </div>
    </header>

    <section class="account-overview" aria-label="Riepilogo account">
      <article><i class="pi pi-shield" /><div><small>RUOLO</small><strong>{{ roleLabel }}</strong></div></article>
      <article><i class="pi pi-building" /><div><small>LE MIE ORGANIZZAZIONI</small><strong>{{ organizationCount }} {{ organizationCount === 1 ? 'organizzazione' : 'organizzazioni' }}</strong></div></article>
      <article><i class="pi pi-calendar" /><div><small>ACCESSO</small><strong>Account attivo</strong></div></article>
    </section>

    <section class="section-heading"><div><p class="eyebrow">ATTIVITÀ SPORTIVA</p><h2>La mia scheda giocatore</h2><p>Risultati e statistiche personali collegati all’organizzazione selezionata.</p></div></section>

    <section v-if="loadingPlayer" class="player-card loading-card"><Skeleton shape="circle" size="5rem" /><div><Skeleton width="10rem" height="1.5rem" /><Skeleton width="16rem" height="1rem" /></div></section>

    <section v-else-if="player" class="player-card">
      <div class="player-summary">
        <Avatar :label="initials(player.name)" :image="player.photo_url ?? undefined" shape="circle" class="player-avatar" />
        <div class="player-copy"><p class="eyebrow">GIOCATORE COLLEGATO</p><h3>{{ player.name }}</h3><p>{{ player.club ?? 'Club non specificato' }} · Ranking #{{ player.ranking || '—' }}</p></div>
        <Button label="Apri scheda" icon="pi pi-arrow-right" iconPos="right" text @click="router.push({ name: 'player-detail', params: { id: player.id } })" />
      </div>
      <div class="stats-grid">
        <div><small>PARTITE GIOCATE</small><strong>{{ history.stats.played }}</strong></div>
        <div><small>VITTORIE</small><strong>{{ history.stats.wins }}</strong></div>
        <div><small>SCONFITTE</small><strong>{{ history.stats.losses }}</strong></div>
        <div><small>VITTORIE %</small><strong>{{ history.stats.win_rate }}%</strong></div>
      </div>
    </section>

    <section v-else class="empty-player-card">
      <span><i class="pi pi-user-plus" /></span>
      <div><h3>La tua scheda giocatore non è ancora collegata</h3><p>Quando verrai associato a un giocatore, qui vedrai partite, vittorie e andamento.</p></div>
      <Button label="Vai ai giocatori" icon="pi pi-users" severity="secondary" outlined @click="router.push({ name: 'players' })" />
    </section>

    <section class="permissions-card">
      <div><p class="eyebrow">ACCESSO</p><h2>Permessi del tuo account</h2><p>{{ auth.isAdmin ? 'Puoi gestire tornei, giocatori e configurazioni della tua organizzazione.' : 'Puoi consultare tornei, richieste e la tua attività sportiva.' }}</p></div>
      <i :class="auth.isAdmin ? 'pi pi-verified' : 'pi pi-check-circle'" />
    </section>

    <Dialog v-model:visible="editOpen" modal header="Modifica profilo" :style="{ width: 'min(92vw, 28rem)' }">
      <form class="edit-form" @submit.prevent="saveProfile">
        <label for="profile-name">Nome visualizzato</label>
        <InputText id="profile-name" v-model="editName" maxlength="80" autofocus fluid />
        <small>L’email dell’account non può essere modificata da qui.</small>
        <p v-if="error" class="form-error">{{ error }}</p>
        <div class="dialog-actions"><Button type="button" label="Annulla" severity="secondary" text @click="editOpen = false" /><Button type="submit" label="Salva modifiche" icon="pi pi-check" :loading="saving" /></div>
      </form>
    </Dialog>
  </main>
</template>

<style scoped>
.profile-page { width: min(1080px, 100%); margin: 0 auto; display: grid; gap: 1rem; color: var(--color-text); }
.profile-hero, .player-card, .empty-player-card, .permissions-card { border: 1px solid var(--color-border); background: var(--color-surface-card); box-shadow: 0 12px 28px rgb(var(--color-shadow-rgb) / 5%); }
.profile-hero { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: clamp(1rem, 3vw, 1.6rem); }
.profile-identity, .hero-actions, .player-summary { display: flex; align-items: center; gap: 1rem; }
.account-avatar { width: 4.5rem; height: 4.5rem; flex: 0 0 auto; background: var(--color-primary-700); color: var(--color-white); font-size: 1.35rem; font-weight: 800; }
.eyebrow { margin: 0 0 .4rem; color: var(--color-primary-700); font-size: .68rem; font-weight: 850; letter-spacing: .14em; }
h1, h2, h3 { margin: 0; letter-spacing: -.04em; } h1 { font-size: clamp(1.7rem, 4vw, 2.6rem); } h2 { font-size: 1.3rem; } h3 { font-size: 1.3rem; }
.email, .section-heading > div > p:last-child, .player-copy > p:last-child, .permissions-card p { margin: .35rem 0 0; color: var(--color-text-muted); line-height: 1.55; }
.hero-actions { flex-wrap: wrap; justify-content: flex-end; }
.account-overview { display: grid; grid-template-columns: repeat(3, 1fr); gap: .75rem; }
.account-overview article { display: flex; align-items: center; gap: .75rem; min-width: 0; padding: .9rem 1rem; border: 1px solid var(--color-border); background: var(--color-surface-card); }
.account-overview i { color: var(--color-primary-700); font-size: 1.1rem; } .account-overview small, .stats-grid small { display: block; color: var(--color-text-subtle); font-size: .58rem; font-weight: 800; letter-spacing: .08em; } .account-overview strong { display: block; margin-top: .2rem; font-size: .85rem; }
.section-heading { margin-top: .5rem; }.section-heading > div > p:last-child { max-width: 42rem; }
.player-card { display: grid; gap: 1.3rem; padding: clamp(1rem, 3vw, 1.4rem); }
.player-summary { align-items: flex-start; }.player-avatar { width: 5rem; height: 5rem; flex: 0 0 auto; background: var(--color-surface-soft); color: var(--color-primary-700); font-size: 1.25rem; font-weight: 800; }.player-summary > :last-child { margin-left: auto; }.player-copy { min-width: 0; }
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--color-border); }.stats-grid > div { padding: 1rem 1rem 0 0; }.stats-grid strong { display: block; margin-top: .25rem; font-size: 1.55rem; letter-spacing: -.05em; }
.empty-player-card { display: flex; align-items: center; gap: 1rem; padding: 1.2rem; }.empty-player-card > span { display: grid; place-items: center; width: 2.8rem; height: 2.8rem; flex: 0 0 auto; background: var(--color-surface-soft); color: var(--color-primary-700); }.empty-player-card p { margin: .3rem 0 0; color: var(--color-text-muted); line-height: 1.5; }.empty-player-card > :last-child { margin-left: auto; }
.permissions-card { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.2rem; background: var(--color-surface-soft); }.permissions-card > i { color: var(--color-primary-700); font-size: 2rem; }
.loading-card { align-items: center; grid-template-columns: auto 1fr; }
.edit-form { display: grid; gap: .7rem; }.edit-form label { font-size: .82rem; font-weight: 750; }.edit-form small { color: var(--color-text-muted); }.form-error { margin: 0; color: var(--color-danger, #c2413d); font-size: .82rem; }.dialog-actions { display: flex; justify-content: flex-end; gap: .5rem; margin-top: .4rem; }
@media (max-width: 720px) { .profile-hero, .empty-player-card { align-items: flex-start; flex-direction: column; }.hero-actions, .empty-player-card > :last-child { margin-left: 0; }.account-overview { grid-template-columns: 1fr; }.stats-grid { grid-template-columns: repeat(2, 1fr); }.stats-grid > div { padding: .8rem 0; }.player-summary { flex-wrap: wrap; }.player-summary > :last-child { margin-left: 0; width: 100%; }.permissions-card { align-items: flex-start; } }
</style>
