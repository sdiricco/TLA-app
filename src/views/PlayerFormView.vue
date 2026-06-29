<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import DatePicker from 'primevue/datepicker'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../stores/auth'
import { usePlayersStore } from '../stores/players'
import type { Player, PlayerCreate } from '../types'

interface PlayerForm {
  name: string
  ranking: number | null
  birth_date: Date | null
  photo_url: string
  club: string
  phone: string
}

interface PhotoDraft {
  source: string
  fileName: string
  naturalWidth: number
  naturalHeight: number
  zoom: number
  offsetX: number
  offsetY: number
}

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const store = usePlayersStore()
const toast = useToast()

const saving = ref(false)
const loadingPlayer = ref(false)
const photoInput = ref<HTMLInputElement | null>(null)
const photoDraft = ref<PhotoDraft | null>(null)
const photoDragState = ref<{ active: boolean; startX: number; startY: number; startOffsetX: number; startOffsetY: number }>({
  active: false,
  startX: 0,
  startY: 0,
  startOffsetX: 0,
  startOffsetY: 0,
})

const editingId = computed(() => (route.params['id'] ? String(route.params['id']) : null))
const isEditing = computed(() => editingId.value !== null)

const form = ref<PlayerForm>({
  name: '',
  ranking: null,
  birth_date: null,
  photo_url: '',
  club: '',
  phone: '',
})

function emptyForm(): PlayerForm {
  return { name: '', ranking: null, birth_date: null, photo_url: '', club: '', phone: '' }
}

function toDateString(value: Date | null): string | null {
  return value ? value.toISOString().split('T')[0] ?? null : null
}

function toPlayerPayload(data: PlayerForm): PlayerCreate {
  return {
    name: data.name,
    ranking: data.ranking ?? 0,
    birth_date: toDateString(data.birth_date),
    photo_url: data.photo_url || null,
    club: data.club || null,
    phone: data.phone || null,
  }
}

function formatAge(birthDate: string | null | undefined): string {
  if (!birthDate) return 'Età non disponibile'
  const dob = new Date(birthDate)
  if (Number.isNaN(dob.getTime())) return 'Età non disponibile'
  const diff = Date.now() - dob.getTime()
  const ageDate = new Date(diff)
  return `${Math.abs(ageDate.getUTCFullYear() - 1970)} anni`
}

function openPhotoPicker(): void {
  photoInput.value?.click()
}

function clearPhoto(): void {
  form.value.photo_url = ''
}

function clampPhotoOffset(draft: PhotoDraft): PhotoDraft {
  const previewSize = 320
  const baseScale = Math.max(previewSize / draft.naturalWidth, previewSize / draft.naturalHeight)
  const drawWidth = draft.naturalWidth * baseScale * draft.zoom
  const drawHeight = draft.naturalHeight * baseScale * draft.zoom
  const maxOffsetX = Math.max(0, drawWidth / 2 - previewSize / 2)
  const maxOffsetY = Math.max(0, drawHeight / 2 - previewSize / 2)

  return {
    ...draft,
    offsetX: Math.min(maxOffsetX, Math.max(-maxOffsetX, draft.offsetX)),
    offsetY: Math.min(maxOffsetY, Math.max(-maxOffsetY, draft.offsetY)),
  }
}

function startPhotoDrag(event: PointerEvent): void {
  if (!photoDraft.value) return
  photoDragState.value = {
    active: true,
    startX: event.clientX,
    startY: event.clientY,
    startOffsetX: photoDraft.value.offsetX,
    startOffsetY: photoDraft.value.offsetY,
  }
  window.addEventListener('pointermove', onPhotoDragMove)
  window.addEventListener(
    'pointerup',
    () => {
      stopPhotoDrag()
    },
    { once: true },
  )
}

function onPhotoDragMove(event: PointerEvent): void {
  if (!photoDraft.value || !photoDragState.value.active) return
  photoDraft.value = clampPhotoOffset({
    ...photoDraft.value,
    offsetX: photoDragState.value.startOffsetX + (event.clientX - photoDragState.value.startX),
    offsetY: photoDragState.value.startOffsetY + (event.clientY - photoDragState.value.startY),
  })
}

function stopPhotoDrag(): void {
  photoDragState.value.active = false
  window.removeEventListener('pointermove', onPhotoDragMove)
}

async function handlePhotoFileChange(event: Event): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.add({ severity: 'warn', summary: 'File non valido', detail: 'Seleziona un file immagine', life: 3000 })
    return
  }

  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Impossibile leggere il file immagine'))
    reader.readAsDataURL(file)
  })

  const image = new Image()
  image.src = source
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Immagine non valida'))
  })

  photoDraft.value = clampPhotoOffset({
    source,
    fileName: file.name,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
  })
}

function photoPreviewStyle(): Record<string, string> {
  if (!photoDraft.value) return {}
  const previewSize = 320
  const baseScale = Math.max(previewSize / photoDraft.value.naturalWidth, previewSize / photoDraft.value.naturalHeight)
  const drawWidth = photoDraft.value.naturalWidth * baseScale * photoDraft.value.zoom
  const drawHeight = photoDraft.value.naturalHeight * baseScale * photoDraft.value.zoom
  return {
    width: `${drawWidth}px`,
    height: `${drawHeight}px`,
    transform: `translate(-50%, -50%) translate(${photoDraft.value.offsetX}px, ${photoDraft.value.offsetY}px)`,
  }
}

function setPhotoZoom(value: number | null): void {
  if (!photoDraft.value || value == null) return
  photoDraft.value = clampPhotoOffset({
    ...photoDraft.value,
    zoom: value,
  })
}

async function applyCroppedPhoto(): Promise<void> {
  if (!photoDraft.value) return
  const previewSize = 320
  const outputSize = 512
  const image = new Image()
  image.src = photoDraft.value.source
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Immagine non valida'))
  })

  const baseScale = Math.max(previewSize / photoDraft.value.naturalWidth, previewSize / photoDraft.value.naturalHeight)
  const drawWidth = photoDraft.value.naturalWidth * baseScale * photoDraft.value.zoom
  const drawHeight = photoDraft.value.naturalHeight * baseScale * photoDraft.value.zoom
  const canvas = document.createElement('canvas')
  canvas.width = outputSize
  canvas.height = outputSize
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas non disponibile')

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, outputSize, outputSize)
  const scale = outputSize / previewSize
  const x = ((previewSize - drawWidth) / 2 + photoDraft.value.offsetX) * scale
  const y = ((previewSize - drawHeight) / 2 + photoDraft.value.offsetY) * scale
  ctx.drawImage(image, x, y, drawWidth * scale, drawHeight * scale)

  form.value.photo_url = canvas.toDataURL('image/jpeg', 0.92)
  photoDraft.value = null
}

function cancelPhotoCrop(): void {
  photoDraft.value = null
}

async function loadPlayer(id: string): Promise<void> {
  loadingPlayer.value = true
  try {
    const player = await store.getById(id)
    form.value = {
      name: player.name,
      ranking: player.ranking,
      birth_date: player.birth_date ? new Date(player.birth_date) : null,
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

    toast.add({
      severity: 'success',
      summary: 'Salvato',
      detail: isEditing.value ? 'Giocatore aggiornato' : 'Giocatore creato',
      life: 3000,
    })
    await router.push({ name: 'player-detail', params: { id: player.id } })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (e as Error).message, life: 4000 })
  } finally {
    saving.value = false
  }
}

async function cancel(): Promise<void> {
  if (editingId.value) {
    await router.push({ name: 'player-detail', params: { id: editingId.value } })
    return
  }
  await router.push({ name: 'players' })
}

onMounted(() => {
  form.value = emptyForm()
})

watch(
  editingId,
  async (id) => {
    if (!id) {
      form.value = emptyForm()
      return
    }
    await loadPlayer(id)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopPhotoDrag()
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 class="m-0 text-2xl">{{ isEditing ? 'Modifica giocatore' : 'Nuovo giocatore' }}</h2>
        <p class="mt-1 mb-0 text-sm text-muted-color">
          {{ isEditing ? 'Aggiorna i dati dell’anagrafica' : 'Inserisci i dati anagrafici del nuovo giocatore' }}
        </p>
      </div>
      <Button label="Annulla" severity="secondary" outlined @click="cancel" />
    </div>

    <div v-if="loadingPlayer" class="flex justify-center py-10">
      <i class="pi pi-spin pi-spinner text-[2rem] text-primary-500" />
    </div>

    <Card v-else>
      <template #content>
        <form class="flex flex-col gap-5" @submit.prevent="savePlayer">
          <div class="grid gap-4 lg:grid-cols-2">
            <div class="flex flex-col gap-[0.375rem]">
              <label for="p-name" class="text-sm font-medium">Nome *</label>
              <InputText id="p-name" v-model="form.name" placeholder="Mario Rossi" fluid required autofocus />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div class="flex flex-col gap-[0.375rem]">
                <label for="p-ranking" class="text-sm font-medium">Ranking</label>
                <InputNumber id="p-ranking" v-model="form.ranking" placeholder="1" :min="1" :max="9999" fluid />
              </div>
              <div class="flex flex-col gap-[0.375rem]">
                <label for="p-birth-date" class="text-sm font-medium">Data nascita</label>
                <DatePicker
                  id="p-birth-date"
                  v-model="form.birth_date"
                  date-format="dd/mm/yy"
                  placeholder="gg/mm/aaaa"
                  fluid
                  show-button-bar
                />
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-[0.375rem]">
            <label class="text-sm font-medium">Foto profilo</label>
            <div class="rounded-2xl border border-dashed border-surface-300 bg-surface-50 p-3">
              <div class="flex flex-col gap-3 sm:flex-row sm:items-start">
                <div
                  class="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-surface-300 bg-surface-0 shadow-sm"
                >
                  <img
                    v-if="form.photo_url"
                    :src="form.photo_url"
                    alt="Anteprima foto profilo"
                    class="h-full w-full object-cover"
                  />
                  <div v-else class="flex flex-col items-center gap-2 text-center text-muted-color">
                    <i class="pi pi-image text-2xl" />
                    <span class="text-xs">Nessuna foto</span>
                  </div>
                </div>

                <div class="flex min-w-0 flex-1 flex-col gap-2">
                  <p class="m-0 text-sm text-muted-color">
                    Carica una foto del giocatore, ritagliala nel riquadro quadrato e adattala prima di salvare.
                  </p>
                  <div class="flex flex-wrap gap-2">
                    <Button type="button" label="Carica immagine" icon="pi pi-upload" size="small" @click="openPhotoPicker" />
                    <Button
                      type="button"
                      label="Rimuovi"
                      icon="pi pi-trash"
                      size="small"
                      severity="secondary"
                      outlined
                      :disabled="!form.photo_url"
                      @click="clearPhoto"
                    />
                  </div>
                </div>
              </div>
            </div>
            <input ref="photoInput" type="file" accept="image/*" class="hidden" @change="handlePhotoFileChange" />
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <div class="flex flex-col gap-[0.375rem]">
              <label for="p-club" class="text-sm font-medium">Club</label>
              <InputText id="p-club" v-model="form.club" placeholder="TC Milano" fluid />
            </div>

            <div class="flex flex-col gap-[0.375rem]">
              <label for="p-phone" class="text-sm font-medium">Contatto</label>
              <InputText id="p-phone" v-model="form.phone" placeholder="333-0000000" fluid />
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

  <div v-if="photoDraft" class="mt-4 rounded-2xl border border-surface-200 bg-surface-50 p-4">
    <div class="flex flex-col gap-2">
      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div class="font-semibold text-color">Ritaglia immagine</div>
          <p class="m-0 text-xs text-muted-color">Trascina per spostare, usa lo zoom per adattare il ritaglio.</p>
        </div>
        <Button label="Annulla" severity="secondary" outlined size="small" @click="cancelPhotoCrop" />
      </div>

      <div
        class="relative mx-auto h-[320px] w-[320px] overflow-hidden rounded-3xl border border-surface-300 bg-slate-100"
        @pointerdown.prevent="startPhotoDrag"
      >
        <img
          :src="photoDraft.source"
          :alt="photoDraft.fileName"
          class="absolute left-1/2 top-1/2 select-none max-w-none"
          :style="photoPreviewStyle()"
          draggable="false"
        />
      </div>
    </div>

    <div class="mt-4 flex flex-col gap-2">
      <label class="text-sm font-medium">Zoom</label>
      <InputNumber
        :model-value="photoDraft.zoom"
        :min="1"
        :max="3"
        :step="0.05"
        :use-grouping="false"
        fluid
        @update:model-value="setPhotoZoom"
      />
    </div>

    <div class="mt-4 flex justify-end gap-2">
      <Button label="Annulla" severity="secondary" outlined @click="cancelPhotoCrop" />
      <Button label="Applica ritaglio" @click="applyCroppedPhoto" />
    </div>
  </div>
</template>
