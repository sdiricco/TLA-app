<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import DatePicker from 'primevue/datepicker'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../stores/auth'
import { useTournamentsStore } from '../stores/tournaments'
import type { Tournament, TournamentCategory, TournamentCreate, TournamentFormat, TournamentStatus } from '../types'

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

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const store = useTournamentsStore()
const toast = useToast()

const saving = ref(false)
const editingId = ref<string | null>(null)
const loadingTournament = ref(false)
const form = ref<TournamentForm>({
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

const statusOptions = [
  { label: 'In programma', value: 'upcoming' },
  { label: 'In corso', value: 'ongoing' },
  { label: 'Completato', value: 'completed' },
] satisfies Array<{ label: string; value: TournamentStatus }>

const requiresGroupConfig = computed(() => form.value.format === 'round_robin_elimination')
const isEditing = computed(() => editingId.value !== null)

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

async function loadTournament(id: string): Promise<void> {
  loadingTournament.value = true
  try {
    const tournament = await store.getById(id)
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
  } catch {
    toast.add({ severity: 'error', summary: 'Errore', detail: 'Torneo non trovato', life: 3000 })
    await router.push({ name: 'tournaments' })
  } finally {
    loadingTournament.value = false
  }
}

async function saveTournament(): Promise<void> {
  if (auth.isGuest) return
  if (!form.value.participant_limit || form.value.participant_limit < 2) {
    toast.add({ severity: 'warn', summary: 'Controlla i dati', detail: 'Inserisci un limite partecipanti valido', life: 4000 })
    return
  }
  if (form.value.format === 'round_robin_elimination' && (!form.value.group_count || !form.value.qualifiers_per_group)) {
    toast.add({ severity: 'warn', summary: 'Controlla i dati', detail: 'Configura gironi e qualificati per il formato gironi + finale', life: 4000 })
    return
  }

  saving.value = true
  try {
    const payload = toTournamentPayload(form.value)
    const tournament = isEditing.value
      ? await store.update(editingId.value as string, payload)
      : await store.create(payload)

    toast.add({
      severity: 'success',
      summary: 'Salvato',
      detail: isEditing.value ? 'Torneo aggiornato' : 'Torneo creato',
      life: 3000,
    })
    await router.push({ name: 'tournament-detail', params: { id: tournament.id } })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (e as Error).message, life: 4000 })
  } finally {
    saving.value = false
  }
}

async function cancel(): Promise<void> {
  if (editingId.value) {
    await router.push({ name: 'tournament-detail', params: { id: editingId.value } })
    return
  }
  await router.push({ name: 'tournaments' })
}

watch(
  () => route.params['id'],
  async (id) => {
    editingId.value = id ? String(id) : null
    if (!editingId.value) {
      form.value = emptyForm()
      return
    }
    await loadTournament(editingId.value)
  },
  { immediate: true },
)

onMounted(() => {
  if (!editingId.value) form.value = emptyForm()
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 class="m-0 text-2xl">{{ isEditing ? 'Modifica torneo' : 'Nuovo torneo' }}</h2>
        <p class="mt-1 mb-0 text-sm text-muted-color">
          {{ isEditing ? 'Aggiorna i dati del torneo' : 'Crea un nuovo torneo' }}
        </p>
      </div>
      <Button label="Annulla" severity="secondary" outlined @click="cancel" />
    </div>

    <div v-if="loadingTournament" class="flex justify-center py-10">
      <i class="pi pi-spin pi-spinner text-[2rem] text-primary-500" />
    </div>

    <Card v-else>
      <template #content>
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
            <InputNumber v-model="form.participant_limit" :min="2" :use-grouping="false" placeholder="Es. 32" fluid />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-[0.375rem]">
              <label class="text-sm font-medium">Categoria</label>
              <Select v-model="form.category" :options="categoryOptions" option-label="label" option-value="value" fluid />
            </div>
            <div class="flex flex-col gap-[0.375rem]">
              <label class="text-sm font-medium">Stato</label>
              <Select v-model="form.status" :options="statusOptions" option-label="label" option-value="value" fluid />
            </div>
          </div>

          <div v-if="requiresGroupConfig" class="rounded-lg border border-surface-200 bg-surface-50 p-3">
            <div class="mb-3 text-sm font-semibold text-color">Configurazione gironi</div>
            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-[0.375rem]">
                <label class="text-sm font-medium">Numero gironi *</label>
                <InputNumber v-model="form.group_count" :min="1" :use-grouping="false" placeholder="Es. 4" fluid />
              </div>
              <div class="flex flex-col gap-[0.375rem]">
                <label class="text-sm font-medium">Qualificati per girone *</label>
                <InputNumber v-model="form.qualifiers_per_group" :min="1" :use-grouping="false" placeholder="Es. 2" fluid />
              </div>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-2">
            <Button type="button" label="Annulla" severity="secondary" outlined @click="cancel" />
            <Button type="submit" :label="isEditing ? 'Salva' : 'Crea'" :loading="saving" />
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>
