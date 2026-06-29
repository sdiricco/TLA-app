<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Dropdown from 'primevue/dropdown'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../stores/auth'
import { useTournamentsStore } from '../stores/tournaments'
import type { Tournament, TournamentCategory, TournamentFormat, TournamentStatus } from '../types'

interface StatusOption {
  label: string
  value: 'all' | TournamentStatus
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

const canViewAdmin = computed(() => auth.isAdmin || auth.isGuest)

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

function openCreate(): void {
  if (auth.isGuest) return
  void router.push({ name: 'tournament-create' })
}

function openEdit(tournament: Tournament): void {
  if (auth.isGuest) return
  void router.push({ name: 'tournament-edit', params: { id: tournament.id } })
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
              <span>Limite partecipanti: {{ t.participant_limit ?? 'Illimitato' }}</span>
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

</template>
