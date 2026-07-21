<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import moment from 'moment'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Skeleton from 'primevue/skeleton'
import { useToast } from 'primevue/usetoast'
import PlayerPhotoPicker from '@/components/player/PlayerPhotoPicker.vue'
import { useAuthStore } from '@/stores/auth'
import { usePlayersStore } from '@/stores/players'
import type { PlayerCreate } from '@/types'

interface PlayerForm {
  name: string
  ranking: number | null
  birth_date: Date | null
  photo_url: string
  club: string
  phone: string
}

// Route services, stores and form state.
const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const store = usePlayersStore()
const toast = useToast()
const saving = ref(false)
const loadingPlayer = ref(false)
const form = ref<PlayerForm>(emptyForm())

const editingId = computed(() => route.params['id'] ? String(route.params['id']) : null)
const isEditing = computed(() => editingId.value !== null)
const previewInitials = computed(() =>
  form.value.name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('') || '?',
)

function emptyForm(): PlayerForm {
  return { name: '', ranking: null, birth_date: null, photo_url: '', club: '', phone: '' }
}

function toPlayerPayload(data: PlayerForm): PlayerCreate {
  return {
    name: data.name,
    ranking: data.ranking ?? 0,
    birth_date: data.birth_date ? moment(data.birth_date).format('YYYY-MM-DD') : null,
    photo_url: data.photo_url || null,
    club: data.club || null,
    phone: data.phone || null,
  }
}

// Editing routes hydrate the form; create routes always start clean.
async function fetchPlayer(id: string): Promise<void> {
  loadingPlayer.value = true
  try {
    const player = await store.getById(id)
    const birthDate = player.birth_date ? moment(player.birth_date, 'YYYY-MM-DD', true) : null
    form.value = {
      name: player.name,
      ranking: player.ranking,
      birth_date: birthDate?.isValid() ? birthDate.toDate() : null,
      photo_url: player.photo_url ?? '',
      club: player.club ?? '',
      phone: player.phone ?? '',
    }
  } catch {
    toast.add({ severity: 'error', summary: 'Errore', detail: 'Giocatore non trovato', life: 3000 })
    await router.push({ name: 'players' })
  } finally {
    loadingPlayer.value = false
  }
}

async function savePlayer(): Promise<void> {
  if (auth.isGuest) return
  saving.value = true
  try {
    const payload = toPlayerPayload(form.value)
    const player = isEditing.value
      ? await store.update(editingId.value as string, payload)
      : await store.create(payload)
    toast.add({ severity: 'success', summary: 'Salvato', detail: isEditing.value ? 'Giocatore aggiornato' : 'Giocatore creato', life: 3000 })
    await router.push({ name: 'player-detail', params: { id: player.id } })
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (error as Error).message, life: 4000 })
  } finally {
    saving.value = false
  }
}

async function cancel(): Promise<void> {
  await router.push(editingId.value
    ? { name: 'player-detail', params: { id: editingId.value } }
    : { name: 'players' })
}

watch(editingId, async (id) => {
  if (id) await fetchPlayer(id)
  else form.value = emptyForm()
}, { immediate: true })
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <div class="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 text-(--color-text) sm:gap-6">
    <!-- Section: Header -->
    <header>
      <Button class="-ml-3 mb-2" :label="isEditing ? 'Torna al profilo' : 'Tutti i giocatori'" icon="pi pi-arrow-left" text severity="secondary" @click="cancel" />
      <p class="mb-2 hidden text-xs font-extrabold tracking-[0.16em] text-primary-700 sm:block">{{ isEditing ? 'MODIFICA ATLETA' : 'NUOVO ATLETA' }}</p>
      <h1 class="text-3xl font-bold tracking-tight sm:text-5xl">{{ isEditing ? 'Aggiorna il profilo.' : 'Aggiungi un giocatore.' }}</h1>
      <p class="mt-3 hidden text-(--color-text-muted) sm:block">{{ isEditing ? 'Mantieni aggiornati dati personali e informazioni sportive.' : 'Crea una nuova identità sportiva nel roster del circolo.' }}</p>
    </header>

    <!-- Section: Loading form -->
    <div v-if="loadingPlayer" class="grid items-start gap-4 lg:grid-cols-[minmax(15rem,0.32fr)_minmax(0,1fr)]"><div class="flex flex-col items-center gap-4 border border-(--color-border) bg-(--color-surface-card) p-8"><Skeleton shape="circle" size="8rem" /><Skeleton width="75%" height="2rem" /><Skeleton width="45%" height="1rem" /></div><div class="flex min-h-125 flex-col gap-4 border border-(--color-border) bg-(--color-surface-card) p-5"><Skeleton v-for="item in 5" :key="item" width="100%" height="4rem" /></div></div>

    <!------------------------------>
    <!-- Section: Player form -->
    <!------------------------------>
    <form v-else class="grid items-start gap-4 lg:grid-cols-[minmax(15rem,0.32fr)_minmax(0,1fr)]" @submit.prevent="savePlayer">
      <!-- Live profile preview -->
      <aside class="flex flex-col items-center overflow-hidden border border-(--color-border) bg-primary-800 p-4 text-center text-white shadow-sm lg:sticky lg:top-4 lg:min-h-107 lg:p-6">
        <p class="mb-5 hidden self-stretch text-left text-xs font-extrabold tracking-wider text-primary-300 sm:block">ANTEPRIMA PROFILO</p>
        <div class="relative"><Avatar :label="previewInitials" :image="form.photo_url || undefined" shape="circle" class="size-16! bg-surface-100! text-lg! text-(--color-text-muted)! sm:size-32! sm:text-3xl!" /><span class="absolute bottom-1 right-1 size-4 rounded-full border-3 border-primary-800 bg-(--color-accent)" /></div>
        <h2 class="mt-4 max-w-full truncate text-xl font-bold">{{ form.name || 'Nome giocatore' }}</h2>
        <p class="mt-2 flex items-center gap-2 text-sm text-primary-300"><i class="pi pi-building-columns" /> {{ form.club || 'Club non specificato' }}</p>
        <div class="mt-6 hidden w-full border-t border-primary-700 pt-4 sm:grid"><small class="text-[0.65rem] font-extrabold tracking-widest text-(--color-accent)">RANKING</small><strong class="mt-1 text-2xl">#{{ form.ranking || '—' }}</strong><span class="text-xs text-primary-300">Posizione nel club</span></div>
        <div class="mt-auto hidden items-center gap-2 pt-6 text-left text-xs text-primary-300 sm:flex"><i class="pi pi-eye" /><span>L’anteprima si aggiorna mentre compili il modulo.</span></div>
      </aside>

      <!-- Form fields -->
      <section class="border border-(--color-border) bg-(--color-surface-card) p-4 shadow-sm sm:p-6 lg:p-8">
        <div class="flex flex-col gap-5">
          <header class="flex items-center gap-3"><span class="grid size-10 shrink-0 place-items-center bg-primary-50 text-primary-700"><i class="pi pi-user" /></span><div><h2 class="font-bold">Identità sportiva</h2><p class="mt-1 text-xs text-(--color-text-subtle)">Nome e posizione nel ranking</p></div></header>
          <div class="grid gap-4 sm:grid-cols-[minmax(0,1.8fr)_minmax(9rem,0.5fr)]">
            <label for="p-name" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Nome *<InputText id="p-name" v-model="form.name" placeholder="Mario Rossi" fluid required autofocus /></label>
            <label for="p-ranking" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Ranking<InputNumber id="p-ranking" v-model="form.ranking" placeholder="1" :min="1" :max="9999" fluid /></label>
          </div>
        </div>

        <div class="my-6 h-px bg-(--color-surface-muted)" />

        <div class="flex flex-col gap-5">
          <header class="flex items-center gap-3"><span class="grid size-10 shrink-0 place-items-center bg-primary-50 text-primary-700"><i class="pi pi-address-book" /></span><div><h2 class="font-bold">Anagrafica e contatti</h2><p class="mt-1 text-xs text-(--color-text-subtle)">Informazioni personali del giocatore</p></div></header>
          <div class="grid gap-4 sm:grid-cols-2">
            <label for="p-birth-date" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Data nascita<DatePicker id="p-birth-date" v-model="form.birth_date" date-format="dd/mm/yy" placeholder="gg/mm/aaaa" fluid show-button-bar /></label>
            <label for="p-club" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Club<InputText id="p-club" v-model="form.club" placeholder="TC Milano" fluid /></label>
            <label for="p-phone" class="grid gap-2 text-sm font-bold text-(--color-text-muted) sm:col-span-2">Contatto<InputText id="p-phone" v-model="form.phone" placeholder="333 0000000" fluid /></label>
          </div>
        </div>

        <div class="my-6 h-px bg-(--color-surface-muted)" />

        <div class="flex flex-col gap-5"><header class="flex items-center gap-3"><span class="grid size-10 shrink-0 place-items-center bg-primary-50 text-primary-700"><i class="pi pi-camera" /></span><div><h2 class="font-bold">Foto profilo</h2><p class="mt-1 text-xs text-(--color-text-subtle)">Immagine quadrata per avatar e scheda atleta</p></div></header><PlayerPhotoPicker v-model="form.photo_url" /></div>

        <footer class="-mx-4 -mb-4 mt-7 flex flex-col items-stretch justify-between gap-3 border-t border-(--color-surface-muted) bg-(--color-surface-soft) p-4 sm:-mx-6 sm:-mb-6 sm:flex-row sm:items-center sm:px-6 lg:-mx-8 lg:-mb-8 lg:px-8"><span class="hidden items-center gap-2 text-xs text-(--color-text-subtle) sm:flex"><i class="pi pi-info-circle" /> I campi contrassegnati con * sono obbligatori.</span><div class="grid grid-cols-[1fr_1.3fr] gap-2"><Button type="button" label="Annulla" severity="secondary" outlined @click="cancel" /><Button type="submit" :label="isEditing ? 'Salva modifiche' : 'Crea giocatore'" icon="pi pi-check" :loading="saving" /></div></footer>
      </section>
    </form>
  </div>
</template>
