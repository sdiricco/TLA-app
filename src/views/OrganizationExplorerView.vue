<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { useAuthStore } from '../stores/auth'
import { useOrganizationsStore } from '../stores/organizations'
import { organizationsService } from '../services/organizationsApi'
import OrganizationMap from '../components/organizations/OrganizationMap.vue'
import type { OrganizationPreview } from '../types'

const router = useRouter()
const auth = useAuthStore()
const store = useOrganizationsStore()
const search = ref('')
const organizations = ref<OrganizationPreview[]>([])
const selectedId = ref<string | null>(null)
const total = ref(0)
const hasMore = ref(false)
const page = ref(1)
const joiningId = ref<string | null>(null)
const requestedId = ref<string | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)

const selectedOrganization = computed(() => organizations.value.find(item => item.id === selectedId.value) ?? store.organizations.find(item => item.id === selectedId.value) ?? null)
const selectedIsMember = computed(() => !!selectedId.value && store.organizations.some(item => item.id === selectedId.value))
const myOrganizations = computed(() => store.organizations)

async function loadOrganizations(reset = true): Promise<void> {
  loading.value = true
  error.value = null
  try {
    const nextPage = reset ? 1 : page.value + 1
    const response = await organizationsService.discover(search.value, nextPage, 30)
    organizations.value = reset ? response.items : [...organizations.value, ...response.items]
    page.value = response.page
    total.value = response.total
    hasMore.value = response.has_more
    if (reset && selectedId.value && !organizations.value.some(item => item.id === selectedId.value)) selectedId.value = null
  } catch (requestError) {
    error.value = (requestError as Error).message
  } finally {
    loading.value = false
  }
}

function selectOrganization(organization: OrganizationPreview): void {
  selectedId.value = organization.id
}

function closeExplorer(): void {
  void router.push({ name: 'organizations' })
}

function confirmSelection(): void {
  if (!selectedId.value || !selectedIsMember.value) return
  store.select(selectedId.value)
  void router.push({ name: 'organizations' })
}

async function joinSelectedOrganization(): Promise<void> {
  if (!selectedOrganization.value || auth.isGuest) return
  joiningId.value = selectedOrganization.value.id
  error.value = null
  try {
    if (selectedOrganization.value.visibility === 'private') {
      await store.requestAccess(selectedOrganization.value.id)
      requestedId.value = selectedOrganization.value.id
    } else {
      await store.joinPublic(selectedOrganization.value.id)
      await router.push({ name: 'tournaments' })
    }
  } catch (requestError) {
    error.value = (requestError as Error).message
  } finally {
    joiningId.value = null
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => { void loadOrganizations() })
watch(search, () => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => { void loadOrganizations() }, 250)
})
</script>

<template>
  <section class="organization-explorer" aria-label="Esplora organizzazioni">
    <div class="explorer-map"><OrganizationMap :organizations="organizations" @select="selectOrganization" /></div>

    <header class="explorer-toolbar">
      <Button icon="pi pi-times" aria-label="Chiudi esplora organizzazioni" text rounded severity="secondary" @click="closeExplorer" />
      <div class="toolbar-title"><strong>Esplora organizzazioni</strong><small>{{ total }} disponibili</small></div>
      <Button label="OK" icon="pi pi-check" :disabled="!selectedIsMember" text @click="confirmSelection" />
    </header>

    <section class="explorer-panel" aria-label="Ricerca e lista organizzazioni">
      <div class="panel-handle" aria-hidden="true" />
      <div class="panel-heading"><div><p class="eyebrow">TROVA LA TUA COMMUNITY</p><h1>Organizzazioni pubbliche</h1></div><span>{{ organizations.length }} mostrate</span></div>
      <InputText v-model="search" placeholder="Cerca per nome, città o sport" aria-label="Cerca organizzazioni" fluid />
      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

      <div v-if="selectedOrganization" class="selected-organization">
        <div class="selected-copy"><strong>{{ selectedOrganization.name }}</strong><small>{{ [selectedOrganization.city, selectedOrganization.sport].filter(Boolean).join(' · ') || 'Community sportiva' }} · {{ selectedOrganization.member_count }} membri</small></div>
        <Button v-if="selectedIsMember" label="Selezionata" icon="pi pi-check" size="small" severity="success" outlined disabled />
        <Button v-else-if="!auth.isGuest" :label="requestedId === selectedOrganization.id ? 'Richiesta inviata' : selectedOrganization.visibility === 'private' ? 'Richiedi accesso' : 'Entra'" :icon="selectedOrganization.visibility === 'private' ? 'pi pi-send' : 'pi pi-sign-in'" size="small" :loading="joiningId === selectedOrganization.id" :disabled="requestedId === selectedOrganization.id" @click="joinSelectedOrganization" />
      </div>

      <section v-if="myOrganizations.length" class="my-organizations" aria-labelledby="my-organizations-title">
        <div class="list-heading"><strong id="my-organizations-title">Le tue organizzazioni</strong><small>seleziona per cambiare spazio</small></div>
        <div class="organization-results">
          <button v-for="organization in myOrganizations" :key="`mine-${organization.id}`" type="button" class="organization-result" :class="{ selected: organization.id === selectedId }" @click="selectOrganization(organization)">
            <span class="result-icon"><i class="pi pi-building" /></span>
            <span class="result-copy"><strong>{{ organization.name }}</strong><small>{{ organization.visibility === 'public' ? 'Pubblica' : 'Privata' }} · {{ organization.role === 'owner' ? 'Proprietario' : organization.role === 'admin' ? 'Amministratore' : 'Membro' }}</small></span>
            <i class="pi pi-chevron-right" aria-hidden="true" />
          </button>
        </div>
      </section>

      <div class="organization-results">
        <button v-for="organization in organizations" :key="organization.id" type="button" class="organization-result" :class="{ selected: organization.id === selectedId }" @click="selectOrganization(organization)">
          <span class="result-icon"><i class="pi pi-building" /></span>
          <span class="result-copy"><strong>{{ organization.name }}</strong><small>{{ [organization.city, organization.sport].filter(Boolean).join(' · ') || 'Community sportiva' }} · {{ organization.member_count }} membri</small></span>
          <i class="pi pi-chevron-right" aria-hidden="true" />
        </button>
      </div>
      <Button v-if="hasMore" label="Carica altre" icon="pi pi-plus" text :loading="loading" @click="loadOrganizations(false)" />
      <Message v-if="!loading && !organizations.length && !error" severity="info" :closable="false">Nessuna organizzazione trovata.</Message>
    </section>
  </section>
</template>

<style scoped>
.organization-explorer { position: relative; min-height: calc(100dvh - 1rem); overflow: hidden; margin: calc(var(--app-page-padding) * -1); background: var(--color-surface-soft); }
.explorer-map { position: absolute; z-index: 0; inset: 0; }
.explorer-map :deep(.organization-map) { height: 100%; min-height: 100%; border: 0; }
.explorer-toolbar { position: absolute; z-index: 20; top: .75rem; left: .75rem; right: .75rem; display: flex; align-items: center; gap: .35rem; min-height: 3.1rem; padding: .3rem .4rem; border: 1px solid var(--color-border); background: var(--color-surface-card); box-shadow: 0 8px 24px rgb(var(--color-shadow-rgb) / 12%); backdrop-filter: blur(14px); }
.toolbar-title { display: grid; min-width: 0; flex: 1; gap: .08rem; }
.toolbar-title strong { overflow: hidden; font-size: .9rem; text-overflow: ellipsis; white-space: nowrap; }
.toolbar-title small { color: var(--color-text-muted); font-size: .7rem; }
.explorer-panel { position: absolute; z-index: 20; left: .75rem; bottom: .75rem; display: grid; gap: .8rem; width: min(390px, calc(100% - 1.5rem)); max-height: min(72dvh, 650px); overflow-y: auto; padding: .7rem; border: 1px solid var(--color-border); background: var(--color-surface-card); box-shadow: 0 18px 38px rgb(var(--color-shadow-rgb) / 16%); backdrop-filter: blur(16px); }
.panel-handle { display: none; width: 2.2rem; height: .22rem; margin: 0 auto; background: var(--color-border-strong); }
.panel-heading { display: flex; align-items: end; justify-content: space-between; gap: .8rem; }
.eyebrow { margin: 0 0 .35rem; color: var(--color-primary-700); font-size: .65rem; font-weight: 850; letter-spacing: .14em; }
.panel-heading h1 { margin: 0; font-size: 1.2rem; letter-spacing: -.04em; }
.panel-heading > span { color: var(--color-text-muted); font-size: .7rem; white-space: nowrap; }
.selected-organization { display: flex; align-items: center; gap: .65rem; padding: .7rem; border: 1px solid rgb(var(--color-primary-rgb) / 24%); background: rgb(var(--color-primary-500-rgb) / 7%); }
.selected-copy { display: grid; min-width: 0; flex: 1; gap: .2rem; }
.selected-copy strong, .selected-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.selected-copy small, .result-copy small { color: var(--color-text-muted); font-size: .72rem; }
.organization-results { display: grid; gap: .45rem; }
.my-organizations { display: grid; gap: .45rem; }
.list-heading { display: flex; align-items: baseline; justify-content: space-between; gap: .6rem; }
.list-heading strong { font-size: .82rem; }
.list-heading small { color: var(--color-text-muted); font-size: .68rem; }
.organization-result { display: flex; align-items: center; gap: .7rem; width: 100%; padding: .65rem; border: 1px solid var(--color-border); background: var(--color-surface-card); color: var(--color-text); text-align: left; cursor: pointer; }
.organization-result.selected { border-color: var(--color-primary-500); background: rgb(var(--color-primary-500-rgb) / 7%); }
.result-icon { display: grid; flex: 0 0 auto; place-items: center; width: 2rem; height: 2rem; background: rgb(var(--color-primary-500-rgb) / 12%); color: var(--color-primary-700); }
.result-copy { display: grid; min-width: 0; flex: 1; gap: .12rem; }
.result-copy strong { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 767px) {
  .organization-explorer { min-height: calc(100dvh - 4.8rem); margin: calc(var(--app-page-padding) * -1) calc(var(--app-page-padding) * -1) -.85rem; }
  .explorer-panel { right: .75rem; bottom: .75rem; width: auto; max-height: 54dvh; }
  .panel-handle { display: block; }
  .explorer-toolbar { top: .5rem; left: .5rem; right: .5rem; }
}
</style>
