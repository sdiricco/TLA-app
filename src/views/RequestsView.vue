<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { useAuthStore } from '../stores/auth'
import { useOrganizationsStore } from '../stores/organizations'
import { requestsService } from '../services/requestsApi'
import type { OrganizationRequest, OrganizationRequestPriority, OrganizationRequestStatus, OrganizationRequestType } from '../types'

const auth = useAuthStore()
const organizations = useOrganizationsStore()
const requests = ref<OrganizationRequest[]>([])
const statusFilter = ref<OrganizationRequestStatus | 'all'>('all')
const typeFilter = ref<OrganizationRequestType | 'all'>('all')
const title = ref('')
const description = ref('')
const type = ref<OrganizationRequestType>('improvement')
const priority = ref<OrganizationRequestPriority>('medium')
const loading = ref(false)
const saving = ref(false)
const error = ref<string | null>(null)
const notice = ref<string | null>(null)

const statusOptions: Array<{ label: string; value: OrganizationRequestStatus }> = [
  { label: 'Aperta', value: 'open' },
  { label: 'Pianificata', value: 'planned' },
  { label: 'In lavorazione', value: 'in_progress' },
  { label: 'Completata', value: 'done' },
  { label: 'Rifiutata', value: 'rejected' },
]

async function loadRequests(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    requests.value = await requestsService.getAll({ status: statusFilter.value, type: typeFilter.value })
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    loading.value = false
  }
}

async function createRequest(): Promise<void> {
  if (!title.value.trim()) return
  saving.value = true
  error.value = null
  notice.value = null
  try {
    const request = await requestsService.create({
      title: title.value.trim(),
      description: description.value.trim() || null,
      type: type.value,
      priority: priority.value,
    })
    requests.value = [request, ...requests.value]
    title.value = ''
    description.value = ''
    type.value = 'improvement'
    priority.value = 'medium'
    notice.value = 'Richiesta salvata.'
  } catch (e) {
    error.value = (e as Error).message
  } finally {
    saving.value = false
  }
}

async function updateRequest(request: OrganizationRequest, status: OrganizationRequestStatus): Promise<void> {
  if (!organizations.isAdmin || request.status === status) return
  try {
    const updated = await requestsService.update(request.id, { status })
    const index = requests.value.findIndex(item => item.id === request.id)
    if (index >= 0) requests.value[index] = updated
  } catch (e) {
    error.value = (e as Error).message
  }
}

function typeLabel(value: OrganizationRequestType): string {
  return value === 'feature' ? 'Funzionalità' : value === 'bug' ? 'Bug' : 'Miglioramento'
}

function statusLabel(value: OrganizationRequestStatus): string {
  return statusOptions.find(option => option.value === value)?.label ?? value
}

function statusSeverity(value: OrganizationRequestStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  if (value === 'done') return 'success'
  if (value === 'in_progress') return 'info'
  if (value === 'rejected') return 'danger'
  if (value === 'planned') return 'warn'
  return 'secondary'
}

function priorityLabel(value: OrganizationRequestPriority): string {
  return value === 'high' ? 'Alta' : value === 'low' ? 'Bassa' : 'Media'
}

onMounted(() => { void loadRequests() })
watch([statusFilter, typeFilter], () => { void loadRequests() })
</script>

<template>
  <section class="requests-page">
    <header class="requests-header">
      <p class="eyebrow">BACKLOG ORGANIZZAZIONE</p>
      <h1>Richieste</h1>
      <p>Suggerimenti, problemi e idee raccolti in un unico spazio operativo.</p>
    </header>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
    <Message v-if="notice" severity="success" :closable="false">{{ notice }}</Message>

    <div class="filters-row">
      <label>Stato<select v-model="statusFilter" class="native-select"><option value="all">Tutti gli stati</option><option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
      <label>Tipo<select v-model="typeFilter" class="native-select"><option value="all">Tutti i tipi</option><option value="feature">Funzionalità</option><option value="improvement">Miglioramento</option><option value="bug">Bug</option></select></label>
    </div>

    <div v-if="requests.length" class="requests-list">
      <article v-for="request in requests" :key="request.id" class="request-card">
        <div class="request-card-topline">
          <div class="request-tags"><Tag :value="typeLabel(request.type)" severity="info" /><Tag :value="statusLabel(request.status)" :severity="statusSeverity(request.status)" /></div>
          <span class="priority" :class="`priority-${request.priority}`">Priorità {{ priorityLabel(request.priority) }}</span>
        </div>
        <h2>{{ request.title }}</h2>
        <p v-if="request.description">{{ request.description }}</p>
        <small>Proposta da {{ request.created_by.name }} · {{ new Date(request.created_at).toLocaleDateString('it-IT') }}</small>
        <label v-if="organizations.isAdmin" class="status-control">Aggiorna stato<select :value="request.status" class="native-select" @change="updateRequest(request, ($event.target as HTMLSelectElement).value as OrganizationRequestStatus)"><option v-for="option in statusOptions" :key="option.value" :value="option.value">{{ option.label }}</option></select></label>
      </article>
    </div>
    <Message v-else-if="!loading" severity="info" :closable="false">Nessuna richiesta corrisponde ai filtri.</Message>
    <p v-else class="loading-copy">Caricamento richieste…</p>

    <form v-if="!auth.isGuest" class="new-request-card" @submit.prevent="createRequest">
      <div><p class="eyebrow">CONTRIBUISCI</p><h2>Nuova richiesta</h2><p>Descrivi un’idea o un problema da portare nel backlog dell’organizzazione.</p></div>
      <label>Titolo<InputText v-model="title" placeholder="Es. Aggiungere il calendario delle partite" minlength="3" maxlength="120" fluid required /></label>
      <label>Descrizione<textarea v-model="description" class="native-textarea" rows="4" maxlength="1000" placeholder="Qual è il problema o il risultato desiderato?" /></label>
      <div class="form-grid"><label>Tipo<select v-model="type" class="native-select"><option value="feature">Funzionalità</option><option value="improvement">Miglioramento</option><option value="bug">Bug</option></select></label><label>Priorità<select v-model="priority" class="native-select"><option value="low">Bassa</option><option value="medium">Media</option><option value="high">Alta</option></select></label></div>
      <Button type="submit" label="Salva richiesta" icon="pi pi-plus" :loading="saving" />
    </form>
  </section>
</template>

<style scoped>
.requests-page { width: min(920px, 100%); margin: 0 auto; padding: clamp(1rem, 3vw, 2.5rem) 0; }
.requests-header { max-width: 620px; margin-bottom: 1.7rem; }
.eyebrow { margin: 0 0 .55rem; color: var(--color-primary-700); font-size: .72rem; font-weight: 850; letter-spacing: .15em; }
h1 { margin: 0; color: var(--color-text); font-size: clamp(2rem, 5vw, 3.2rem); letter-spacing: -.055em; }
.requests-header > p:last-child, .new-request-card p { color: var(--color-text-muted); line-height: 1.55; }
.filters-row { display: flex; gap: .8rem; margin-bottom: 1.3rem; }
.filters-row label, .new-request-card label, .status-control { display: grid; gap: .4rem; color: var(--color-text-muted); font-size: .78rem; font-weight: 750; }
.native-select, .native-textarea { width: 100%; border: 1px solid var(--color-border); background: var(--color-surface-card); color: var(--color-text); font: inherit; }
.native-select { padding: .68rem .75rem; }
.native-textarea { padding: .75rem; resize: vertical; }
.requests-list { display: grid; gap: .75rem; }
.request-card, .new-request-card { display: grid; gap: .8rem; padding: 1.05rem 1.15rem; border: 1px solid var(--color-border); background: var(--color-surface-card); box-shadow: 0 12px 28px rgb(var(--color-shadow-rgb) / 5%); }
.request-card-topline { display: flex; align-items: center; justify-content: space-between; gap: .8rem; }
.request-tags { display: flex; flex-wrap: wrap; gap: .4rem; }
.request-card h2, .new-request-card h2 { margin: .05rem 0 0; color: var(--color-text); font-size: 1.12rem; }
.request-card p, .new-request-card p { margin: 0; font-size: .86rem; }
.request-card small { color: var(--color-text-subtle); font-size: .72rem; }
.priority { font-size: .72rem; font-weight: 800; white-space: nowrap; }
.priority-high { color: var(--color-danger, #c2413d); }.priority-medium { color: var(--color-primary-700); }.priority-low { color: var(--color-text-muted); }
.status-control { max-width: 260px; margin-top: .2rem; }
.new-request-card { margin-top: 1.8rem; }
.new-request-card > div:first-child { margin-bottom: .2rem; }.new-request-card > div:first-child p { margin: .35rem 0 0; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .8rem; }
.loading-copy { color: var(--color-text-muted); }
@media (max-width: 680px) { .filters-row, .form-grid { grid-template-columns: 1fr; flex-direction: column; }.request-card-topline { align-items: flex-start; flex-direction: column; }.priority { white-space: normal; } }
</style>
