<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTimeoutFn } from '@vueuse/core'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationsStore } from '@/stores/organizations'
import type { Organization } from '@/types'

// Shared organization state and invitation dialog state.
const router = useRouter()
const auth = useAuthStore()
const store = useOrganizationsStore()
const inviteMessage = ref<string | null>(null)
const joinDialogVisible = ref(false)
const joinCode = ref('')
const joining = ref(false)
const joinError = ref<string | null>(null)

const pageTitle = computed(() => auth.isGuest ? 'Scegli dove giocare' : 'I tuoi spazi')
const pageDescription = computed(() => auth.isGuest
  ? 'Esplora le community di tennis e consulta tornei e giocatori.'
  : 'Passa da un’organizzazione all’altra o gestisci quella attiva.')
const joinCodeIsValid = computed(() =>
  /^[A-Z0-9]{5}$/.test(joinCode.value) || /^[A-Za-z0-9_-]{8,64}$/.test(joinCode.value),
)
const nextActions = computed(() => [
  {
    icon: 'pi pi-map',
    title: 'Esplora la mappa',
    copy: 'Trova organizzazioni visibili',
    run: () => { void router.push({ name: 'organizations-explore' }) },
  },
  ...auth.isGuest ? [] : [
    {
      icon: 'pi pi-key',
      title: 'Entra con codice',
      copy: 'Accedi a uno spazio privato',
      run: openJoinDialog,
    },
    {
      icon: 'pi pi-plus',
      title: 'Crea organizzazione',
      copy: 'Apri un nuovo spazio tennis',
      run: () => { void router.push({ name: 'organization-create' }) },
    },
  ],
])
const { start: scheduleInviteMessageClear } = useTimeoutFn(
  () => { inviteMessage.value = null },
  3000,
  { immediate: false },
)

function roleLabel(role: Organization['role']): string {
  if (role === 'owner') return 'Proprietario'
  if (role === 'admin') return 'Amministratore'
  return 'Membro'
}

function visibilityLabel(organization: Organization): string {
  if (organization.visibility === 'public') return 'Pubblica'
  return organization.discoverable ? 'Privata · visibile' : 'Privata · nascosta'
}

function openJoinDialog(): void {
  joinCode.value = ''
  joinError.value = null
  joinDialogVisible.value = true
}

function normalizeJoinCode(): void {
  const normalized = joinCode.value.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64)
  joinCode.value = normalized.length <= 5 ? normalized.toUpperCase() : normalized
}

async function joinOrganization(): Promise<void> {
  normalizeJoinCode()
  if (!joinCodeIsValid.value) {
    joinError.value = 'Inserisci un codice invito valido.'
    return
  }
  joining.value = true
  joinError.value = null
  try {
    const organization = await store.join(joinCode.value)
    joinDialogVisible.value = false
    inviteMessage.value = `Sei entrato in ${organization.name}.`
    scheduleInviteMessageClear()
  } catch (error) {
    joinError.value = (error as Error).message
  } finally {
    joining.value = false
  }
}

async function copyInviteCode(organization: Organization): Promise<void> {
  if (!organization.join_code) return
  try {
    await navigator.clipboard.writeText(organization.join_code)
    inviteMessage.value = `Codice di ${organization.name} copiato.`
  } catch {
    inviteMessage.value = `Codice invito: ${organization.join_code}`
  }
  scheduleInviteMessageClear()
}
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <section class="mx-auto w-full max-w-230 pb-10 pt-3 sm:pt-8">
    <!-- Section: Header -->
    <PageHeader eyebrow="ORGANIZZAZIONI" :title="pageTitle" :description="pageDescription">
      <div class="flex gap-2">
        <Button label="Esplora" icon="pi pi-map" severity="secondary" outlined @click="router.push({ name: 'organizations-explore' })" />
        <Button v-if="!auth.isGuest" label="Nuova" icon="pi pi-plus" @click="router.push({ name: 'organization-create' })" />
      </div>
    </PageHeader>

    <div class="mt-5 grid gap-4">
      <Message v-if="store.error" severity="error" :closable="false">{{ store.error }}</Message>
      <Message v-if="inviteMessage" severity="success" :closable="false">{{ inviteMessage }}</Message>

      <template v-if="store.activeOrganization">
        <!------------------------------>
        <!-- Section: Active organization -->
        <!------------------------------>
        <section class="overflow-hidden border border-(--color-border) bg-(--color-surface-card) shadow-sm" aria-labelledby="active-organization-title">
          <div class="flex items-start gap-3 p-4 sm:gap-4 sm:p-6">
            <span class="grid size-12 shrink-0 place-items-center bg-primary-50 text-xl text-primary-700 sm:size-13"><i class="pi pi-building" /></span>
            <div class="min-w-0 flex-1">
              <div class="mb-1 flex items-center gap-2 text-xs font-extrabold tracking-wider text-primary-700"><span class="size-2 rounded-full bg-primary-500 ring-4 ring-primary-500/10" />{{ auth.isGuest ? 'STAI ESPLORANDO' : 'ORGANIZZAZIONE ATTIVA' }}</div>
              <h2 id="active-organization-title" class="truncate text-2xl font-bold tracking-tight">{{ store.activeOrganization.name }}</h2>
              <p class="mb-3 mt-2 max-w-2xl text-sm leading-relaxed text-(--color-text-muted)">{{ store.activeOrganization.description || 'Community di tennis su TLA.' }}</p>
              <div class="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-(--color-text-muted)">
                <span class="flex items-center gap-1"><i class="pi pi-lock text-primary-700" />{{ visibilityLabel(store.activeOrganization) }}</span>
                <span v-if="!auth.isGuest" class="flex items-center gap-1"><i class="pi pi-user text-primary-700" />{{ roleLabel(store.activeOrganization.role) }}</span>
                <span v-if="store.activeOrganization.member_count !== undefined" class="flex items-center gap-1"><i class="pi pi-users text-primary-700" />{{ store.activeOrganization.member_count }} membri</span>
              </div>
            </div>
          </div>
          <div class="grid gap-2 border-t border-(--color-border) bg-(--color-surface-soft) p-3 sm:flex sm:items-center">
            <Button class="sm:mr-auto" label="Vai ai tornei" icon="pi pi-arrow-right" icon-pos="right" @click="router.push({ name: 'tournaments' })" />
            <Button v-if="store.isAdmin" label="Modifica" icon="pi pi-pencil" severity="secondary" outlined @click="router.push({ name: 'organization-edit' })" />
            <Button v-if="store.isAdmin && store.activeOrganization.join_code" label="Codice invito" icon="pi pi-copy" severity="secondary" text @click="copyInviteCode(store.activeOrganization)" />
          </div>
        </section>

        <!------------------------------>
        <!-- Section: User organizations -->
        <!------------------------------>
        <section v-if="!auth.isGuest" class="mt-4" aria-labelledby="my-organizations-title">
          <header class="mb-3 flex items-start justify-between gap-4"><div><h2 id="my-organizations-title" class="text-lg font-bold">Le tue organizzazioni</h2><p class="mt-1 text-sm text-(--color-text-muted)">Seleziona lo spazio su cui vuoi lavorare.</p></div><span class="grid min-w-7 place-items-center bg-(--color-surface-soft) px-2 py-1 text-xs font-extrabold text-(--color-text-muted)">{{ store.organizations.length }}</span></header>
          <div class="grid gap-2 md:grid-cols-2">
            <article v-for="organization in store.organizations" :key="organization.id" class="flex min-w-0 items-center border" :class="organization.id === store.activeOrganization.id ? 'border-primary-300 bg-primary-50' : 'border-(--color-border) bg-(--color-surface-card)'">
              <button type="button" class="flex min-w-0 flex-1 items-center gap-3 p-3 text-left" @click="store.select(organization.id)"><span class="grid size-9 shrink-0 place-items-center bg-(--color-surface-soft) text-primary-700"><i class="pi pi-building" /></span><span class="grid min-w-0 flex-1"><strong class="truncate text-sm">{{ organization.name }}</strong><small class="truncate text-xs text-(--color-text-muted)">{{ visibilityLabel(organization) }} · {{ roleLabel(organization.role) }}</small></span><span v-if="organization.id === store.activeOrganization.id" class="text-xs font-extrabold text-primary-700"><i class="pi pi-check" /> Attiva</span><i v-else class="pi pi-chevron-right text-xs text-(--color-text-subtle)" /></button>
              <Button v-if="organization.join_code && ['owner', 'admin'].includes(organization.role)" icon="pi pi-copy" text rounded :aria-label="`Copia codice invito di ${organization.name}`" @click="copyInviteCode(organization)" />
            </article>
          </div>
        </section>

        <!-- Section: Next actions -->
        <section class="mt-6" aria-labelledby="next-actions-title">
          <header class="mb-3"><h2 id="next-actions-title" class="text-lg font-bold">{{ auth.isGuest ? 'Scopri altre community' : 'Aggiungi uno spazio' }}</h2><p class="mt-1 text-sm text-(--color-text-muted)">{{ auth.isGuest ? 'Spostati sulla mappa per trovare altri circoli.' : 'Cerca una community esistente oppure creane una nuova.' }}</p></header>
          <div class="grid gap-2 md:grid-cols-3">
            <button v-for="action in nextActions" :key="action.title" type="button" class="flex items-center gap-3 border border-(--color-border) p-3 text-left hover:border-primary-300 hover:bg-(--color-surface-card)" @click="action.run"><span class="grid size-10 shrink-0 place-items-center bg-primary-50 text-primary-700"><i :class="action.icon" /></span><span class="grid min-w-0 flex-1"><strong class="text-sm">{{ action.title }}</strong><small class="text-xs text-(--color-text-muted)">{{ action.copy }}</small></span><i class="pi pi-arrow-right text-xs text-(--color-text-subtle)" /></button>
          </div>
        </section>
      </template>

      <!-- Section: Empty state -->
      <section v-else class="grid justify-items-center gap-3 border border-(--color-border) bg-(--color-surface-card) px-4 py-12 text-center sm:py-16"><span class="grid size-14 place-items-center bg-primary-50 text-xl text-primary-700"><i class="pi pi-building" /></span><h2 class="text-xl font-bold">Nessuna organizzazione</h2><p class="max-w-lg text-(--color-text-muted)">{{ auth.isGuest ? 'Esplora la mappa per scegliere una community.' : 'Crea il tuo primo spazio oppure trovane uno sulla mappa.' }}</p><div class="mt-2 flex flex-col gap-2 sm:flex-row"><Button label="Esplora la mappa" icon="pi pi-map" severity="secondary" outlined @click="router.push({ name: 'organizations-explore' })" /><Button v-if="!auth.isGuest" label="Crea organizzazione" icon="pi pi-plus" @click="router.push({ name: 'organization-create' })" /></div></section>
    </div>

    <!-- Section: Join dialog -->
    <Dialog v-model:visible="joinDialogVisible" modal header="Entra con codice" class="mx-4 w-full max-w-md">
      <form class="grid gap-3" @submit.prevent="joinOrganization"><p class="leading-relaxed text-(--color-text-muted)">Inserisci il codice ricevuto dall’amministratore dell’organizzazione.</p><Message v-if="joinError" severity="error" :closable="false">{{ joinError }}</Message><label for="organization-join-code" class="text-sm font-bold text-(--color-text-muted)">Codice invito</label><InputText id="organization-join-code" v-model="joinCode" class="h-13 text-center font-mono font-extrabold uppercase tracking-widest" :class="joinCode.length > 5 ? 'text-sm normal-case tracking-normal' : 'text-xl'" placeholder="A1B2C" maxlength="64" autocomplete="off" fluid autofocus @input="normalizeJoinCode" /><small class="text-xs text-(--color-text-muted)">I nuovi codici hanno 5 caratteri: lettere maiuscole e numeri.</small><Button type="submit" label="Entra nell’organizzazione" icon="pi pi-sign-in" :loading="joining" :disabled="!joinCodeIsValid" fluid /></form>
    </Dialog>
  </section>
</template>
