<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import { useOrganizationsStore } from '../stores/organizations'
import OrganizationMap from '../components/organizations/OrganizationMap.vue'
import type { OrganizationVisibility } from '../types'

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

function goBack(): void {
  void router.push({ name: 'organizations' })
}

watch(() => store.activeOrganization?.id, syncForm, { immediate: true })
</script>

<template>
  <section class="organization-edit-page">
    <header class="edit-header">
      <Button icon="pi pi-arrow-left" label="Organizzazione" text severity="secondary" @click="goBack" />
      <p class="eyebrow">MODIFICA SPAZIO</p>
      <h1>{{ store.activeOrganization?.name || 'Organizzazione' }}</h1>
      <p>Aggiorna le informazioni che gli altri utenti vedono nella community.</p>
    </header>

    <form class="edit-card" @submit.prevent="save">
      <Message v-if="message" :severity="message.includes('salvat') || message.includes('rigenerato') ? 'success' : 'error'" :closable="false">{{ message }}</Message>
      <label for="edit-visibility">Visibilità<Select id="edit-visibility" v-model="visibility" :options="visibilityOptions" option-label="label" option-value="value" fluid /></label>
      <label v-if="visibility === 'private'" for="edit-discoverability">Ricerca e richieste<Select id="edit-discoverability" v-model="discoverable" :options="discoverabilityOptions" option-label="label" option-value="value" fluid /></label>
      <label>Posizione sulla mappa<OrganizationMap :interactive="true" :latitude="latitude" :longitude="longitude" @location-change="setLocation" /><small class="form-help">Clicca sulla mappa per impostare o aggiornare la posizione.</small></label>
      <label for="edit-description">Descrizione<Textarea id="edit-description" v-model="description" rows="4" maxlength="240" placeholder="Presenta brevemente la community" fluid /></label>
      <Button type="submit" label="Salva modifiche" icon="pi pi-check" :loading="busy" fluid />
    </form>

    <section class="code-card">
      <p class="eyebrow">ACCESSO</p>
      <h2>Codice invito</h2>
      <p>Condividi questo codice per permettere l’ingresso nell’organizzazione privata.</p>
      <div class="code-row"><strong>{{ store.activeOrganization?.join_code || 'Nessun codice disponibile' }}</strong><Button label="Rigenera" icon="pi pi-refresh" severity="secondary" outlined :loading="busy" @click="regenerateCode" /></div>
    </section>
  </section>
</template>

<style scoped>
.organization-edit-page { width: min(620px, 100%); margin: 0 auto; padding: clamp(.75rem, 3vw, 2.5rem) 0; }
.edit-header { margin-bottom: 1rem; }
.edit-header :deep(.p-button) { margin-left: -.75rem; }
.eyebrow { margin: 0 0 .55rem; color: var(--color-primary-700); font-size: .72rem; font-weight: 850; letter-spacing: .15em; }
.edit-header .eyebrow { margin-top: 1rem; }
h1 { margin: 0; font-size: clamp(2rem, 7vw, 3rem); letter-spacing: -.055em; }
.edit-header > p:last-child, .code-card > p:not(.eyebrow) { color: var(--color-text-muted); line-height: 1.55; }
.edit-card, .code-card { display: grid; gap: .75rem; padding: clamp(1.1rem, 4vw, 1.6rem); border: 1px solid var(--color-border); background: var(--color-surface-card); box-shadow: 0 16px 34px rgb(var(--color-shadow-rgb) / 6%); }
.edit-card label { display: grid; gap: .4rem; color: var(--color-text-muted); font-size: .78rem; font-weight: 750; }
.form-help { color: var(--color-text-muted); font-size: .75rem; font-weight: 400; line-height: 1.45; }
.code-card { margin-top: 1rem; }
.code-card h2 { margin: 0; font-size: 1.2rem; letter-spacing: -.03em; }
.code-card > p { margin: 0; }
.code-row { display: flex; align-items: center; justify-content: space-between; gap: .7rem; padding: .8rem; background: var(--color-surface-soft); }
.code-row strong { overflow: hidden; color: var(--color-primary-700); font-size: .9rem; text-overflow: ellipsis; }
@media (max-width: 520px) { .code-row { align-items: stretch; flex-direction: column; } .code-row :deep(.p-button) { width: 100%; } }
</style>
