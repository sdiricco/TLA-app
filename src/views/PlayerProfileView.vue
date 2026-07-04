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
import type { Player } from '../types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const store = usePlayersStore()
const confirm = useConfirm()
const toast = useToast()

const player = ref<Player | null>(null)
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

async function loadPlayer(): Promise<void> {
  loading.value = true
  try {
    player.value = await store.getById(route.params['id'] as string)
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
      <div class="header-actions">
        <Button
          v-if="auth.isAdmin && player"
          class="edit-button"
          label="Modifica"
          icon="pi pi-pencil"
          @click="router.push({ name: 'player-edit', params: { id: player.id } })"
        />
      </div>
    </header>

    <div v-if="loading" class="profile-grid">
      <div class="hero-card loading-card"><Skeleton shape="circle" size="8rem" /><div><Skeleton width="7rem" height="1.5rem" /><Skeleton width="15rem" height="2.5rem" /><Skeleton width="10rem" height="1rem" /></div></div>
      <div class="details-card loading-details"><Skeleton width="8rem" height="1.5rem" /><Skeleton v-for="item in 4" :key="item" width="100%" height="3.5rem" borderRadius="12px" /></div>
    </div>

    <div v-else-if="!player" class="empty-state">
      <span><i class="pi pi-user-minus" /></span>
      <h3>Giocatore non trovato</h3>
      <p>Il profilo richiesto non è disponibile.</p>
    </div>

    <div v-else class="profile-grid">
      <section class="hero-card">
        <div class="hero-pattern" />
        <div class="player-avatar-wrap">
          <Avatar :label="getInitials(player.name)" :image="player.photo_url ?? undefined" shape="circle" />
          <span class="online-dot" title="Profilo attivo" />
        </div>

        <div class="hero-copy">
          <div class="hero-tags">
            <span class="ranking-tag"><i class="pi pi-bolt" /> RANKING #{{ player.ranking || '—' }}</span>
            <span class="profile-tag">PROFILO GIOCATORE</span>
          </div>
          <h2>{{ fullName }}</h2>
          <p><i class="pi pi-building-columns" /> {{ player.club ?? 'Club non specificato' }}</p>
        </div>

        <div class="hero-stats">
          <div><small>POSIZIONE</small><strong>#{{ player.ranking || '—' }}</strong><span>Ranking del club</span></div>
          <div><small>ETÀ</small><strong>{{ player.birth_date ? formatAge(player.birth_date).replace(' anni', '') : '—' }}</strong><span>{{ player.birth_date ? 'anni' : 'Non disponibile' }}</span></div>
          <div><small>STATO</small><strong class="status-value"><i /> Attivo</strong><span>Profilo registrato</span></div>
        </div>
      </section>

      <section class="details-card">
        <header class="card-heading"><span class="heading-icon"><i class="pi pi-id-card" /></span><div><h2>Informazioni personali</h2><p>Dati anagrafici e contatti</p></div></header>
        <div class="details-list">
          <div class="detail-row"><span class="detail-icon"><i class="pi pi-calendar" /></span><div><small>DATA DI NASCITA</small><strong>{{ formatDate(player.birth_date) }}</strong></div></div>
          <div class="detail-row"><span class="detail-icon"><i class="pi pi-clock" /></span><div><small>ETÀ</small><strong>{{ formatAge(player.birth_date) }}</strong></div></div>
          <div class="detail-row"><span class="detail-icon"><i class="pi pi-building-columns" /></span><div><small>CLUB</small><strong>{{ player.club ?? '—' }}</strong></div></div>
          <div class="detail-row"><span class="detail-icon"><i class="pi pi-phone" /></span><div><small>CONTATTO</small><strong>{{ player.phone ?? '—' }}</strong></div></div>
        </div>
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
.profile-page { --green: #047857; --lime: #b7f34a; display: flex; max-width: 1480px; margin: 0 auto; flex-direction: column; gap: 1.5rem; color: #17211d; }
.page-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 2rem; padding-top: 0.2rem; }
.back-link { display: inline-flex; align-items: center; gap: 0.45rem; margin: 0 0 1.25rem; padding: 0; border: 0; background: transparent; color: #6e7c75; font: inherit; font-size: 0.72rem; font-weight: 650; cursor: pointer; }
.back-link:hover { color: var(--green); }
.eyebrow { margin: 0 0 0.5rem; color: var(--green); font-size: 0.72rem; font-weight: 800; letter-spacing: 0.16em; }
.page-header h1 { margin: 0; font-size: clamp(2rem, 3vw, 3rem); line-height: 1; letter-spacing: -0.055em; }
.page-subtitle { margin: 0.75rem 0 0; color: #68756f; font-size: 0.95rem; }
.header-actions { display: flex; gap: 0.65rem; }
.edit-button { height: 3rem; border-color: var(--green); border-radius: 12px; background: var(--green); box-shadow: 0 10px 22px rgb(4 120 87 / 18%); font-weight: 700; }
.profile-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(320px, 0.75fr); gap: 1rem; }
.hero-card, .details-card, .system-card, .danger-card { border: 1px solid #e0e8e4; border-radius: 20px; background: #fff; box-shadow: 0 8px 26px rgb(29 63 49 / 6%); }
.hero-card { position: relative; isolation: isolate; display: grid; grid-template-columns: auto 1fr; align-items: center; min-height: 330px; overflow: hidden; padding: clamp(1.5rem, 4vw, 2.5rem); background: linear-gradient(140deg, #073d31 0%, #075e49 100%); color: white; }
.hero-pattern { position: absolute; z-index: -1; inset: 0; opacity: 0.17; background-image: radial-gradient(rgb(255 255 255 / 50%) 0.7px, transparent 0.7px); background-size: 14px 14px; mask-image: linear-gradient(100deg, transparent, black); }
.hero-card::after { position: absolute; z-index: -1; width: 330px; height: 330px; right: -180px; bottom: -200px; border: 1px solid rgb(255 255 255 / 12%); border-radius: 50%; box-shadow: 0 0 0 45px rgb(255 255 255 / 3%), 0 0 0 90px rgb(255 255 255 / 2%); content: ''; }
.player-avatar-wrap { position: relative; margin-right: clamp(1.4rem, 3vw, 2.3rem); }
.player-avatar-wrap :deep(.p-avatar) { width: clamp(7rem, 12vw, 9rem); height: clamp(7rem, 12vw, 9rem); border: 5px solid rgb(255 255 255 / 18%); background: #e6efeb; color: #25483b; font-size: 2.2rem; box-shadow: 0 18px 35px rgb(0 0 0 / 20%); }
.online-dot { position: absolute; right: 0.45rem; bottom: 0.55rem; width: 1rem; height: 1rem; border: 3px solid #075846; border-radius: 50%; background: var(--lime); }
.hero-copy { min-width: 0; }
.hero-tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.ranking-tag, .profile-tag { display: inline-flex; align-items: center; gap: 0.35rem; padding: 0.38rem 0.6rem; border-radius: 99px; background: var(--lime); color: #315d0b; font-size: 0.59rem; font-weight: 850; letter-spacing: 0.07em; }
.profile-tag { background: rgb(255 255 255 / 10%); color: rgb(255 255 255 / 68%); }
.hero-copy h2 { overflow: hidden; margin: 1rem 0 0.45rem; font-size: clamp(2rem, 4vw, 3rem); line-height: 1; letter-spacing: -0.055em; text-overflow: ellipsis; }
.hero-copy > p { display: flex; align-items: center; gap: 0.5rem; margin: 0; color: rgb(255 255 255 / 62%); font-size: 0.78rem; }
.hero-stats { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(3, 1fr); margin-top: 2.2rem; padding-top: 1.35rem; border-top: 1px solid rgb(255 255 255 / 12%); }
.hero-stats > div { display: grid; gap: 0.25rem; padding-inline: 1rem; border-right: 1px solid rgb(255 255 255 / 10%); }
.hero-stats > div:first-child { padding-left: 0; }
.hero-stats > div:last-child { border-right: 0; }
.hero-stats small { color: rgb(255 255 255 / 40%); font-size: 0.52rem; font-weight: 800; letter-spacing: 0.12em; }
.hero-stats strong { font-size: 1.35rem; }
.hero-stats span { color: rgb(255 255 255 / 42%); font-size: 0.59rem; }
.status-value { display: flex; align-items: center; gap: 0.4rem; font-size: 0.9rem !important; }
.status-value i { width: 7px; height: 7px; border-radius: 50%; background: var(--lime); box-shadow: 0 0 0 4px rgb(183 243 74 / 12%); }
.details-card, .system-card { padding: 1.35rem; }
.card-heading { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1.15rem; }
.heading-icon { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; flex: 0 0 auto; border-radius: 10px; background: #d1fae5; color: var(--green); }
.heading-icon.secondary { background: #f0f4f2; color: #65766f; }
.card-heading h2, .danger-card h3 { margin: 0; font-size: 0.95rem; letter-spacing: -0.02em; }
.card-heading p, .danger-card p { margin: 0.2rem 0 0; color: #8a9690; font-size: 0.64rem; }
.details-list { display: flex; flex-direction: column; gap: 0.55rem; }
.detail-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.72rem; border-radius: 12px; background: #f7faf9; }
.detail-icon { display: grid; place-items: center; width: 2rem; height: 2rem; flex: 0 0 auto; border-radius: 8px; background: white; color: #6d9c87; font-size: 0.72rem; box-shadow: 0 2px 7px rgb(31 66 52 / 7%); }
.detail-row > div { display: grid; min-width: 0; gap: 0.16rem; }
.detail-row small, .system-grid small { color: #9aa49f; font-size: 0.51rem; font-weight: 800; letter-spacing: 0.09em; }
.detail-row strong { overflow: hidden; color: #46564f; font-size: 0.72rem; text-overflow: ellipsis; white-space: nowrap; }
.system-card { grid-column: 1 / -1; }
.system-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.7rem; }
.system-grid > div { display: grid; min-width: 0; gap: 0.35rem; padding: 0.85rem; border: 1px solid #edf1ef; border-radius: 11px; background: #fafcfb; }
.system-grid code, .system-grid span { overflow: hidden; color: #64716b; font: inherit; font-size: 0.68rem; text-overflow: ellipsis; white-space: nowrap; }
.danger-card { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1rem 1.2rem; border-color: #fee2e2; background: #fffafa; box-shadow: none; }
.danger-card > div { display: flex; align-items: center; gap: 0.75rem; }
.danger-card > div > span { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; flex: 0 0 auto; border-radius: 10px; background: #fee2e2; color: #dc2626; }
.danger-action { color: #dc2626; white-space: nowrap; }
.loading-card { display: flex; gap: 2rem; background: #fff; }
.loading-card > div { display: flex; flex-direction: column; gap: 1rem; }
.loading-details { display: flex; flex-direction: column; gap: 0.8rem; }
.empty-state { display: flex; min-height: 300px; flex-direction: column; align-items: center; justify-content: center; border: 1px dashed #cbdad4; border-radius: 18px; background: #f9fcfb; text-align: center; }
.empty-state > span { display: grid; place-items: center; width: 3.5rem; height: 3.5rem; border-radius: 50%; background: #d1fae5; color: var(--green); font-size: 1.3rem; }
.empty-state h3 { margin: 1rem 0 0.3rem; }
.empty-state p { margin: 0; color: #7c8983; font-size: 0.8rem; }

@media (max-width: 900px) {
  .profile-grid { grid-template-columns: 1fr; }
  .system-card, .danger-card { grid-column: auto; }
  .system-grid { grid-template-columns: 1fr; }
}
@media (max-width: 620px) {
  .profile-page { gap: 0.8rem; }
  .page-header { align-items: center; flex-direction: row; gap: 0.7rem; }
  .page-header > div { min-width: 0; flex: 1; }
  .back-link { margin-bottom: 0.65rem; }
  .eyebrow, .page-subtitle { display: none; }
  .page-header h1 { font-size: 1.65rem; }
  .header-actions { display: flex; }
  .edit-button { width: 2.75rem; min-width: 2.75rem; padding: 0; border-radius: 50%; }
  .edit-button :deep(.p-button-label) { display: none; }
  .hero-card { grid-template-columns: auto 1fr; min-height: auto; justify-items: start; padding: 0.9rem; border-radius: 14px; text-align: left; }
  .player-avatar-wrap { margin: 0 0.8rem 0 0; }
  .player-avatar-wrap :deep(.p-avatar) { width: 4.5rem; height: 4.5rem; border-width: 3px; font-size: 1.25rem; box-shadow: none; }
  .hero-tags, .hero-copy > p { justify-content: center; }
  .hero-tags, .hero-copy > p { justify-content: flex-start; }
  .ranking-tag, .profile-tag, .hero-copy > p { font-size: 0.75rem; }
  .hero-copy h2 { margin: 0.55rem 0 0.3rem; font-size: 1.45rem; white-space: normal; }
  .hero-stats { width: 100%; }
  .hero-stats { margin-top: 0.8rem; padding-top: 0.75rem; }
  .hero-stats > div { padding-inline: 0.45rem; }
  .hero-stats strong { font-size: 1rem; }
  .hero-stats small, .hero-stats span { font-size: 0.75rem; }
  .details-card, .system-card { padding: 0.85rem; border-radius: 14px; box-shadow: none; }
  .detail-row { padding: 0.55rem; }
  .card-heading p, .danger-card p, .detail-row small { font-size: 0.75rem; }
  .detail-row strong { font-size: 0.875rem; }
  .system-card { display: none; }
  .danger-card { align-items: stretch; flex-direction: column; }
  .danger-action { width: 100%; }
}
</style>
