<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import DatePicker from 'primevue/datepicker'
import Dropdown from 'primevue/dropdown'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../stores/auth'
import { useTournamentsStore } from '../stores/tournaments'
import type { Tournament, TournamentCategory, TournamentCreate, TournamentFormat, TournamentStatus } from '../types'

interface StatusOption {
  label: string
  value: 'all' | TournamentStatus
}

interface TournamentForm {
  name: string
  location: string
  start_date: Date | null
  end_date: Date | null
  format: TournamentFormat
  category: TournamentCategory
  status: TournamentStatus
  participant_limit: number | null
  group_count: number | null
  qualifiers_per_group: number | null
}

const auth = useAuthStore()
const store = useTournamentsStore()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()

const statusFilter = ref<'all' | TournamentStatus>('all')
const statusOptions: StatusOption[] = [
  { label: 'Tutti', value: 'all' },
  { label: 'In programma', value: 'upcoming' },
  { label: 'In corso', value: 'ongoing' },
  { label: 'Completati', value: 'completed' },
]

const filtered = computed(() => {
  if (statusFilter.value === 'all') return store.tournaments
  return store.tournaments.filter((t) => t.status === statusFilter.value)
})

const formatLabels: Record<TournamentFormat, string> = {
  single_elimination: 'Eliminazione diretta',
  double_elimination: 'Doppia eliminazione',
  round_robin: "Girone all'italiana",
  round_robin_elimination: 'Gironi + finale',
}

const categoryLabels: Record<TournamentCategory, string> = {
  singles: 'Singolo',
  doubles: 'Doppio',
}

const formatOptions = Object.entries(formatLabels).map(([value, label]) => ({
  label,
  value: value as TournamentFormat,
}))
const categoryOptions = Object.entries(categoryLabels).map(([value, label]) => ({
  label,
  value: value as TournamentCategory,
}))
const statusEditOptions = [
  { label: 'In programma', value: 'upcoming' },
  { label: 'In corso', value: 'ongoing' },
  { label: 'Completato', value: 'completed' },
] satisfies Array<{ label: string; value: TournamentStatus }>

const canViewAdmin = computed(() => auth.isAdmin || auth.isGuest)
const requiresGroupConfig = computed(() => form.value.format === 'round_robin_elimination')

function statusSeverity(status: TournamentStatus): 'info' | 'success' | 'secondary' {
  return { upcoming: 'info', ongoing: 'success', completed: 'secondary' }[status]
}

function statusLabel(status: TournamentStatus): string {
  return { upcoming: 'In programma', ongoing: 'In corso', completed: 'Completato' }[status]
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatParticipantLimit(limit: number | null | undefined): string {
  if (limit == null) return 'Illimitato'
  return `${limit} max`
}

const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)

function emptyForm(): TournamentForm {
  return {
    name: '',
    location: '',
    start_date: null,
    end_date: null,
    format: 'single_elimination',
    category: 'singles',
    status: 'upcoming',
    participant_limit: 32,
    group_count: null,
    qualifiers_per_group: null,
  }
}

const form = ref<TournamentForm>(emptyForm())

function openCreate(): void {
  if (auth.isGuest) return
  editingId.value = null
  form.value = emptyForm()
  dialogVisible.value = true
}

function openEdit(tournament: Tournament): void {
  if (auth.isGuest) return
  editingId.value = tournament.id
  form.value = {
    name: tournament.name,
    location: tournament.location ?? '',
    start_date: tournament.start_date ? new Date(tournament.start_date) : null,
    end_date: tournament.end_date ? new Date(tournament.end_date) : null,
    format: tournament.format,
    category: tournament.category,
    status: tournament.status,
    participant_limit: tournament.participant_limit ?? 32,
    group_count: tournament.group_count ?? null,
    qualifiers_per_group: tournament.qualifiers_per_group ?? null,
  }
  dialogVisible.value = true
}

function toDateString(value: Date | null): string | null {
  return value ? value.toISOString().split('T')[0] ?? null : null
}

function toTournamentPayload(data: TournamentForm): TournamentCreate {
  return {
    name: data.name,
    location: data.location || null,
    start_date: toDateString(data.start_date),
    end_date: toDateString(data.end_date),
    format: data.format,
    category: data.category,
    status: data.status,
    participant_limit: data.participant_limit,
    group_count: data.format === 'round_robin_elimination' ? data.group_count : null,
    qualifiers_per_group: data.format === 'round_robin_elimination' ? data.qualifiers_per_group : null,
  }
}

async function saveTournament(): Promise<void> {
  if (auth.isGuest) return
  if (!form.value.participant_limit || form.value.participant_limit < 2) {
    toast.add({ severity: 'warn', summary: 'Controlla i dati', detail: 'Inserisci un limite partecipanti valido', life: 4000 })
    return
  }
  if (form.value.format === 'round_robin_elimination') {
    if (!form.value.group_count || !form.value.qualifiers_per_group) {
      toast.add({ severity: 'warn', summary: 'Controlla i dati', detail: 'Configura gironi e qualificati per il formato gironi + finale', life: 4000 })
      return
    }
  }
  saving.value = true
  try {
    const payload = toTournamentPayload(form.value)
    if (editingId.value) {
      await store.update(editingId.value, payload)
      toast.add({ severity: 'success', summary: 'Salvato', detail: 'Torneo aggiornato', life: 3000 })
    } else {
      await store.create(payload)
      toast.add({ severity: 'success', summary: 'Creato', detail: 'Torneo creato', life: 3000 })
    }
    dialogVisible.value = false
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (e as Error).message, life: 4000 })
  } finally {
    saving.value = false
  }
}

function confirmDelete(tournament: Tournament): void {
  if (auth.isGuest) return
  confirm.require({
    message: `Eliminare il torneo "${tournament.name}"? Tutti i dati correlati verranno rimossi.`,
    header: 'Conferma eliminazione',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Annulla',
    acceptLabel: 'Elimina',
    acceptSeverity: 'danger',
    accept: async () => {
      try {
        await store.remove(tournament.id)
        toast.add({ severity: 'success', summary: 'Eliminato', detail: `${tournament.name} rimosso`, life: 3000 })
      } catch (e) {
        toast.add({ severity: 'error', summary: 'Errore', detail: (e as Error).message, life: 4000 })
      }
    },
  })
}

onMounted(() => store.fetchAll())
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 class="m-0 text-2xl">Tornei</h2>
        <p class="mt-1 mb-0 text-sm text-muted-color">{{ store.tournaments.length }} tornei totali</p>
      </div>
      <Button v-if="canViewAdmin" label="Nuovo torneo" icon="pi pi-plus" :disabled="auth.isGuest" @click="openCreate" />
    </div>

    <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
      <SelectButton
        v-model="statusFilter"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        aria-label="Filtra per stato"
        class="hidden sm:inline-flex"
      />
      <Dropdown
        v-model="statusFilter"
        :options="statusOptions"
        option-label="label"
        option-value="value"
        aria-label="Filtra per stato"
        class="w-full sm:hidden"
        fluid
      />
    </div>

    <div v-if="store.loading" class="flex flex-col items-center gap-3 py-10 text-muted-color text-center">
      <i class="pi pi-spin pi-spinner text-[2rem] text-primary-500" />
    </div>

    <div v-else-if="filtered.length === 0" class="flex flex-col items-center gap-3 py-10 text-muted-color text-center">
      <i class="pi pi-trophy text-[2.5rem] text-muted-color" />
      <p class="m-0 leading-relaxed">Nessun torneo trovato.<br>Clicca <strong>Nuovo torneo</strong> per iniziare.</p>
    </div>

    <div v-else class="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-4">
      <Card
        v-for="t in filtered"
        :key="t.id"
        class="cursor-pointer"
        @click="router.push({ name: 'tournament-detail', params: { id: t.id } })"
      >
        <template #header>
          <div class="flex items-center justify-between px-[0.875rem] pt-[0.875rem]">
            <Tag :value="statusLabel(t.status)" :severity="statusSeverity(t.status)" />
            <div class="flex gap-[0.125rem]">
              <Button v-if="canViewAdmin" icon="pi pi-pencil" text rounded size="small" aria-label="Modifica" :disabled="auth.isGuest" @click.stop="openEdit(t)" />
              <Button v-if="canViewAdmin" icon="pi pi-trash" text rounded size="small" severity="danger" aria-label="Elimina" :disabled="auth.isGuest" @click.stop="confirmDelete(t)" />
            </div>
          </div>
        </template>

        <template #title>
          <div class="flex items-center gap-2">
            <span class="text-[1.0625rem] font-semibold">{{ t.name }}</span>
            <Tag v-if="!t.published" value="Bozza" severity="secondary" class="text-xs" />
          </div>
        </template>

        <template #subtitle>
          <span v-if="t.location" class="flex items-center gap-[0.375rem] text-[0.8125rem] text-muted-color">
            <i class="pi pi-map-marker" /> {{ t.location }}
          </span>
        </template>

        <template #content>
          <div class="flex flex-col gap-2 mt-2">
            <div class="flex items-center gap-2 text-sm text-muted-color">
              <i class="pi pi-calendar text-[0.8125rem] w-4 text-center" />
              <span>{{ formatDate(t.start_date) }}
                <template v-if="t.end_date"> → {{ formatDate(t.end_date) }}</template>
              </span>
            </div>
            <div class="flex items-center gap-2 text-sm text-muted-color">
              <i class="pi pi-sitemap text-[0.8125rem] w-4 text-center" />
              <span>{{ formatLabels[t.format] ?? t.format }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm text-muted-color">
              <i class="pi pi-user text-[0.8125rem] w-4 text-center" />
              <span>{{ categoryLabels[t.category] ?? t.category }}</span>
            </div>
            <div class="flex items-center gap-2 text-sm text-muted-color">
              <i class="pi pi-users text-[0.8125rem] w-4 text-center" />
              <span>Limite partecipanti: {{ formatParticipantLimit(t.participant_limit) }}</span>
            </div>
            <div v-if="t.format === 'round_robin_elimination'" class="flex items-center gap-2 text-sm text-muted-color">
              <i class="pi pi-sitemap text-[0.8125rem] w-4 text-center" />
              <span>
                {{ t.group_count ?? '—' }} gironi · {{ t.qualifiers_per_group ?? '—' }} qualificati/girone
              </span>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>

  <Dialog
    v-model:visible="dialogVisible"
    :header="editingId ? 'Modifica torneo' : 'Nuovo torneo'"
    :style="{ width: '460px' }"
    modal
  >
    <form class="flex flex-col gap-4 pt-2" @submit.prevent="saveTournament">
      <div class="flex flex-col gap-[0.375rem]">
        <label for="t-name" class="text-sm font-medium">Nome *</label>
        <InputText id="t-name" v-model="form.name" placeholder="Torneo Estivo 2025" fluid required autofocus />
      </div>

      <div class="flex flex-col gap-[0.375rem]">
        <label for="t-location" class="text-sm font-medium">Sede</label>
        <InputText id="t-location" v-model="form.location" placeholder="TC Milano" fluid />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-[0.375rem]">
          <label class="text-sm font-medium">Data inizio</label>
          <DatePicker v-model="form.start_date" date-format="dd/mm/yy" placeholder="gg/mm/aaaa" fluid show-button-bar />
        </div>
        <div class="flex flex-col gap-[0.375rem]">
          <label class="text-sm font-medium">Data fine</label>
          <DatePicker v-model="form.end_date" date-format="dd/mm/yy" placeholder="gg/mm/aaaa" fluid show-button-bar />
        </div>
      </div>

      <div class="flex flex-col gap-[0.375rem]">
        <label class="text-sm font-medium">Formato</label>
        <Select v-model="form.format" :options="formatOptions" option-label="label" option-value="value" fluid />
      </div>

      <div class="flex flex-col gap-[0.375rem]">
        <label class="text-sm font-medium">Limite partecipanti *</label>
        <InputNumber
          v-model="form.participant_limit"
          :min="2"
          :use-grouping="false"
          placeholder="Es. 32"
          fluid
        />
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div class="flex flex-col gap-[0.375rem]">
          <label class="text-sm font-medium">Categoria</label>
          <Select v-model="form.category" :options="categoryOptions" option-label="label" option-value="value" fluid />
        </div>
        <div class="flex flex-col gap-[0.375rem]">
          <label class="text-sm font-medium">Stato</label>
          <Select v-model="form.status" :options="statusEditOptions" option-label="label" option-value="value" fluid />
        </div>
      </div>

      <div v-if="requiresGroupConfig" class="rounded-lg border border-surface-200 bg-surface-50 p-3">
        <div class="mb-3 text-sm font-semibold text-color">Configurazione gironi</div>
        <div class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-[0.375rem]">
            <label class="text-sm font-medium">Numero gironi *</label>
            <InputNumber
              v-model="form.group_count"
              :min="1"
              :use-grouping="false"
              placeholder="Es. 4"
              fluid
            />
          </div>
          <div class="flex flex-col gap-[0.375rem]">
            <label class="text-sm font-medium">Qualificati per girone *</label>
            <InputNumber
              v-model="form.qualifiers_per_group"
              :min="1"
              :use-grouping="false"
              placeholder="Es. 2"
              fluid
            />
          </div>
        </div>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" label="Annulla" severity="secondary" outlined @click="dialogVisible = false" />
        <Button type="submit" :label="editingId ? 'Salva' : 'Crea'" :loading="saving" />
      </div>
    </form>
  </Dialog>
</template>
