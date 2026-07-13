<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { useAuthStore } from '../stores/auth'
import { useOrganizationsStore } from '../stores/organizations'
import { organizationsService } from '../services/organizationsApi'
import type { OrganizationPreview, OrganizationVisibility } from '../types'

const router = useRouter()
const auth = useAuthStore()
const store = useOrganizationsStore()
const name = ref('')
const joinCode = ref('')
const visibility = ref<OrganizationVisibility>('private')
const search = ref('')
const discoverOrganizations = ref<OrganizationPreview[]>([])
const discoverPage = ref(1)
const discoverTotal = ref(0)
const discoverHasMore = ref(false)
const busy = ref(false)
const joiningId = ref<string | null>(null)
const settingsBusy = ref(false)
const settingsMessage = ref<string | null>(null)
const settingsDescription = ref('')
const settingsCity = ref('')
const settingsSport = ref('')
const settingsVisibility = ref<OrganizationVisibility>('private')
const localError = ref<string | null>(null)
const hasOrganizations = computed(() => store.organizations.length > 0)

async function createOrganization(): Promise<void> {
  busy.value = true
  localError.value = null
  try {
    await store.create(name.value, visibility.value)
    await router.push({ name: 'tournaments' })
  } catch (error) {
    localError.value = (error as Error).message
  } finally {
    busy.value = false
  }
}

async function loadDiscover(reset = true): Promise<void> {
  try {
    const page = reset ? 1 : discoverPage.value + 1
    const response = await organizationsService.discover(search.value, page)
    discoverOrganizations.value = reset ? response.items : [...discoverOrganizations.value, ...response.items]
    discoverPage.value = response.page
    discoverTotal.value = response.total
    discoverHasMore.value = response.has_more
  } catch (error) {
    localError.value = (error as Error).message
  }
}

function syncOrganizationSettings(): void {
  const organization = store.activeOrganization
  settingsDescription.value = organization?.description ?? ''
  settingsCity.value = organization?.city ?? ''
  settingsSport.value = organization?.sport ?? ''
  settingsVisibility.value = organization?.visibility ?? 'private'
  settingsMessage.value = null
}

async function saveOrganizationSettings(): Promise<void> {
  const organization = store.activeOrganization
  if (!organization) return
  settingsBusy.value = true
  settingsMessage.value = null
  try {
    await store.update(organization.id, {
      visibility: settingsVisibility.value,
      description: settingsDescription.value.trim() || null,
      city: settingsCity.value.trim() || null,
      sport: settingsSport.value.trim() || null,
    })
    settingsMessage.value = 'Impostazioni salvate.'
    void loadDiscover()
  } catch (error) {
    settingsMessage.value = (error as Error).message
  } finally {
    settingsBusy.value = false
  }
}

async function regenerateOrganizationCode(): Promise<void> {
  const organization = store.activeOrganization
  if (!organization) return
  settingsBusy.value = true
  settingsMessage.value = null
  try {
    await store.update(organization.id, { regenerateCode: true })
    settingsMessage.value = 'Codice rigenerato.'
  } catch (error) {
    settingsMessage.value = (error as Error).message
  } finally {
    settingsBusy.value = false
  }
}

async function joinPublicOrganization(organization: OrganizationPreview): Promise<void> {
  joiningId.value = organization.id
  localError.value = null
  try {
    await store.joinPublic(organization.id)
    await router.push({ name: 'tournaments' })
  } catch (error) {
    localError.value = (error as Error).message
  } finally {
    joiningId.value = null
  }
}

async function joinOrganization(): Promise<void> {
  busy.value = true
  localError.value = null
  try {
    await store.join(joinCode.value)
    await router.push({ name: 'tournaments' })
  } catch (error) {
    localError.value = (error as Error).message
  } finally {
    busy.value = false
  }
}

function openOrganization(id: string): void {
  store.select(id)
  void router.push({ name: 'tournaments' })
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => { void loadDiscover() })
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { void loadDiscover() }, 250)
})
watch(() => store.activeOrganization?.id, syncOrganizationSettings, { immediate: true })
</script>

<template>
  <section class="organizations-page">
    <header>
      <p class="eyebrow">I TUOI SPAZI</p>
      <h1>{{ auth.isGuest ? 'Scopri le organizzazioni' : hasOrganizations ? 'Le tue organizzazioni' : 'Crea il tuo primo spazio' }}</h1>
      <p>{{ auth.isGuest ? 'Esplora le community pubbliche e consulta tornei e giocatori.' : 'Community pubbliche da scoprire, spazi privati da condividere con un codice.' }}</p>
    </header>

    <Message v-if="localError" severity="error" :closable="false">{{ localError }}</Message>

    <div v-if="hasOrganizations" class="organization-list">
      <button v-for="organization in store.organizations" :key="organization.id" type="button" @click="openOrganization(organization.id)">
        <span class="organization-icon"><i class="pi pi-building" /></span>
        <span><strong>{{ organization.name }}</strong><small>{{ organization.visibility === 'public' ? 'Pubblica' : 'Privata' }} · {{ organization.role === 'owner' ? 'Proprietario' : organization.role === 'admin' ? 'Amministratore' : 'Membro' }}<template v-if="organization.join_code"> · Codice: {{ organization.join_code }}</template></small></span>
        <i class="pi pi-arrow-right" />
      </button>
    </div>

    <section v-if="store.activeOrganization && store.isAdmin" class="settings-card">
      <div class="section-heading">
        <div><p class="eyebrow">GESTIONE SPAZIO</p><h2>{{ store.activeOrganization.name }}</h2></div>
        <span>{{ store.activeOrganization.role === 'owner' ? 'Proprietario' : 'Amministratore' }}</span>
      </div>
      <div class="settings-grid">
        <label for="settings-visibility">Visibilità<select id="settings-visibility" v-model="settingsVisibility" class="native-select"><option value="private">Privata · solo con codice</option><option value="public">Pubblica · visibile nella ricerca</option></select></label>
        <label for="settings-city">Città<InputText id="settings-city" v-model="settingsCity" placeholder="Es. Roma" fluid /></label>
        <label for="settings-sport">Sport<InputText id="settings-sport" v-model="settingsSport" placeholder="Es. Tennis" fluid /></label>
        <label for="settings-description" class="full-width">Descrizione<textarea id="settings-description" v-model="settingsDescription" class="native-textarea" rows="3" maxlength="240" placeholder="Presenta brevemente la community" /></label>
      </div>
      <div class="settings-actions">
        <Button label="Salva impostazioni" icon="pi pi-check" :loading="settingsBusy" @click="saveOrganizationSettings" />
        <Button label="Rigenera codice" icon="pi pi-refresh" severity="secondary" outlined :loading="settingsBusy" @click="regenerateOrganizationCode" />
        <small v-if="settingsMessage" class="settings-message">{{ settingsMessage }}</small>
      </div>
      <p v-if="store.activeOrganization.join_code" class="current-code">Codice attuale: <strong>{{ store.activeOrganization.join_code }}</strong></p>
    </section>

    <section class="discover-section">
      <div class="section-heading">
        <div><p class="eyebrow">SCOPRI</p><h2>Organizzazioni pubbliche</h2></div>
        <span>{{ discoverTotal }} risultati</span>
      </div>
      <InputText v-model="search" placeholder="Cerca per nome, città o sport" fluid />
      <div v-if="discoverOrganizations.length" class="discover-list">
        <article v-for="organization in discoverOrganizations" :key="organization.id" class="discover-card">
          <div class="organization-icon"><i class="pi pi-users" /></div>
          <div class="discover-copy"><strong>{{ organization.name }}</strong><small>{{ [organization.city, organization.sport].filter(Boolean).join(' · ') || 'Community sportiva' }} · {{ organization.member_count }} membri</small><p v-if="organization.description">{{ organization.description }}</p></div>
          <Button v-if="!auth.isGuest && !store.organizations.some(item => item.id === organization.id)" label="Entra" icon="pi pi-sign-in" size="small" :loading="joiningId === organization.id" @click="joinPublicOrganization(organization)" />
          <span v-else class="public-label">Pubblica</span>
        </article>
      </div>
      <Button v-if="discoverHasMore" label="Carica altre organizzazioni" icon="pi pi-plus" text :loading="busy" @click="loadDiscover(false)" />
      <Message v-if="!discoverOrganizations.length" severity="info" :closable="false">Nessuna organizzazione pubblica trovata.</Message>
    </section>

    <div v-if="!auth.isGuest" class="actions-grid">
      <form class="action-card" @submit.prevent="createOrganization">
        <span class="card-icon"><i class="pi pi-plus" /></span>
        <h2>Crea un’organizzazione</h2>
        <p>Diventerai proprietario e potrai aggiungere giocatori anche senza account.</p>
        <label for="organization-name">Nome</label>
        <InputText id="organization-name" v-model="name" placeholder="Es. Tennis Club Aurora" minlength="2" fluid required />
        <label for="organization-visibility">Visibilità</label>
        <select id="organization-visibility" v-model="visibility" class="native-select">
          <option value="private">Privata · accesso con codice</option>
          <option value="public">Pubblica · trovabile da tutti</option>
        </select>
        <Button type="submit" label="Crea organizzazione" icon="pi pi-arrow-right" icon-pos="right" :loading="busy" fluid />
      </form>

      <form class="action-card" @submit.prevent="joinOrganization">
        <span class="card-icon secondary"><i class="pi pi-link" /></span>
        <h2>Entra con un codice</h2>
        <p>L’ingresso è immediato e verrà creato il tuo profilo giocatore locale.</p>
        <label for="join-code">Codice invito</label>
        <InputText id="join-code" v-model="joinCode" placeholder="Incolla il codice" fluid required />
        <Button type="submit" label="Entra nell’organizzazione" icon="pi pi-sign-in" severity="secondary" :loading="busy" fluid />
      </form>
    </div>
  </section>
</template>

<style scoped>
.organizations-page { width: min(920px, 100%); margin: 0 auto; padding: clamp(1rem, 3vw, 2.5rem) 0; }
header { max-width: 620px; margin-bottom: 2rem; }
.eyebrow { margin: 0 0 .55rem; color: var(--color-primary-700); font-size: .72rem; font-weight: 850; letter-spacing: .15em; }
h1 { margin: 0; color: var(--color-text); font-size: clamp(2rem, 5vw, 3.2rem); letter-spacing: -.055em; }
header > p:last-child, .action-card p { color: var(--color-text-muted); line-height: 1.55; }
.organization-list { display: grid; gap: .65rem; margin-bottom: 1.5rem; }
.organization-list button { display: flex; align-items: center; gap: .9rem; width: 100%; padding: .85rem 1rem; border: 1px solid var(--color-border); background: var(--color-surface-card); color: var(--color-text); cursor: pointer; text-align: left; }
.organization-list button > span:nth-child(2) { display: grid; gap: .15rem; flex: 1; }
.organization-list small { color: var(--color-text-muted); }
.organization-icon, .card-icon { display: grid; width: 2.5rem; height: 2.5rem; place-items: center; background: rgb(var(--color-primary-500-rgb) / 12%); color: var(--color-primary-700); }
.actions-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1rem; }
.discover-section { display: grid; gap: .9rem; margin: 2.4rem 0; }
.settings-card { display: grid; gap: 1rem; margin: 2rem 0; padding: clamp(1.1rem, 3vw, 1.6rem); border: 1px solid var(--color-border); background: var(--color-surface-card); }
.settings-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .85rem; }
.settings-grid label { display: grid; gap: .4rem; color: var(--color-text-muted); font-size: .78rem; font-weight: 750; }
.full-width { grid-column: 1 / -1; }
.native-textarea { width: 100%; resize: vertical; padding: .75rem; border: 1px solid var(--color-border); background: var(--color-surface-card); color: var(--color-text); font: inherit; }
.settings-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .6rem; }
.settings-message { color: var(--color-text-muted); }
.current-code { margin: 0; color: var(--color-text-muted); font-size: .8rem; }
.section-heading { display: flex; align-items: end; justify-content: space-between; gap: 1rem; }
.section-heading h2 { margin: 0; font-size: 1.35rem; letter-spacing: -.03em; }
.section-heading > span { color: var(--color-text-muted); font-size: .78rem; }
.discover-list { display: grid; gap: .65rem; }
.discover-card { display: flex; align-items: center; gap: .85rem; padding: .9rem; border: 1px solid var(--color-border); background: var(--color-surface-card); }
.discover-copy { min-width: 0; flex: 1; }
.discover-copy strong, .discover-copy small, .discover-copy p { display: block; }
.discover-copy small, .discover-copy p { color: var(--color-text-muted); }
.discover-copy small { margin-top: .18rem; font-size: .76rem; }
.discover-copy p { margin: .35rem 0 0; overflow: hidden; font-size: .82rem; text-overflow: ellipsis; white-space: nowrap; }
.public-label { color: var(--color-primary-700); font-size: .72rem; font-weight: 750; }
.native-select { width: 100%; padding: .75rem; border: 1px solid var(--color-border); background: var(--color-surface-card); color: var(--color-text); font: inherit; }
.action-card { display: flex; flex-direction: column; gap: .8rem; padding: clamp(1.2rem, 3vw, 1.75rem); border: 1px solid var(--color-border); background: var(--color-surface-card); box-shadow: 0 16px 34px rgb(var(--color-shadow-rgb) / 6%); }
.action-card h2 { margin: .25rem 0 0; font-size: 1.2rem; }
.action-card p { min-height: 3rem; margin: 0 0 .35rem; font-size: .86rem; }
.action-card label { color: var(--color-text-muted); font-size: .78rem; font-weight: 750; }
.action-card :deep(.p-inputtext), .action-card :deep(.p-button) { border-radius: 0; }
.action-card :deep(.p-button) { margin-top: .35rem; }
@media (max-width: 680px) { .actions-grid, .settings-grid { grid-template-columns: 1fr; } .full-width { grid-column: auto; } .action-card p { min-height: 0; } }
</style>
