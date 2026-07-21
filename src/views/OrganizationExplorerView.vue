<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { watchDebounced } from '@vueuse/core'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import OrganizationMap from '@/components/organizations/OrganizationMap.vue'
import { organizationsService } from '@/services/organizationsApi'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationsStore } from '@/stores/organizations'
import type { OrganizationPreview } from '@/types'

// Explorer state is intentionally local because results are transient map data.
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

const selectedOrganization = computed(() =>
  organizations.value.find((item) => item.id === selectedId.value)
  ?? store.organizations.find((item) => item.id === selectedId.value)
  ?? null,
)
const selectedIsMember = computed(() =>
  Boolean(selectedId.value && store.organizations.some((item) => item.id === selectedId.value)),
)
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
    if (reset && selectedId.value && !organizations.value.some((item) => item.id === selectedId.value)) {
      selectedId.value = null
    }
  } catch (requestError) {
    error.value = (requestError as Error).message
  } finally {
    loading.value = false
  }
}

function selectOrganization(organization: OrganizationPreview): void {
  selectedId.value = organization.id
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

onMounted(loadOrganizations)
watchDebounced(search, loadOrganizations, { debounce: 250 })
</script>

<template>
  <!------------------------------>
  <!-- Full-screen explorer layout -->
  <!------------------------------>
  <section class="relative m-[calc(var(--app-page-padding)*-1)] min-h-[calc(100dvh-4.8rem)] overflow-hidden bg-(--color-surface-soft) md:min-h-[calc(100dvh-1rem)]" aria-label="Esplora organizzazioni">
    <!-- Section: Map -->
    <div class="absolute inset-0 z-0 [&_.organization-map]:h-full [&_.organization-map]:min-h-full [&_.organization-map]:border-0">
      <OrganizationMap :organizations="organizations" @select="selectOrganization" />
    </div>

    <!-- Section: Toolbar -->
    <header class="absolute inset-x-2 top-2 z-20 flex min-h-12 items-center gap-1 border border-(--color-border) bg-(--color-surface-card) p-1 shadow-lg backdrop-blur-md md:inset-x-3 md:top-3">
      <Button icon="pi pi-times" aria-label="Chiudi esplora organizzazioni" text rounded severity="secondary" @click="router.push({ name: 'organizations' })" />
      <div class="grid min-w-0 flex-1"><strong class="truncate text-sm">Esplora organizzazioni</strong><small class="text-xs text-(--color-text-muted)">{{ total }} disponibili</small></div>
      <Button label="OK" icon="pi pi-check" :disabled="!selectedIsMember" text @click="confirmSelection" />
    </header>

    <!------------------------------>
    <!-- Section: Search panel -->
    <!------------------------------>
    <section class="absolute inset-x-3 bottom-3 z-20 grid max-h-[54dvh] gap-3 overflow-y-auto border border-(--color-border) bg-(--color-surface-card) p-3 shadow-xl backdrop-blur-md md:right-auto md:w-full md:max-w-sm md:max-h-[72dvh]" aria-label="Ricerca e lista organizzazioni">
      <div class="mx-auto h-1 w-9 bg-(--color-border-strong) md:hidden" aria-hidden="true" />
      <div class="flex items-end justify-between gap-3"><div><p class="mb-1 text-[0.65rem] font-extrabold tracking-[0.14em] text-primary-700">TROVA LA TUA COMMUNITY</p><h1 class="text-xl font-bold tracking-tight">Organizzazioni pubbliche</h1></div><span class="whitespace-nowrap text-xs text-(--color-text-muted)">{{ organizations.length }} mostrate</span></div>
      <InputText v-model="search" placeholder="Cerca per nome, città o sport" aria-label="Cerca organizzazioni" fluid />
      <Message v-if="error" severity="error" :closable="false">{{ error }}</Message>

      <!-- Selected organization -->
      <div v-if="selectedOrganization" class="flex items-center gap-3 border border-primary-200 bg-primary-50 p-3">
        <div class="grid min-w-0 flex-1"><strong class="truncate">{{ selectedOrganization.name }}</strong><small class="truncate text-xs text-(--color-text-muted)">{{ [selectedOrganization.city, selectedOrganization.sport].filter(Boolean).join(' · ') || 'Community sportiva' }} · {{ selectedOrganization.member_count }} membri</small></div>
        <Button v-if="selectedIsMember" label="Selezionata" icon="pi pi-check" size="small" severity="success" outlined disabled />
        <Button v-else-if="!auth.isGuest" :label="requestedId === selectedOrganization.id ? 'Richiesta inviata' : selectedOrganization.visibility === 'private' ? 'Richiedi accesso' : 'Entra'" :icon="selectedOrganization.visibility === 'private' ? 'pi pi-send' : 'pi pi-sign-in'" size="small" :loading="joiningId === selectedOrganization.id" :disabled="requestedId === selectedOrganization.id" @click="joinSelectedOrganization" />
      </div>

      <!-- User organizations -->
      <section v-if="myOrganizations.length" class="grid gap-2" aria-labelledby="my-organizations-title">
        <div class="flex items-baseline justify-between gap-2"><strong id="my-organizations-title" class="text-sm">Le tue organizzazioni</strong><small class="text-xs text-(--color-text-muted)">seleziona per cambiare spazio</small></div>
        <div class="grid gap-2">
          <button v-for="organization in myOrganizations" :key="`mine-${organization.id}`" type="button" class="flex w-full items-center gap-3 border bg-(--color-surface-card) p-3 text-left" :class="organization.id === selectedId ? 'border-primary-500 bg-primary-50' : 'border-(--color-border)'" @click="selectOrganization(organization)">
            <span class="grid size-8 shrink-0 place-items-center bg-primary-50 text-primary-700"><i class="pi pi-building" /></span><span class="grid min-w-0 flex-1"><strong class="truncate">{{ organization.name }}</strong><small class="truncate text-xs text-(--color-text-muted)">{{ organization.visibility === 'public' ? 'Pubblica' : 'Privata' }} · {{ organization.role === 'owner' ? 'Proprietario' : organization.role === 'admin' ? 'Amministratore' : 'Membro' }}</small></span><i class="pi pi-chevron-right" aria-hidden="true" />
          </button>
        </div>
      </section>

      <!-- Discovery results -->
      <div class="grid gap-2">
        <button v-for="organization in organizations" :key="organization.id" type="button" class="flex w-full items-center gap-3 border bg-(--color-surface-card) p-3 text-left" :class="organization.id === selectedId ? 'border-primary-500 bg-primary-50' : 'border-(--color-border)'" @click="selectOrganization(organization)">
          <span class="grid size-8 shrink-0 place-items-center bg-primary-50 text-primary-700"><i class="pi pi-building" /></span><span class="grid min-w-0 flex-1"><strong class="truncate">{{ organization.name }}</strong><small class="truncate text-xs text-(--color-text-muted)">{{ [organization.city, organization.sport].filter(Boolean).join(' · ') || 'Community sportiva' }} · {{ organization.member_count }} membri</small></span><i class="pi pi-chevron-right" aria-hidden="true" />
        </button>
      </div>
      <Button v-if="hasMore" label="Carica altre" icon="pi pi-plus" text :loading="loading" @click="loadOrganizations(false)" />
      <Message v-if="!loading && !organizations.length && !error" severity="info" :closable="false">Nessuna organizzazione trovata.</Message>
    </section>
  </section>
</template>
