<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import OrganizationMap from '@/components/organizations/OrganizationMap.vue'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationsStore } from '@/stores/organizations'
import type { OrganizationVisibility } from '@/types'

// Route services, store and local form state.
const router = useRouter()
const route = useRoute()
const store = useOrganizationsStore()
const auth = useAuthStore()
const isOnboarding = computed(() => route.name === 'onboarding-organization')
const name = ref('')
const description = ref('')
const visibility = ref<OrganizationVisibility>('private')
const latitude = ref<number | null>(null)
const longitude = ref<number | null>(null)
const discoverable = ref(false)
const busy = ref(false)
const error = ref<string | null>(null)

const visibilityOptions: Array<{ label: string; value: OrganizationVisibility }> = [
  { label: 'Privata · accesso con codice', value: 'private' },
  { label: 'Pubblica · trovabile da tutti', value: 'public' },
]
const discoverabilityOptions = [
  { label: 'Visibile sulla mappa · consenti richieste', value: true },
  { label: 'Nascosta · accesso solo con codice', value: false },
]

// Map coordinates are rounded before persistence to keep payloads stable.
function setLocation(location: { latitude: number; longitude: number }): void {
  latitude.value = Number(location.latitude.toFixed(6))
  longitude.value = Number(location.longitude.toFixed(6))
}

async function createOrganization(): Promise<void> {
  busy.value = true
  error.value = null
  try {
    const isVisibleOnMap = visibility.value === 'public' || discoverable.value
    if (isVisibleOnMap && (latitude.value === null || longitude.value === null)) {
      error.value = 'Per rendere l’organizzazione visibile sulla mappa seleziona una posizione.'
      return
    }
    await store.create(
      name.value,
      visibility.value,
      latitude.value,
      longitude.value,
      isVisibleOnMap,
      description.value.trim() || null,
    )
    await auth.refresh()
    await router.push({ name: isOnboarding.value ? 'dashboard' : 'tournaments' })
  } catch (requestError) {
    error.value = (requestError as Error).message
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <main :class="isOnboarding ? 'min-h-svh bg-(--color-surface-soft) px-4 py-6 sm:px-6 sm:py-10' : ''">
  <section class="mx-auto w-full max-w-155" :class="isOnboarding ? '' : 'py-3 sm:py-8'">
    <!-- Section: Header -->
    <header class="mb-4">
      <Button
        icon="pi pi-arrow-left"
        :label="isOnboarding ? 'Torna alla scelta' : 'Organizzazioni'"
        text
        severity="secondary"
        @click="router.push({ name: isOnboarding ? 'onboarding' : 'organizations' })"
      />
      <p class="mb-2 mt-4 text-xs font-extrabold tracking-[0.15em] text-primary">{{ isOnboarding ? 'CONFIGURAZIONE · ORGANIZZATORE' : 'NUOVO SPAZIO' }}</p>
      <h1 class="text-3xl font-bold tracking-tight sm:text-5xl">Crea un’organizzazione</h1>
      <p class="mt-3 leading-relaxed text-(--color-text-muted)">Configura il tuo spazio e diventa il suo proprietario.</p>
    </header>

    <!------------------------------>
    <!-- Section: Organization form -->
    <!------------------------------>
    <form class="grid gap-3 rounded-xl border border-(--color-border) bg-(--color-surface-card) p-4 sm:p-6" @submit.prevent="createOrganization">
      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

      <label for="organization-name" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">
        Nome organizzazione
        <InputText id="organization-name" v-model="name" placeholder="Es. Tennis Club Aurora" minlength="2" fluid required />
      </label>

      <label for="organization-description" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">
        Descrizione
        <Textarea id="organization-description" v-model="description" rows="4" maxlength="240" placeholder="Presenta brevemente la community" fluid />
      </label>

      <label for="organization-visibility" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">
        Visibilità
        <Select id="organization-visibility" v-model="visibility" :options="visibilityOptions" option-label="label" option-value="value" fluid />
      </label>

      <label v-if="visibility === 'private'" for="organization-discoverability" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">
        Ricerca e richieste
        <Select id="organization-discoverability" v-model="discoverable" :options="discoverabilityOptions" option-label="label" option-value="value" fluid />
      </label>

      <div class="grid gap-2 text-sm font-bold text-(--color-text-muted)">
        <span>Posizione sulla mappa</span>
        <OrganizationMap :interactive="true" :latitude="latitude" :longitude="longitude" @location-change="setLocation" />
        <small class="text-xs font-normal leading-relaxed">Obbligatoria per le organizzazioni pubbliche. Clicca sulla mappa per impostarla.</small>
      </div>

      <Button type="submit" label="Crea organizzazione" icon="pi pi-check" icon-pos="right" :loading="busy" fluid />
    </form>

    <!-- Section: Explorer navigation -->
    <Button v-if="!isOnboarding" label="Esplora organizzazioni" icon="pi pi-map" text @click="router.push({ name: 'organizations-explore' })" />
  </section>
  </main>
</template>
