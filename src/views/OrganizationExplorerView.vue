<script setup lang="ts">
import { computed, onMounted, ref, useTemplateRef } from 'vue'
import { useRouter } from 'vue-router'
import { useSwipe, watchDebounced } from '@vueuse/core'
import Button from 'primevue/button'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
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
// Google Maps-style sheet: collapsed it leaves the map free and only shows the
// summary (and the picked organization); expanded it lists every result.
const sheetExpanded = ref(false)
const sheetHandle = useTemplateRef<HTMLElement>('sheetHandle')

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

// Picking an organization collapses the sheet so its card sits over the map.
function selectOrganization(organization: OrganizationPreview): void {
  selectedId.value = organization.id
  sheetExpanded.value = false
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

useSwipe(sheetHandle, {
  threshold: 24,
  onSwipeEnd(_event, direction) {
    if (direction === 'up') sheetExpanded.value = true
    if (direction === 'down') sheetExpanded.value = false
  },
})

onMounted(loadOrganizations)
watchDebounced(search, loadOrganizations, { debounce: 250 })
</script>

<template>
  <!------------------------------>
  <!-- Full-screen explorer layout -->
  <!------------------------------>
  <section class="relative m-[calc(var(--app-page-padding)*-1)] min-h-[calc(100dvh-4.8rem)] overflow-hidden bg-(--color-surface-soft)" aria-label="Esplora organizzazioni">
    <!-- Section: Map -->
    <div class="absolute inset-0 z-0 [&_.organization-map]:h-full [&_.organization-map]:min-h-full [&_.organization-map]:border-0 [&_.leaflet-top.leaflet-left]:top-16! [&_.leaflet-top.leaflet-left]:left-auto! [&_.leaflet-top.leaflet-left]:right-1! md:[&_.leaflet-top.leaflet-left]:top-2!">
      <OrganizationMap :organizations="organizations" @select="selectOrganization" />
    </div>

    <!-- Section: Toolbar -->
    <header class="absolute inset-x-2 top-2 z-20 flex min-h-12 items-center gap-1 rounded-xl border border-(--color-border) bg-(--color-surface-card) p-1 shadow-lg md:inset-x-auto md:left-3 md:top-3 md:w-96">
      <Button icon="pi pi-times" aria-label="Chiudi esplora organizzazioni" text rounded severity="secondary" @click="router.push({ name: 'organizations' })" />
      <IconField class="min-w-0 flex-1">
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" placeholder="Cerca circoli, città o sport" aria-label="Cerca organizzazioni" fluid class="border-0! shadow-none!" @focus="sheetExpanded = true" />
      </IconField>
      <Button label="OK" :disabled="!selectedIsMember" text @click="confirmSelection" />
    </header>

    <!------------------------------>
    <!-- Section: Results sheet -->
    <!------------------------------>
    <section
      class="absolute inset-x-0 bottom-0 z-20 flex max-h-[65%] flex-col rounded-t-2xl border border-b-0 border-(--color-border) bg-(--color-surface-card) shadow-[0_-8px_24px_rgb(0_0_0/0.12)] md:inset-x-auto md:bottom-3 md:left-3 md:max-h-[calc(100%-5.5rem)] md:w-96 md:rounded-2xl md:border-b"
      aria-label="Ricerca e lista organizzazioni"
    >
      <!-- Sheet header: always visible, tap or drag to open and close -->
      <button
        ref="sheetHandle"
        type="button"
        class="grid w-full shrink-0 cursor-pointer touch-none gap-2 rounded-t-2xl border-0 bg-transparent px-4 pb-3 pt-2 text-left"
        :aria-expanded="sheetExpanded"
        aria-controls="organization-results"
        @click="sheetExpanded = !sheetExpanded"
      >
        <span class="mx-auto h-1 w-10 rounded-full bg-(--color-border-strong)" aria-hidden="true" />
        <span class="flex items-center justify-between gap-3">
          <span class="grid min-w-0">
            <strong class="truncate text-base">Organizzazioni</strong>
            <small class="text-xs text-(--color-text-muted)">
              {{ loading && !organizations.length ? 'Ricerca in corso…' : `${total} pubbliche${myOrganizations.length ? ` · ${myOrganizations.length} tue` : ''}` }}
            </small>
          </span>
          <i class="pi text-sm text-(--color-text-muted)" :class="sheetExpanded ? 'pi-chevron-down' : 'pi-chevron-up'" aria-hidden="true" />
        </span>
      </button>

      <!-- Selected organization -->
      <div v-if="selectedOrganization" class="mx-3 mb-3 flex shrink-0 items-center gap-3 rounded-xl border border-primary-200 bg-(--color-primary-soft-surface) p-3">
        <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary"><i class="pi pi-building" aria-hidden="true" /></span>
        <div class="grid min-w-0 flex-1"><strong class="truncate">{{ selectedOrganization.name }}</strong><small class="truncate text-xs text-(--color-text-muted)">{{ [selectedOrganization.city, selectedOrganization.sport].filter(Boolean).join(' · ') || 'Community sportiva' }} · {{ selectedOrganization.member_count }} membri</small></div>
        <Button v-if="selectedIsMember" label="Selezionata" aria-label="Selezionata" icon="pi pi-check" size="small" severity="secondary" outlined disabled :pt="{ label: { class: 'max-sm:hidden' } }" />
        <Button v-else-if="!auth.isGuest" :label="requestedId === selectedOrganization.id ? 'Richiesta inviata' : selectedOrganization.visibility === 'private' ? 'Richiedi accesso' : 'Entra'" :icon="selectedOrganization.visibility === 'private' ? 'pi pi-send' : 'pi pi-sign-in'" size="small" :pt="{ label: { class: selectedOrganization.visibility === 'private' ? 'max-sm:hidden' : '' } }" :aria-label="requestedId === selectedOrganization.id ? 'Richiesta inviata' : selectedOrganization.visibility === 'private' ? 'Richiedi accesso' : 'Entra'" :loading="joiningId === selectedOrganization.id" :disabled="requestedId === selectedOrganization.id" @click="joinSelectedOrganization" />
        <Button icon="pi pi-times" text rounded size="small" severity="secondary" aria-label="Deseleziona" @click="selectedId = null" />
      </div>

      <Message v-if="error" severity="error" :closable="false" class="mx-3 mb-3">{{ error }}</Message>

      <!-- Sheet body: the full list, only while expanded -->
      <div v-show="sheetExpanded" id="organization-results" class="grid min-h-0 gap-4 overflow-y-auto border-t border-(--color-border) px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
        <!-- User organizations -->
        <section v-if="myOrganizations.length" class="grid gap-2" aria-labelledby="my-organizations-title">
          <div class="flex items-baseline justify-between gap-2 px-1"><strong id="my-organizations-title" class="text-sm">Le tue organizzazioni</strong><small class="text-xs text-(--color-text-muted)">seleziona per cambiare spazio</small></div>
          <div class="grid gap-1">
            <button v-for="organization in myOrganizations" :key="`mine-${organization.id}`" type="button" class="flex w-full cursor-pointer items-center gap-3 rounded-xl border-0 p-2.5 text-left transition-colors" :class="organization.id === selectedId ? 'bg-(--color-primary-soft-surface)' : 'bg-transparent hover:bg-(--color-surface-soft)'" @click="selectOrganization(organization)">
              <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary"><i class="pi pi-building" /></span><span class="grid min-w-0 flex-1"><strong class="truncate">{{ organization.name }}</strong><small class="truncate text-xs text-(--color-text-muted)">{{ organization.visibility === 'public' ? 'Pubblica' : 'Privata' }} · {{ organization.role === 'owner' ? 'Proprietario' : organization.role === 'admin' ? 'Amministratore' : 'Membro' }}</small></span><i class="pi pi-chevron-right text-xs text-(--color-text-subtle)" aria-hidden="true" />
            </button>
          </div>
        </section>

        <!-- Discovery results -->
        <section class="grid gap-2" aria-labelledby="discovery-title">
          <strong id="discovery-title" class="px-1 text-sm">Organizzazioni pubbliche</strong>
          <div class="grid gap-1">
            <button v-for="organization in organizations" :key="organization.id" type="button" class="flex w-full cursor-pointer items-center gap-3 rounded-xl border-0 p-2.5 text-left transition-colors" :class="organization.id === selectedId ? 'bg-(--color-primary-soft-surface)' : 'bg-transparent hover:bg-(--color-surface-soft)'" @click="selectOrganization(organization)">
              <span class="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary"><i class="pi pi-building" /></span><span class="grid min-w-0 flex-1"><strong class="truncate">{{ organization.name }}</strong><small class="truncate text-xs text-(--color-text-muted)">{{ [organization.city, organization.sport].filter(Boolean).join(' · ') || 'Community sportiva' }} · {{ organization.member_count }} membri</small></span><i class="pi pi-chevron-right text-xs text-(--color-text-subtle)" aria-hidden="true" />
            </button>
          </div>
          <Button v-if="hasMore" label="Carica altre" icon="pi pi-plus" text :loading="loading" @click="loadOrganizations(false)" />
          <p v-if="!loading && !organizations.length && !error" class="px-1 py-4 text-center text-sm text-(--color-text-muted)">Nessuna organizzazione trovata.</p>
        </section>
      </div>
    </section>
  </section>
</template>
