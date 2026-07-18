<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import { useOrganizationsStore } from '../stores/organizations'
import OrganizationMap from '../components/organizations/OrganizationMap.vue'
import type { OrganizationVisibility } from '../types'

const router = useRouter()
const store = useOrganizationsStore()
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

function setLocation(location: { latitude: number; longitude: number }): void {
  latitude.value = Number(location.latitude.toFixed(6))
  longitude.value = Number(location.longitude.toFixed(6))
}

async function createOrganization(): Promise<void> {
  busy.value = true
  error.value = null
  try {
    if ((visibility.value === 'public' || discoverable.value) && (latitude.value === null || longitude.value === null)) {
      error.value = 'Per rendere l’organizzazione visibile sulla mappa seleziona una posizione.'
      return
    }
    await store.create(name.value, visibility.value, latitude.value, longitude.value, visibility.value === 'public' || discoverable.value, description.value.trim() || null)
    await router.push({ name: 'tournaments' })
  } catch (requestError) {
    error.value = (requestError as Error).message
  } finally {
    busy.value = false
  }
}

function goBack(): void {
  void router.push({ name: 'organizations' })
}

function goToExplorer(): void {
  void router.push({ name: 'organizations-explore' })
}
</script>

<template>
  <section class="organization-create-page">
    <header class="create-header">
      <Button icon="pi pi-arrow-left" label="Organizzazioni" text severity="secondary" @click="goBack" />
      <p class="eyebrow">NUOVO SPAZIO</p>
      <h1>Crea un’organizzazione</h1>
      <p>Configura il tuo spazio e diventa il suo proprietario.</p>
    </header>

    <form class="create-card" @submit.prevent="createOrganization">
      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>
      <label for="organization-name">Nome organizzazione</label>
      <InputText id="organization-name" v-model="name" placeholder="Es. Tennis Club Aurora" minlength="2" fluid required />
      <label for="organization-description">Descrizione<Textarea id="organization-description" v-model="description" rows="4" maxlength="240" placeholder="Presenta brevemente la community" fluid /></label>
      <label for="organization-visibility">Visibilità</label>
      <Select id="organization-visibility" v-model="visibility" :options="visibilityOptions" option-label="label" option-value="value" fluid />
      <label v-if="visibility === 'private'" for="organization-discoverability">Ricerca e richieste</label>
      <Select v-if="visibility === 'private'" id="organization-discoverability" v-model="discoverable" :options="discoverabilityOptions" option-label="label" option-value="value" fluid />
      <label>Posizione sulla mappa<OrganizationMap :interactive="true" :latitude="latitude" :longitude="longitude" @location-change="setLocation" /><small class="form-help">Obbligatoria per le organizzazioni pubbliche. Clicca sulla mappa per impostarla.</small></label>
      <Button type="submit" label="Crea organizzazione" icon="pi pi-check" icon-pos="right" :loading="busy" fluid />
    </form>

    <Button label="Esplora organizzazioni" icon="pi pi-map" text @click="goToExplorer" />
  </section>
</template>

<style scoped>
.organization-create-page { width: min(620px, 100%); margin: 0 auto; padding: clamp(.75rem, 3vw, 2.5rem) 0; }
.create-header { margin-bottom: 1rem; }
.create-header :deep(.p-button) { margin-left: -.75rem; }
.eyebrow { margin: 0 0 .55rem; color: var(--color-primary-700); font-size: .72rem; font-weight: 850; letter-spacing: .15em; }
.create-header .eyebrow { margin-top: 1rem; }
h1 { margin: 0; font-size: clamp(2rem, 7vw, 3rem); letter-spacing: -.055em; }
.create-header > p:last-child, .alternative-card > p:not(.eyebrow) { color: var(--color-text-muted); line-height: 1.55; }
.create-card, .alternative-card { display: grid; gap: .75rem; padding: clamp(1.1rem, 4vw, 1.6rem); border: 1px solid var(--color-border); background: var(--color-surface-card); box-shadow: 0 16px 34px rgb(var(--color-shadow-rgb) / 6%); }
.create-card label { display: grid; gap: .4rem; color: var(--color-text-muted); font-size: .78rem; font-weight: 750; }
.form-help { color: var(--color-text-muted); font-size: .75rem; font-weight: 400; line-height: 1.45; }
</style>
