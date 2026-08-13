<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import moment from 'moment'
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
  <div class="mx-auto flex w-full max-w-5xl flex-col gap-4 text-(--color-text) sm:gap-5">
    <!-- Section: Header -->
    <header class="grid gap-3">
      <Button
        class="w-fit"
        :label="isEditing ? 'Torna al profilo' : 'Tutti i giocatori'"
        icon="pi pi-arrow-left"
        text
        severity="secondary"
        @click="cancel"
      />
      <div>
        <h1 class="text-3xl font-bold tracking-tight sm:text-5xl">
          {{ isEditing ? 'Modifica profilo giocatore' : 'Nuovo giocatore' }}
        </h1>
        <p class="mt-3 hidden text-(--color-text-muted) sm:block">
          {{ isEditing ? 'Aggiorna identità, contatti e informazioni sportive.' : 'Inserisci identità, contatti e informazioni sportive.' }}
        </p>
      </div>
    </header>

    <!-- Section: Loading form -->
    <div v-if="loadingPlayer" class="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-card)">
      <div class="grid gap-5 p-4 sm:grid-cols-2 sm:p-6">
        <Skeleton class="sm:col-span-2" width="11rem" height="1.5rem" />
        <Skeleton v-for="item in 5" :key="item" width="100%" height="4.5rem" />
      </div>
      <div class="border-t border-(--color-border) bg-(--color-surface-soft) p-4 sm:p-5"><Skeleton width="16rem" height="2.75rem" /></div>
    </div>

    <!------------------------------>
    <!-- Section: Player form -->
    <!------------------------------>
    <form
      v-else
      class="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-card)"
      @submit.prevent="savePlayer"
    >
      <!------------------------------>
      <!-- Section: Player information -->
      <!------------------------------>
      <section class="grid gap-5 p-4 sm:p-6 lg:p-7">
        <header class="flex items-center gap-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
            <i class="pi pi-id-card" />
          </span>
          <div>
            <h2 class="font-bold">Informazioni giocatore</h2>
            <p class="mt-1 text-xs text-(--color-text-subtle)">Dati anagrafici, sportivi e di contatto</p>
          </div>
        </header>

        <div class="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          <label for="p-name" class="grid gap-2 text-sm font-bold text-(--color-text-muted) sm:col-span-2">
            <span>Nome completo <span class="text-red-700" aria-hidden="true">*</span></span>
            <InputText id="p-name" v-model="form.name" placeholder="Mario Rossi" fluid required autofocus />
            <small class="font-normal text-(--color-text-subtle)">Nome visualizzato nelle liste, nei tabelloni e nel profilo.</small>
          </label>
          <label for="p-birth-date" class="grid content-start gap-2 text-sm font-bold text-(--color-text-muted)">
            Data di nascita
            <DatePicker id="p-birth-date" v-model="form.birth_date" date-format="dd/mm/yy" placeholder="gg/mm/aaaa" fluid show-button-bar />
          </label>
          <label for="p-ranking" class="grid content-start gap-2 text-sm font-bold text-(--color-text-muted)">
            Ranking nel club
            <InputNumber id="p-ranking" v-model="form.ranking" placeholder="Es. 12" :min="1" :max="9999" fluid />
          </label>
          <label for="p-club" class="grid content-start gap-2 text-sm font-bold text-(--color-text-muted)">
            Club
            <InputText id="p-club" v-model="form.club" placeholder="Es. TC Milano" fluid />
          </label>
          <label for="p-phone" class="grid content-start gap-2 text-sm font-bold text-(--color-text-muted)">
            Telefono
            <InputText id="p-phone" v-model="form.phone" type="tel" autocomplete="tel" placeholder="Es. 333 0000000" fluid />
          </label>
        </div>
      </section>

      <!------------------------------>
      <!-- Section: Profile photo -->
      <!------------------------------>
      <section class="grid gap-5 border-t border-(--color-border) p-4 sm:p-6 lg:p-7">
        <header class="flex items-center gap-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
            <i class="pi pi-camera" />
          </span>
          <div>
            <h2 class="font-bold">Foto profilo</h2>
            <p class="mt-1 text-xs text-(--color-text-subtle)">Immagine quadrata mostrata nel profilo del giocatore</p>
          </div>
        </header>
        <PlayerPhotoPicker v-model="form.photo_url" />
      </section>

      <!------------------------------>
      <!-- Section: Form actions -->
      <!------------------------------>
      <footer class="flex flex-col items-stretch justify-between gap-3 border-t border-(--color-border) bg-(--color-surface-soft) p-4 sm:flex-row sm:items-center sm:p-5 lg:px-7">
        <span class="hidden items-center gap-2 text-xs text-(--color-text-subtle) sm:flex">
          <i class="pi pi-info-circle" />
          I campi contrassegnati con * sono obbligatori.
        </span>
        <div class="grid grid-cols-[1fr_1.3fr] gap-2 sm:flex">
          <Button type="button" label="Annulla" severity="secondary" outlined @click="cancel" />
          <Button
            type="submit"
            :label="isEditing ? 'Salva modifiche' : 'Crea giocatore'"
            icon="pi pi-check"
            :loading="saving"
          />
        </div>
      </footer>
    </form>
  </div>
</template>
