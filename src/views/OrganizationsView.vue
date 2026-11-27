<script setup lang="ts">
// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------
import { computed, ref } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import OrganizationJoinDialog from '@/components/organizations/OrganizationJoinDialog.vue'
import OrganizationListItem from '@/components/organizations/OrganizationListItem.vue'
import {
  organizationRoleLabel,
  organizationVisibilityLabel,
} from '@/components/organizations/organizationLabels'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationsStore } from '@/stores/organizations'
import type { Organization } from '@/types'

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
interface OrganizationAction {
  icon: string
  title: string
  copy: string
  to?: RouteLocationRaw
  run?: () => void
}

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------
const router = useRouter()
const toast = useToast()
const auth = useAuthStore()
const store = useOrganizationsStore()
const joinDialogVisible = ref(false)

// -----------------------------------------------------------------------------
// Derived state
// -----------------------------------------------------------------------------
const active = computed(() => store.activeOrganization)
const pageDescription = computed(() => auth.isGuest
  ? 'Esplora le community di tennis e consulta tornei e giocatori.'
  : 'Scegli lo spazio su cui lavorare, gestisci quello attivo o unisciti a una nuova community.')
const hasOrganizations = computed(() => !!active.value || store.organizations.length > 0)
// The active organization leads the list, the others follow alphabetically.
const sortedOrganizations = computed(() => [...store.organizations].sort((left, right) => {
  if (left.id === active.value?.id) return -1
  if (right.id === active.value?.id) return 1
  return left.name.localeCompare(right.name, 'it')
}))
const actions = computed<OrganizationAction[]>(() => [
  { icon: 'pi pi-map', title: 'Esplora la mappa', copy: 'Trova circoli e community vicino a te', to: { name: 'organizations-explore' } },
  ...auth.isGuest ? [] : [
    { icon: 'pi pi-key', title: 'Entra con codice', copy: 'Unisciti a uno spazio privato', run: () => { joinDialogVisible.value = true } },
    { icon: 'pi pi-plus', title: 'Crea organizzazione', copy: 'Apri un nuovo spazio per il tuo circolo', to: { name: 'organization-create' } },
  ],
])

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------
function runAction(action: OrganizationAction): void {
  if (action.to) void router.push(action.to)
  else action.run?.()
}

function selectOrganization(organization: Organization): void {
  if (organization.id === active.value?.id) return
  store.select(organization.id)
  toast.add({ severity: 'success', summary: 'Organizzazione attiva', detail: organization.name, life: 2500 })
}

function onJoined(organization: Organization): void {
  toast.add({ severity: 'success', summary: 'Benvenuto', detail: `Sei entrato in ${organization.name}.`, life: 3000 })
}

async function copyInviteCode(organization: Organization): Promise<void> {
  if (!organization.join_code) return
  try {
    await navigator.clipboard.writeText(organization.join_code)
    toast.add({ severity: 'success', summary: 'Codice copiato', detail: `Codice invito di ${organization.name}: ${organization.join_code}`, life: 3000 })
  } catch {
    toast.add({ severity: 'info', summary: 'Codice invito', detail: organization.join_code, life: 6000 })
  }
}
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <div class="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 text-(--color-text) sm:gap-5">
    <!------------------------------>
    <!-- Section: Header -->
    <!------------------------------>
    <header class="flex items-start justify-between gap-4 pb-1">
      <div class="min-w-0">
        <h1 class="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">Organizzazioni</h1>
        <p class="mt-1 text-sm text-(--color-text-muted) sm:text-base">{{ pageDescription }}</p>
      </div>
      <div v-if="!auth.isGuest" class="flex shrink-0 gap-2">
        <Button
          icon="pi pi-plus"
          aria-label="Nuova organizzazione"
          title="Nuova organizzazione"
          class="md:hidden"
          rounded
          @click="router.push({ name: 'organization-create' })"
        />
        <Button
          label="Nuova organizzazione"
          icon="pi pi-plus"
          class="hidden md:inline-flex"
          @click="router.push({ name: 'organization-create' })"
        />
      </div>
    </header>

    <Message v-if="store.error" severity="error" :closable="false">{{ store.error }}</Message>

    <template v-if="hasOrganizations">
      <!------------------------------>
      <!-- Section: Active organization -->
      <!------------------------------>
      <section
        v-if="active"
        class="overflow-hidden rounded-xl bg-linear-to-br from-(--color-sidebar-start) to-(--color-sidebar-end) text-white"
        aria-labelledby="active-organization-title"
      >
        <div class="grid gap-6 p-5 sm:p-7 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div class="min-w-0">
            <p class="mb-2 flex items-center gap-2 text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-(--color-accent)">
              <span class="size-2 rounded-full bg-(--color-accent) ring-4 ring-(--color-accent)/20" aria-hidden="true" />
              {{ auth.isGuest ? 'Stai esplorando' : 'Organizzazione attiva' }}
            </p>
            <h2 id="active-organization-title" class="truncate text-2xl font-bold leading-tight tracking-tight sm:text-3xl lg:text-4xl">
              {{ active.name }}
            </h2>
            <p class="mt-3 max-w-2xl text-sm leading-relaxed text-white/65 sm:text-base">
              {{ active.description || 'Community di tennis su TLA.' }}
            </p>
          </div>
          <div class="flex flex-col gap-2 sm:flex-row lg:justify-end">
            <Button
              label="Vai ai tornei"
              icon="pi pi-arrow-right"
              icon-pos="right"
              class="border-white/20! bg-white/10! text-white! hover:bg-white/15!"
              @click="router.push({ name: 'tournaments' })"
            />
            <Button
              v-if="store.isAdmin"
              label="Modifica"
              icon="pi pi-pencil"
              class="border-white/20! bg-transparent! text-white! hover:bg-white/10!"
              outlined
              @click="router.push({ name: 'organization-edit' })"
            />
          </div>
        </div>
        <!-- Section: Active organization facts -->
        <div class="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 px-5 py-4 text-xs text-white/60 sm:px-7">
          <span v-if="active.city" class="inline-flex items-center gap-2"><i class="pi pi-map-marker text-(--color-accent)" /> {{ active.city }}</span>
          <span class="inline-flex items-center gap-2"><i class="pi pi-lock text-(--color-accent)" /> {{ organizationVisibilityLabel(active) }}</span>
          <span v-if="!auth.isGuest" class="inline-flex items-center gap-2"><i class="pi pi-user text-(--color-accent)" /> {{ organizationRoleLabel(active.role) }}</span>
          <span v-if="active.member_count !== undefined" class="inline-flex items-center gap-2"><i class="pi pi-users text-(--color-accent)" /> {{ active.member_count }} membri</span>
          <button
            v-if="store.isAdmin && active.join_code"
            type="button"
            class="ml-auto inline-flex cursor-pointer items-center gap-2 rounded-md border border-white/15 px-2.5 py-1.5 font-mono text-xs font-bold tracking-widest text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
            :aria-label="`Copia codice invito di ${active.name}`"
            @click="copyInviteCode(active)"
          >
            <i class="pi pi-key text-(--color-accent)" aria-hidden="true" /> {{ active.join_code }} <i class="pi pi-copy text-white/60" aria-hidden="true" />
          </button>
        </div>
      </section>

      <div class="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.75fr)] xl:gap-5">
        <!------------------------------>
        <!-- Section: User organizations -->
        <!------------------------------>
        <section
          v-if="!auth.isGuest && store.organizations.length"
          class="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-card)"
          aria-labelledby="my-organizations-title"
        >
          <header class="flex items-center justify-between gap-4 border-b border-(--color-border) px-4 py-4 sm:px-5">
            <div>
              <p class="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-primary">I tuoi spazi</p>
              <h2 id="my-organizations-title" class="mt-1 text-lg font-bold tracking-tight">Le tue organizzazioni</h2>
            </div>
            <Tag :value="String(store.organizations.length)" severity="secondary" rounded />
          </header>
          <OrganizationListItem
            v-for="organization in sortedOrganizations"
            :key="organization.id"
            :organization="organization"
            :active="organization.id === active?.id"
            @select="selectOrganization"
            @copy-code="copyInviteCode"
          />
        </section>

        <!------------------------------>
        <!-- Section: Next actions -->
        <!------------------------------>
        <aside
          class="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-card)"
          :class="auth.isGuest || !store.organizations.length ? 'xl:col-span-2' : ''"
          aria-labelledby="organization-actions-title"
        >
          <header class="border-b border-(--color-border) px-4 py-4 sm:px-5">
            <h2 id="organization-actions-title" class="font-bold">{{ auth.isGuest ? 'Scopri altre community' : 'Aggiungi uno spazio' }}</h2>
            <p class="mt-0.5 text-xs text-(--color-text-muted)">
              {{ auth.isGuest ? 'Spostati sulla mappa per trovare altri circoli.' : 'Cerca una community esistente oppure creane una nuova.' }}
            </p>
          </header>
          <nav aria-label="Azioni organizzazioni">
            <button
              v-for="action in actions"
              :key="action.title"
              type="button"
              class="group grid min-h-17 w-full cursor-pointer grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-(--color-border) px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-(--color-surface-soft) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary sm:px-5"
              @click="runAction(action)"
            >
              <span class="grid size-9 place-items-center rounded-lg bg-(--color-surface-soft) text-primary"><i :class="action.icon" /></span>
              <span class="grid min-w-0 gap-0.5">
                <strong class="text-sm group-hover:text-primary">{{ action.title }}</strong>
                <small class="truncate text-xs text-(--color-text-muted)">{{ action.copy }}</small>
              </span>
              <i class="pi pi-chevron-right text-[0.65rem] text-(--color-text-subtle)" aria-hidden="true" />
            </button>
          </nav>
        </aside>
      </div>
    </template>

    <!------------------------------>
    <!-- Section: Empty state -->
    <!------------------------------>
    <section
      v-else
      class="grid justify-items-center gap-3 rounded-xl border border-(--color-border) bg-(--color-surface-card) px-4 py-12 text-center sm:py-16"
    >
      <span class="grid size-14 place-items-center rounded-full bg-primary-50 text-xl text-primary"><i class="pi pi-building" /></span>
      <h2 class="text-xl font-bold">Nessuna organizzazione</h2>
      <p class="max-w-lg text-sm text-(--color-text-muted)">
        {{ auth.isGuest ? 'Esplora la mappa per scegliere una community.' : 'Crea il tuo primo spazio, entra con un codice invito oppure trova un circolo sulla mappa.' }}
      </p>
      <div class="mt-2 flex flex-col gap-2 sm:flex-row">
        <Button label="Esplora la mappa" icon="pi pi-map" severity="secondary" outlined @click="router.push({ name: 'organizations-explore' })" />
        <Button v-if="!auth.isGuest" label="Entra con codice" icon="pi pi-key" severity="secondary" outlined @click="joinDialogVisible = true" />
        <Button v-if="!auth.isGuest" label="Crea organizzazione" icon="pi pi-plus" @click="router.push({ name: 'organization-create' })" />
      </div>
    </section>

    <!-- Section: Join dialog -->
    <OrganizationJoinDialog v-model:visible="joinDialogVisible" @joined="onJoined" />
  </div>
</template>
