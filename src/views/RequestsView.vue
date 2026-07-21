<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import moment from 'moment'
import 'moment/locale/it.js'
import Button from 'primevue/button'
import Image from 'primevue/image'
import Message from 'primevue/message'
import ProgressSpinner from 'primevue/progressspinner'
import Select from 'primevue/select'
import Tag from 'primevue/tag'
import PageHeader from '@/components/layout/PageHeader.vue'
import { requestsService } from '@/services/requestsApi'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationsStore } from '@/stores/organizations'
import type { OrganizationRequest, OrganizationRequestStatus, OrganizationRequestType } from '@/types'

// Shared state and local request filters.
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

// Requests reload whenever either server-side filter changes.
async function loadRequests(): Promise<void> {
  loading.value = true
  error.value = null
  try {
    requests.value = await requestsService.getAll({ status: statusFilter.value, type: typeFilter.value })
  } catch (requestError) {
    error.value = (requestError as Error).message
  } finally {
    loading.value = false
  }
}

async function markImportant(request: OrganizationRequest): Promise<void> {
  if (auth.isGuest || request.important_by_me) return
  try {
    const updated = await requestsService.markImportant(request.id)
    const index = requests.value.findIndex((item) => item.id === request.id)
    if (index >= 0) requests.value[index] = updated
  } catch (requestError) {
    error.value = (requestError as Error).message
  }
}

async function updateRequest(request: OrganizationRequest, status: OrganizationRequestStatus): Promise<void> {
  if (!organizations.isAdmin || request.status === status) return
  try {
    const updated = await requestsService.update(request.id, { status })
    const index = requests.value.findIndex((item) => item.id === request.id)
    if (index >= 0) requests.value[index] = updated
  } catch (requestError) {
    error.value = (requestError as Error).message
  }
}

// Presentation mappings keep API values out of the template.
function typeLabel(value: OrganizationRequestType): string {
  return typeOptions.find((option) => option.value === value)?.label ?? value
}

function typeIcon(value: OrganizationRequestType): string {
  return value === 'bug' ? 'pi pi-exclamation-triangle' : value === 'feature' ? 'pi pi-sparkles' : 'pi pi-wrench'
}

function statusLabel(value: OrganizationRequestStatus): string {
  return statusOptions.find((option) => option.value === value)?.label ?? value
}

function statusSeverity(value: OrganizationRequestStatus): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
  if (value === 'done') return 'success'
  if (value === 'in_progress') return 'info'
  if (value === 'rejected') return 'danger'
  if (value === 'planned') return 'warn'
  return 'secondary'
}

function formatDate(value: string): string {
  const date = moment(value, moment.ISO_8601, true)
  return date.isValid() ? date.locale('it').format('L') : '—'
}

onMounted(loadRequests)
watch([statusFilter, typeFilter], loadRequests)
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <section class="mx-auto flex w-full max-w-245 flex-col gap-4 py-4 sm:py-8">
    <!-- Section: Header -->
    <PageHeader eyebrow="BACKLOG ORGANIZZAZIONE" title="Richieste" description="Idee, problemi e miglioramenti condivisi dalla community.">
      <Button v-if="!auth.isGuest" label="Nuova richiesta" icon="pi pi-plus" @click="router.push({ name: 'request-create' })" />
    </PageHeader>

    <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

    <!------------------------------>
    <!-- Section: Request filters -->
    <!------------------------------>
    <div class="flex flex-col gap-3 border border-(--color-border) bg-(--color-surface-card) p-4 shadow-sm sm:flex-row sm:items-end">
      <label for="request-status-filter" class="grid min-w-0 flex-1 gap-2 text-sm font-bold text-(--color-text-muted)">
        Stato
        <Select id="request-status-filter" v-model="statusFilter" :options="statusFilterOptions" option-label="label" option-value="value" fluid />
      </label>
      <label for="request-type-filter" class="grid min-w-0 flex-1 gap-2 text-sm font-bold text-(--color-text-muted)">
        Tipo
        <Select id="request-type-filter" v-model="typeFilter" :options="typeFilterOptions" option-label="label" option-value="value" fluid />
      </label>
      <span class="text-xs text-(--color-text-subtle) sm:pb-3">{{ requests.length }} {{ requests.length === 1 ? 'richiesta' : 'richieste' }}</span>
    </div>

    <!------------------------------>
    <!-- Section: Requests list -->
    <!------------------------------>
    <div v-if="requests.length" class="grid gap-3">
      <article
        v-for="request in requests"
        :key="request.id"
        class="grid min-h-22 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border border-(--color-border) bg-(--color-surface-card) p-3 shadow-sm sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-4 sm:p-4"
      >
        <Button
          class="min-w-17 rounded-full"
          :label="String(request.important_count)"
          icon="pi pi-arrow-up"
          size="small"
          severity="secondary"
          :outlined="!request.important_by_me"
          :disabled="auth.isGuest || request.important_by_me"
          @click="markImportant(request)"
        />

        <RouterLink :to="{ name: 'request-detail', params: { id: request.id } }" class="group flex min-w-0 items-center gap-3 text-inherit no-underline sm:gap-4">
          <span class="grid size-12 shrink-0 place-items-center bg-(--color-surface-soft) text-lg text-primary-700 sm:size-13">
            <i :class="typeIcon(request.type)" />
          </span>
          <span class="grid min-w-0 gap-1">
            <strong class="truncate text-base transition-colors group-hover:text-primary-700">{{ request.title }}</strong>
            <small class="truncate text-xs text-(--color-text-muted)"><span class="font-semibold text-(--color-text)">{{ request.created_by.name }}</span> · {{ formatDate(request.created_at) }} · {{ typeLabel(request.type) }}</small>
          </span>
        </RouterLink>

        <div class="col-start-2 flex flex-wrap items-center gap-2 sm:col-auto sm:justify-end">
          <Image v-if="request.image_url" class="block overflow-hidden [&_img]:size-11 [&_img]:object-cover" :src="request.image_url" alt="Immagine allegata" preview />
          <Tag :value="statusLabel(request.status)" :severity="statusSeverity(request.status)" />
          <Select
            v-if="organizations.isAdmin"
            :id="`request-status-${request.id}`"
            class="w-full max-w-48 sm:w-42"
            :model-value="request.status"
            :options="statusOptions"
            option-label="label"
            option-value="value"
            @update:model-value="updateRequest(request, $event as OrganizationRequestStatus)"
          />
        </div>
      </article>
    </div>

    <Message v-else-if="!loading" severity="info" :closable="false">Nessuna richiesta corrisponde ai filtri selezionati.</Message>
    <div v-else class="flex min-h-32 items-center justify-center gap-3 text-sm text-(--color-text-muted)" role="status">
      <ProgressSpinner class="size-8" stroke-width="4" />
      <span>Caricamento richieste…</span>
    </div>
  </section>
</template>
