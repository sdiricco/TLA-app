<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import OrganizationMap from '@/components/organizations/OrganizationMap.vue'
import { useOrganizationsStore } from '@/stores/organizations'
import type { OrganizationVisibility } from '@/types'

// Route services, store and local form state.
const router = useRouter()
const store = useOrganizationsStore()
const busy = ref(false)
const message = ref<string | null>(null)
const description = ref('')
const discoverable = ref(false)
const latitude = ref<number | null>(null)
const longitude = ref<number | null>(null)
const visibility = ref<OrganizationVisibility>('private')

const visibilityOptions: Array<{ label: string; value: OrganizationVisibility }> = [
  { label: 'Privata · solo con codice', value: 'private' },
  { label: 'Pubblica · visibile nella ricerca', value: 'public' },
]
const discoverabilityOptions = [
  { label: 'Visibile sulla mappa · consenti richieste', value: true },
  { label: 'Nascosta · accesso solo con codice', value: false },
]

// Rehydrate the form whenever the active organization changes.
function syncForm(): void {
  const organization = store.activeOrganization
  description.value = organization?.description ?? ''
  discoverable.value = organization?.discoverable ?? organization?.visibility === 'public'
  latitude.value = organization?.latitude ?? null
  longitude.value = organization?.longitude ?? null
  visibility.value = organization?.visibility ?? 'private'
  message.value = null
}

function setLocation(location: { latitude: number; longitude: number }): void {
  latitude.value = Number(location.latitude.toFixed(6))
  longitude.value = Number(location.longitude.toFixed(6))
}

async function save(): Promise<void> {
  const organization = store.activeOrganization
  if (!organization) return
  busy.value = true
  message.value = null
  try {
    await store.update(organization.id, {
      visibility: visibility.value,
      description: description.value.trim() || null,
      discoverable: visibility.value === 'public' || discoverable.value,
      latitude: latitude.value,
      longitude: longitude.value,
    })
    message.value = 'Modifiche salvate.'
  } catch (error) {
    message.value = (error as Error).message
  } finally {
    busy.value = false
  }
}

async function regenerateCode(): Promise<void> {
  const organization = store.activeOrganization
  if (!organization) return
  busy.value = true
  message.value = null
  try {
    await store.update(organization.id, { regenerateCode: true })
    message.value = 'Codice rigenerato.'
  } catch (error) {
    message.value = (error as Error).message
  } finally {
    busy.value = false
  }
}

watch(() => store.activeOrganization?.id, syncForm, { immediate: true })
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <section class="mx-auto w-full max-w-155 py-3 sm:py-8">
    <!-- Section: Header -->
    <header class="mb-4">
      <Button class="-ml-3" icon="pi pi-arrow-left" label="Organizzazione" text severity="secondary" @click="router.push({ name: 'organizations' })" />
      <p class="mb-2 mt-4 text-xs font-extrabold tracking-[0.15em] text-primary-700">MODIFICA SPAZIO</p>
      <h1 class="text-3xl font-bold tracking-tight sm:text-5xl">{{ store.activeOrganization?.name || 'Organizzazione' }}</h1>
      <p class="mt-3 leading-relaxed text-(--color-text-muted)">Aggiorna le informazioni che gli altri utenti vedono nella community.</p>
    </header>

    <!------------------------------>
    <!-- Section: Organization form -->
    <!------------------------------>
    <form class="grid gap-3 border border-(--color-border) bg-(--color-surface-card) p-4 shadow-sm sm:p-6" @submit.prevent="save">
      <Message v-if="message" :severity="message.includes('salvat') || message.includes('rigenerato') ? 'success' : 'error'" :closable="false">{{ message }}</Message>
      <label for="edit-visibility" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Visibilità<Select id="edit-visibility" v-model="visibility" :options="visibilityOptions" option-label="label" option-value="value" fluid /></label>
      <label v-if="visibility === 'private'" for="edit-discoverability" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Ricerca e richieste<Select id="edit-discoverability" v-model="discoverable" :options="discoverabilityOptions" option-label="label" option-value="value" fluid /></label>
      <div class="grid gap-2 text-sm font-bold text-(--color-text-muted)">
        <span>Posizione sulla mappa</span>
        <OrganizationMap :interactive="true" :latitude="latitude" :longitude="longitude" @location-change="setLocation" />
        <small class="text-xs font-normal leading-relaxed">Clicca sulla mappa per impostare o aggiornare la posizione.</small>
      </div>
      <label for="edit-description" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Descrizione<Textarea id="edit-description" v-model="description" rows="4" maxlength="240" placeholder="Presenta brevemente la community" fluid /></label>
      <Button type="submit" label="Salva modifiche" icon="pi pi-check" :loading="busy" fluid />
    </form>

    <!------------------------------>
    <!-- Section: Invitation code -->
    <!------------------------------>
    <section class="mt-4 grid gap-3 border border-(--color-border) bg-(--color-surface-card) p-4 shadow-sm sm:p-6">
      <p class="text-xs font-extrabold tracking-[0.15em] text-primary-700">ACCESSO</p>
      <h2 class="text-xl font-bold tracking-tight">Codice invito</h2>
      <p class="leading-relaxed text-(--color-text-muted)">Condividi questo codice per permettere l’ingresso nell’organizzazione privata.</p>
      <div class="flex flex-col items-stretch justify-between gap-3 bg-(--color-surface-soft) p-3 sm:flex-row sm:items-center">
        <strong class="truncate text-sm text-primary-700">{{ store.activeOrganization?.join_code || 'Nessun codice disponibile' }}</strong>
        <Button label="Rigenera" icon="pi pi-refresh" severity="secondary" outlined :loading="busy" @click="regenerateCode" />
      </div>
    </section>
  </section>
</template>
