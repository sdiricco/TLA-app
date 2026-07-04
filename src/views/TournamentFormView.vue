<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import DatePicker from 'primevue/datepicker'
import Dropdown from 'primevue/dropdown'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import Tag from 'primevue/tag'
import { tournamentCategoryDefinitions, tournamentFormatDefinitions } from '../config/tournamentFormats'
import { useAuthStore } from '../stores/auth'
import { useFeatureFlagsStore } from '../stores/featureFlags'
import { useTournamentsStore } from '../stores/tournaments'
import type { TournamentCategory, TournamentCreate, TournamentFormat, TournamentStatus } from '../types'

interface TournamentForm {
  name: string
  location: string
  registration_start_date: Date | null
  registration_end_date: Date | null
  game_formula: string
  registration_fee: number | null
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
const featureFlags = useFeatureFlagsStore()
const store = useTournamentsStore()
const toast = useToast()

const saving = ref(false)
const editingId = ref<string | null>(null)
const loadingTournament = ref(false)
const form = ref<TournamentForm>({
  name: '',
  location: '',
  registration_start_date: null,
  registration_end_date: null,
  game_formula: '',
  registration_fee: null,
  start_date: null,
  end_date: null,
  format: 'single_elimination',
  category: 'maschile',
  status: 'upcoming',
  participant_limit: 32,
  group_count: null,
  qualifiers_per_group: null,
})

const statusOptions = [
  { label: 'In programma', value: 'upcoming' },
  { label: 'In corso', value: 'ongoing' },
  { label: 'Completato', value: 'completed' },
] satisfies Array<{ label: string; value: TournamentStatus }>

const categoryOptions = computed(() =>
  tournamentCategoryDefinitions.map((definition) => ({
    label: definition.title,
    value: definition.category,
    disabled: !featureFlags.isTournamentCategoryEnabled(definition.category),
  })),
)

const requiresGroupConfig = computed(() => form.value.format === 'round_robin_elimination')
const isEditing = computed(() => editingId.value !== null)
const formatCards = computed(() =>
  tournamentFormatDefinitions.map((definition) => {
    const enabled = definition.format === 'round_robin' || featureFlags.isTournamentFormatEnabled(definition.format)
    const selected = form.value.format === definition.format
    return {
      ...definition,
      enabled,
      selected,
      locked: definition.locked === true,
      selectable: enabled || selected,
    }
  }),
)

function normalizeCategory(category: string): TournamentCategory {
  const candidate = category === 'doubles' ? 'femminile' : category
  if (candidate === 'maschile' || candidate === 'femminile') {
    if (featureFlags.isTournamentCategoryEnabled(candidate)) return candidate
  }
  return featureFlags.enabledTournamentCategories[0] ?? 'maschile'
}

function selectFormat(format: TournamentFormat): void {
  if (format === 'round_robin' || featureFlags.isTournamentFormatEnabled(format) || form.value.format === format) {
    form.value.format = format
  }
}

function emptyForm(): TournamentForm {
  return {
    name: '',
    location: '',
    registration_start_date: null,
    registration_end_date: null,
    game_formula: '',
    registration_fee: null,
    start_date: null,
    end_date: null,
    format: 'single_elimination',
    category: featureFlags.enabledTournamentCategories[0] ?? 'maschile',
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
    registration_start_date: toDateString(data.registration_start_date),
    registration_end_date: toDateString(data.registration_end_date),
    game_formula: data.game_formula || null,
    registration_fee: data.registration_fee,
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
      registration_start_date: tournament.registration_start_date
        ? new Date(tournament.registration_start_date)
        : null,
      registration_end_date: tournament.registration_end_date
        ? new Date(tournament.registration_end_date)
        : null,
      game_formula: tournament.game_formula ?? '',
      registration_fee: tournament.registration_fee ?? null,
      start_date: tournament.start_date ? new Date(tournament.start_date) : null,
      end_date: tournament.end_date ? new Date(tournament.end_date) : null,
      format: tournament.format,
      category: normalizeCategory(tournament.category),
      status: tournament.status,
      participant_limit: tournament.participant_limit ?? 32,
      group_count: tournament.group_count ?? null,
      qualifiers_per_group: tournament.qualifiers_per_group ?? null,
    }
  } catch (error) {
    toast.add({
      severity: 'error',
      summary: 'Errore',
      detail: (error as Error).message || 'Impossibile caricare il torneo',
      life: 3000,
    })
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
    <div class="tournament-form-header">
      <div>
        <button type="button" class="back-link" @click="cancel">
          <i class="pi pi-arrow-left" />
          <span>Indietro</span>
        </button>
        <h2 class="m-0 text-2xl">{{ isEditing ? 'Modifica torneo' : 'Nuovo torneo' }}</h2>
        <p class="mt-1 mb-0 text-sm text-muted-color">
          {{ isEditing ? 'Aggiorna i dati del torneo' : 'Crea un nuovo torneo' }}
        </p>
      </div>
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

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="flex flex-col gap-[0.375rem]">
              <label class="text-sm font-medium">Data inizio iscrizioni</label>
              <DatePicker v-model="form.registration_start_date" date-format="dd/mm/yy" placeholder="gg/mm/aaaa" fluid show-button-bar />
            </div>
            <div class="flex flex-col gap-[0.375rem]">
              <label class="text-sm font-medium">Data termine iscrizioni</label>
              <DatePicker v-model="form.registration_end_date" date-format="dd/mm/yy" placeholder="gg/mm/aaaa" fluid show-button-bar />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="flex flex-col gap-[0.375rem]">
              <label for="t-game-formula" class="text-sm font-medium">Formula di gioco</label>
              <InputText id="t-game-formula" v-model="form.game_formula" placeholder="Es. 2 set su 3 con tie-break" fluid />
            </div>
            <div class="flex flex-col gap-[0.375rem]">
              <label class="text-sm font-medium">Quota iscrizione</label>
              <InputNumber v-model="form.registration_fee" mode="currency" currency="EUR" locale="it-IT" :min="0" :max-fraction-digits="2" fluid />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
            <label class="text-sm font-medium">Formato *</label>
            <div class="grid gap-3 md:grid-cols-2">
              <Card
                v-for="item in formatCards"
                :key="item.format"
                class="overflow-hidden transition-all duration-150"
                :class="[
                  item.selectable ? 'cursor-pointer' : 'cursor-not-allowed',
                  item.selected ? 'border-primary-300 bg-primary-50/60 shadow-sm' : 'border-surface-200',
                  !item.selectable ? 'opacity-60 grayscale' : 'hover:border-primary-200 hover:bg-surface-50',
                ]"
                @click="selectFormat(item.format)"
              >
                <template #content>
                  <div class="flex h-full flex-col gap-3">
                    <div class="flex items-start justify-between gap-3">
                      <div class="flex items-center gap-3">
                        <div
                          class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                          :class="item.selected ? 'bg-primary-100 text-primary-600' : 'bg-surface-100 text-muted-color'"
                        >
                          <i :class="[item.icon, 'text-lg']" />
                        </div>
                        <div>
                          <h3 class="m-0 text-base font-semibold">{{ item.title }}</h3>
                          <p class="mt-1 mb-0 text-sm text-muted-color leading-relaxed">
                            {{ item.description }}
                          </p>
                        </div>
                      </div>
                      <Tag
                        :value="item.selectable ? (item.selected ? 'Selezionato' : 'Disponibile') : 'Coming soon'"
                        :severity="item.selectable ? (item.selected ? 'success' : 'info') : 'secondary'"
                      />
                    </div>

                    <div class="flex items-center justify-between gap-3 pt-1 text-sm">
                      <span class="text-muted-color">
                        {{ item.selectable ? 'Puoi selezionarlo ora' : 'Bloccato per il momento' }}
                      </span>
                      <span v-if="item.selected" class="font-semibold text-primary-600">Attivo</span>
                    </div>
                  </div>
                </template>
              </Card>
            </div>
          </div>

          <div class="flex flex-col gap-[0.375rem]">
            <label class="text-sm font-medium">Limite partecipanti *</label>
            <InputNumber v-model="form.participant_limit" :min="2" :use-grouping="false" placeholder="Es. 32" fluid />
          </div>

          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div class="flex flex-col gap-[0.375rem]">
              <label class="text-sm font-medium">Categoria torneo *</label>
              <p class="m-0 text-xs text-muted-color">
                Definisce se il torneo è maschile o femminile.
              </p>
              <Dropdown
                v-model="form.category"
                :options="categoryOptions"
                option-label="label"
                option-value="value"
                option-disabled="disabled"
                fluid
              />
            </div>
            <div class="flex flex-col gap-[0.375rem]">
              <label class="text-sm font-medium">Stato iniziale</label>
              <p class="m-0 text-xs text-muted-color">
                Indica in che fase parte il torneo: programmato, in corso o completato.
              </p>
              <Dropdown v-model="form.status" :options="statusOptions" option-label="label" option-value="value" fluid />
            </div>
          </div>

          <div v-if="requiresGroupConfig" class="rounded-lg border border-surface-200 bg-surface-50 p-3">
            <div class="mb-3 text-sm font-semibold text-color">Configurazione gironi</div>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <div class="tournament-form-actions flex justify-end gap-2 pt-2">
            <Button type="button" label="Annulla" severity="secondary" outlined @click="cancel" />
            <Button type="submit" :label="isEditing ? 'Salva' : 'Crea'" :loading="saving" />
          </div>
        </form>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.tournament-form-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.back-link { display: inline-flex; min-height: 2.5rem; align-items: center; gap: 0.45rem; margin: 0 0 0.65rem; padding: 0; border: 0; background: transparent; color: #63716b; font-size: 0.8125rem; font-weight: 700; cursor: pointer; }
.back-link:hover { color: var(--app-green); }

@media (max-width: 640px) {
  h2 { font-size: 1.65rem; line-height: 1.1; }
  form { gap: 0.9rem; }
  :deep(.p-card-body), :deep(.p-card-content) { padding: 0.75rem; }
  .tournament-form-actions { margin: 0 -0.75rem -0.75rem; padding: 0.75rem !important; border-top: 1px solid #e5ece9; background: #fff; }
  .tournament-form-actions :deep(.p-button) { flex: 1; }
}
</style>
