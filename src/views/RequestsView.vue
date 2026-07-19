<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Image from 'primevue/image'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import { useAuthStore } from '../stores/auth'
import { useOrganizationsStore } from '../stores/organizations'
import { requestsService } from '../services/requestsApi'
import type { OrganizationRequest, OrganizationRequestStatus, OrganizationRequestType } from '../types'

const auth = useAuthStore()
const organizations = useOrganizationsStore()
const router = useRouter()
const requests = ref<OrganizationRequest[]>([])
const statusFilter = ref<OrganizationRequestStatus | 'all'>('all')
const typeFilter = ref<OrganizationRequestType | 'all'>('all')
const loading = ref(false)
const error = ref<string | null>(null)

const statusOptions: Array<{ label: string; value: OrganizationRequestStatus }> = [
  { label: 'Aperta', value: 'open' },
  { label: 'Pianificata', value: 'planned' },
  { label: 'In lavorazione', value: 'in_progress' },
  { label: 'Completata', value: 'done' },
  { label: 'Rifiutata', value: 'rejected' },
]
const statusFilterOptions = [{ label: 'Tutti gli stati', value: 'all' as const }, ...statusOptions]
const typeOptions: Array<{ label: string; value: OrganizationRequestType }> = [
  { label: 'Funzionalità', value: 'feature' },
  { label: 'Miglioramento', value: 'improvement' },
  { label: 'Bug', value: 'bug' },
]
const typeFilterOptions = [{ label: 'Tutti i tipi', value: 'all' as const }, ...typeOptions]
async function loadRequests(): Promise<void> {
  loading.value = true
  error.value = null
  try { requests.value = await requestsService.getAll({ status: statusFilter.value, type: typeFilter.value }) }
  catch (e) { error.value = (e as Error).message }
  finally { loading.value = false }
}

async function markImportant(request: OrganizationRequest): Promise<void> {
  if (auth.isGuest || request.important_by_me) return
  try {
    const updated = await requestsService.markImportant(request.id)
    const index = requests.value.findIndex(item => item.id === request.id)
    if (index >= 0) requests.value[index] = updated
  } catch (e) { error.value = (e as Error).message }
}

async function updateRequest(request: OrganizationRequest, status: OrganizationRequestStatus): Promise<void> {
  if (!organizations.isAdmin || request.status === status) return
  try {
    const updated = await requestsService.update(request.id, { status })
    const index = requests.value.findIndex(item => item.id === request.id)
    if (index >= 0) requests.value[index] = updated
  } catch (e) { error.value = (e as Error).message }
}

function typeLabel(value: OrganizationRequestType): string { return typeOptions.find(option => option.value === value)?.label ?? value }
function typeIcon(value: OrganizationRequestType): string { return value === 'bug' ? 'pi pi-exclamation-triangle' : value === 'feature' ? 'pi pi-sparkles' : 'pi pi-wrench' }
function statusLabel(value: OrganizationRequestStatus): string { return statusOptions.find(option => option.value === value)?.label ?? value }
function statusSeverity(value: OrganizationRequestStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  if (value === 'done') return 'success'
  if (value === 'in_progress') return 'info'
  if (value === 'rejected') return 'danger'
  if (value === 'planned') return 'warn'
  return 'secondary'
}

onMounted(() => { void loadRequests() })
watch([statusFilter, typeFilter], () => { void loadRequests() })
</script>

<template>
  <section class="requests-page">
    <header class="requests-header">
      <div><p class="eyebrow">BACKLOG ORGANIZZAZIONE</p><h1>Richieste</h1><p>Idee, problemi e miglioramenti condivisi dalla community.</p></div>
      <Button v-if="!auth.isGuest" label="Nuova richiesta" icon="pi pi-plus" @click="router.push({ name: 'request-create' })" />
    </header>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <Card class="filters-card"><template #content><div class="filters-row"><div class="field"><label for="request-status-filter">Stato</label><Select id="request-status-filter" v-model="statusFilter" :options="statusFilterOptions" option-label="label" option-value="value" fluid /></div><div class="field"><label for="request-type-filter">Tipo</label><Select id="request-type-filter" v-model="typeFilter" :options="typeFilterOptions" option-label="label" option-value="value" fluid /></div><span class="request-count">{{ requests.length }} {{ requests.length === 1 ? 'richiesta' : 'richieste' }}</span></div></template></Card>

    <div v-if="requests.length" class="requests-list">
      <article v-for="request in requests" :key="request.id" class="request-row">
        <Button class="vote-button" :label="String(request.important_count)" icon="pi pi-arrow-up" size="small" severity="secondary" :outlined="!request.important_by_me" :disabled="auth.isGuest || request.important_by_me" @click="markImportant(request)" />
        <RouterLink :to="{ name: 'request-detail', params: { id: request.id } }" class="request-main">
          <span class="type-icon"><i :class="typeIcon(request.type)" /></span>
          <span class="request-copy"><strong>{{ request.title }}</strong><small><span>{{ request.created_by.name }}</span> · {{ new Date(request.created_at).toLocaleDateString('it-IT') }} · {{ typeLabel(request.type) }}</small></span>
        </RouterLink>
        <div class="request-side">
          <Image v-if="request.image_url" class="request-thumbnail" :src="request.image_url" alt="Immagine allegata" preview />
          <Tag :value="statusLabel(request.status)" :severity="statusSeverity(request.status)" />
          <Select v-if="organizations.isAdmin" :id="`request-status-${request.id}`" class="admin-status" :model-value="request.status" :options="statusOptions" option-label="label" option-value="value" @update:model-value="updateRequest(request, $event as OrganizationRequestStatus)" />
        </div>
      </article>
    </div>
    <Message v-else-if="!loading" severity="info" :closable="false">Nessuna richiesta corrisponde ai filtri selezionati.</Message>
    <div v-else class="loading-state"><i class="pi pi-spin pi-spinner" /><span>Caricamento richieste…</span></div>
  </section>
</template>

<style scoped>
.requests-page { width: min(980px, 100%); margin: 0 auto; display: grid; gap: 1rem; padding: clamp(1rem, 3vw, 2.5rem) 0; }
.requests-header, .filters-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.requests-header { align-items: flex-end; }.eyebrow { margin: 0 0 .45rem; color: var(--color-primary-700); font-size: .7rem; font-weight: 850; letter-spacing: .14em; }h1, h2 { margin: 0; color: var(--color-text); letter-spacing: -.045em; }h1 { font-size: clamp(2rem, 5vw, 3.1rem); }h2 { font-size: 1.18rem; }.requests-header p:last-child, .request-copy p { margin: .45rem 0 0; color: var(--color-text-muted); line-height: 1.55; }
.filters-card { border: 1px solid var(--color-border); box-shadow: 0 10px 26px rgb(var(--color-shadow-rgb) / 4%); }.filters-row { align-items: end; }.field { display: grid; min-width: 0; flex: 1; gap: .42rem; }.field label { color: var(--color-text-muted); font-size: .78rem; font-weight: 750; }.request-count { padding-bottom: .65rem; color: var(--color-text-subtle); font-size: .78rem; white-space: nowrap; }
.requests-list { display: grid; gap: .75rem; }.request-row { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 1rem; min-height: 6.4rem; padding: 1rem 1.15rem; border: 1px solid var(--color-border); background: var(--color-surface-card); box-shadow: 0 10px 26px rgb(var(--color-shadow-rgb) / 4%); }.vote-button { min-width: 4.3rem; border-radius: 999px; }.vote-button :deep(.p-button-label) { font-weight: 750; }.request-main { display: flex; align-items: center; min-width: 0; gap: 1rem; color: inherit; text-decoration: none; }.request-main:hover .request-copy strong { color: var(--color-primary-700); }.type-icon { display: grid; place-items: center; width: 3.3rem; height: 3.3rem; flex: 0 0 auto; border-radius: .65rem; background: var(--color-surface-soft); color: var(--color-primary-700); font-size: 1.15rem; }.request-copy { display: grid; min-width: 0; gap: .3rem; }.request-copy strong { overflow: hidden; color: var(--color-text); font-size: 1.02rem; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; transition: color 160ms ease; }.request-copy small { overflow: hidden; color: var(--color-text-muted); font-size: .78rem; text-overflow: ellipsis; white-space: nowrap; }.request-copy small span { color: var(--color-text); font-weight: 650; }.request-side { display: flex; align-items: center; justify-content: flex-end; gap: .6rem; }.request-thumbnail { display: block; overflow: hidden; border-radius: .45rem; }.request-thumbnail :deep(img) { display: block; width: 2.7rem; height: 2.7rem; object-fit: cover; }.admin-status { width: 10.5rem; }
.loading-state { display: flex; align-items: center; justify-content: center; gap: .6rem; min-height: 8rem; color: var(--color-text-muted); }
@media (max-width: 680px) { .requests-header, .filters-row { align-items: stretch; flex-direction: column; }.filters-row { gap: .8rem; }.request-count { padding-bottom: 0; }.request-row { grid-template-columns: auto minmax(0, 1fr); gap: .75rem; min-height: 5.6rem; padding: .85rem; }.request-side { grid-column: 2; justify-content: flex-start; }.request-copy strong { white-space: normal; }.admin-status { width: min(100%, 12rem); } }
</style>
