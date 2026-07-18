<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { useAuthStore } from '../stores/auth'
import { useOrganizationsStore } from '../stores/organizations'
import type { Organization } from '../types'

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
const joinCodeIsValid = computed(() => /^[A-Z0-9]{5}$/.test(joinCode.value) || /^[A-Za-z0-9_-]{8,64}$/.test(joinCode.value))

function roleLabel(role: Organization['role']): string {
  if (role === 'owner') return 'Proprietario'
  if (role === 'admin') return 'Amministratore'
  return 'Membro'
}

function visibilityLabel(organization: Organization): string {
  if (organization.visibility === 'public') return 'Pubblica'
  return organization.discoverable ? 'Privata · visibile' : 'Privata · nascosta'
}

function goToExplorer(): void {
  void router.push({ name: 'organizations-explore' })
}

function goToCreate(): void {
  void router.push({ name: 'organization-create' })
}

function goToEdit(): void {
  void router.push({ name: 'organization-edit' })
}

function goToTournaments(): void {
  void router.push({ name: 'tournaments' })
}

function selectOrganization(id: string): void {
  store.select(id)
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
    window.setTimeout(() => { inviteMessage.value = null }, 3000)
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
  window.setTimeout(() => { inviteMessage.value = null }, 3000)
}
</script>

<template>
  <section class="organizations-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">ORGANIZZAZIONI</p>
        <h1>{{ pageTitle }}</h1>
        <p>{{ pageDescription }}</p>
      </div>
      <div class="header-actions">
        <Button label="Esplora" icon="pi pi-map" severity="secondary" outlined @click="goToExplorer" />
        <Button v-if="!auth.isGuest" label="Nuova" icon="pi pi-plus" @click="goToCreate" />
      </div>
    </header>

    <Message v-if="store.error" severity="error" :closable="false">{{ store.error }}</Message>
    <Message v-if="inviteMessage" severity="success" :closable="false">{{ inviteMessage }}</Message>

    <template v-if="store.activeOrganization">
      <section class="active-card" aria-labelledby="active-organization-title">
        <div class="active-card-main">
          <div class="organization-mark" aria-hidden="true"><i class="pi pi-building" /></div>
          <div class="active-copy">
            <div class="active-kicker">
              <span class="active-dot" />
              <span>{{ auth.isGuest ? 'STAI ESPLORANDO' : 'ORGANIZZAZIONE ATTIVA' }}</span>
            </div>
            <h2 id="active-organization-title">{{ store.activeOrganization.name }}</h2>
            <p>{{ store.activeOrganization.description || 'Community di tennis su TLA.' }}</p>
            <div class="organization-meta">
              <span><i class="pi pi-lock" />{{ visibilityLabel(store.activeOrganization) }}</span>
              <span v-if="!auth.isGuest"><i class="pi pi-user" />{{ roleLabel(store.activeOrganization.role) }}</span>
              <span v-if="store.activeOrganization.member_count !== undefined"><i class="pi pi-users" />{{ store.activeOrganization.member_count }} membri</span>
            </div>
          </div>
        </div>

        <div class="active-actions">
          <Button label="Vai ai tornei" icon="pi pi-arrow-right" icon-pos="right" @click="goToTournaments" />
          <Button v-if="store.isAdmin" label="Modifica" icon="pi pi-pencil" severity="secondary" outlined @click="goToEdit" />
          <Button
            v-if="store.isAdmin && store.activeOrganization.join_code"
            label="Codice invito"
            icon="pi pi-copy"
            severity="secondary"
            text
            @click="copyInviteCode(store.activeOrganization)"
          />
        </div>
      </section>

      <section v-if="!auth.isGuest" class="organization-section" aria-labelledby="my-organizations-title">
        <header class="section-header">
          <div>
            <h2 id="my-organizations-title">Le tue organizzazioni</h2>
            <p>Seleziona lo spazio su cui vuoi lavorare.</p>
          </div>
          <span class="count-badge">{{ store.organizations.length }}</span>
        </header>

        <div class="organization-list">
          <article
            v-for="organization in store.organizations"
            :key="organization.id"
            class="organization-item"
            :class="{ active: organization.id === store.activeOrganization.id }"
          >
            <button type="button" class="organization-select" @click="selectOrganization(organization.id)">
              <span class="list-mark"><i class="pi pi-building" /></span>
              <span class="list-copy">
                <strong>{{ organization.name }}</strong>
                <small>{{ visibilityLabel(organization) }} · {{ roleLabel(organization.role) }}</small>
              </span>
              <span v-if="organization.id === store.activeOrganization.id" class="selected-label"><i class="pi pi-check" /> Attiva</span>
              <i v-else class="pi pi-chevron-right chevron" aria-hidden="true" />
            </button>
            <Button
              v-if="organization.join_code && ['owner', 'admin'].includes(organization.role)"
              icon="pi pi-copy"
              text
              rounded
              :aria-label="`Copia codice invito di ${organization.name}`"
              @click="copyInviteCode(organization)"
            />
          </article>
        </div>
      </section>

      <section class="next-actions" aria-labelledby="next-actions-title">
        <header class="section-header">
          <div>
            <h2 id="next-actions-title">{{ auth.isGuest ? 'Scopri altre community' : 'Aggiungi uno spazio' }}</h2>
            <p>{{ auth.isGuest ? 'Spostati sulla mappa per trovare altri circoli.' : 'Cerca una community esistente oppure creane una nuova.' }}</p>
          </div>
        </header>
        <div class="action-grid">
          <button type="button" class="action-tile" @click="goToExplorer">
            <span><i class="pi pi-map" /></span>
            <div><strong>Esplora la mappa</strong><small>Trova organizzazioni visibili</small></div>
            <i class="pi pi-arrow-right" aria-hidden="true" />
          </button>
          <button v-if="!auth.isGuest" type="button" class="action-tile" @click="openJoinDialog">
            <span><i class="pi pi-key" /></span>
            <div><strong>Entra con codice</strong><small>Accedi a uno spazio privato</small></div>
            <i class="pi pi-arrow-right" aria-hidden="true" />
          </button>
          <button v-if="!auth.isGuest" type="button" class="action-tile" @click="goToCreate">
            <span><i class="pi pi-plus" /></span>
            <div><strong>Crea organizzazione</strong><small>Apri un nuovo spazio tennis</small></div>
            <i class="pi pi-arrow-right" aria-hidden="true" />
          </button>
        </div>
      </section>
    </template>

    <section v-else class="empty-card">
      <span class="empty-mark"><i class="pi pi-building" /></span>
      <h2>Nessuna organizzazione</h2>
      <p>{{ auth.isGuest ? 'Esplora la mappa per scegliere una community.' : 'Crea il tuo primo spazio oppure trovane uno sulla mappa.' }}</p>
      <div>
        <Button label="Esplora la mappa" icon="pi pi-map" severity="secondary" outlined @click="goToExplorer" />
        <Button v-if="!auth.isGuest" label="Crea organizzazione" icon="pi pi-plus" @click="goToCreate" />
      </div>
    </section>

    <Dialog v-model:visible="joinDialogVisible" modal header="Entra con codice" :style="{ width: 'min(28rem, calc(100vw - 2rem))' }">
      <form class="join-form" @submit.prevent="joinOrganization">
        <p>Inserisci il codice ricevuto dall’amministratore dell’organizzazione.</p>
        <Message v-if="joinError" severity="error" :closable="false">{{ joinError }}</Message>
        <label for="organization-join-code">Codice invito</label>
        <InputText
          id="organization-join-code"
          v-model="joinCode"
          class="join-code-input"
          :class="{ 'legacy-code-input': joinCode.length > 5 }"
          placeholder="A1B2C"
          maxlength="64"
          autocomplete="off"
          fluid
          autofocus
          @input="normalizeJoinCode"
        />
        <small>I nuovi codici hanno 5 caratteri: lettere maiuscole e numeri.</small>
        <Button type="submit" label="Entra nell’organizzazione" icon="pi pi-sign-in" :loading="joining" :disabled="!joinCodeIsValid" fluid />
      </form>
    </Dialog>
  </section>
</template>

<style scoped>
.organizations-page { width: min(920px, 100%); margin: 0 auto; padding: clamp(.8rem, 2.5vw, 2rem) 0 2.5rem; }
.page-header { display: flex; align-items: end; justify-content: space-between; gap: 1.5rem; margin-bottom: 1.5rem; }
.eyebrow { margin: 0 0 .45rem; color: var(--color-primary-700); font-size: .68rem; font-weight: 850; letter-spacing: .16em; }
.page-header h1 { margin: 0; color: var(--color-text); font-size: clamp(2rem, 5vw, 2.75rem); letter-spacing: -.055em; }
.page-header p:last-child { max-width: 34rem; margin: .55rem 0 0; color: var(--color-text-muted); line-height: 1.5; }
.header-actions { display: flex; flex: 0 0 auto; gap: .55rem; }

.active-card { overflow: hidden; border: 1px solid var(--color-border); background: var(--color-surface-card); box-shadow: 0 14px 32px rgb(var(--color-shadow-rgb) / 6%); }
.active-card-main { display: flex; align-items: flex-start; gap: 1rem; padding: clamp(1rem, 3vw, 1.45rem); }
.organization-mark { display: grid; flex: 0 0 auto; place-items: center; width: 3.25rem; height: 3.25rem; background: rgb(var(--color-primary-500-rgb) / 12%); color: var(--color-primary-700); font-size: 1.25rem; }
.active-copy { min-width: 0; flex: 1; }
.active-kicker { display: flex; align-items: center; gap: .45rem; margin-bottom: .35rem; color: var(--color-primary-700); font-size: .65rem; font-weight: 850; letter-spacing: .12em; }
.active-dot { width: .45rem; height: .45rem; border-radius: 50%; background: var(--color-primary-500); box-shadow: 0 0 0 4px rgb(var(--color-primary-500-rgb) / 10%); }
.active-copy h2 { margin: 0; overflow: hidden; font-size: clamp(1.35rem, 3vw, 1.7rem); letter-spacing: -.04em; text-overflow: ellipsis; white-space: nowrap; }
.active-copy > p { max-width: 38rem; margin: .35rem 0 .75rem; color: var(--color-text-muted); font-size: .86rem; line-height: 1.5; }
.organization-meta { display: flex; flex-wrap: wrap; gap: .45rem .8rem; }
.organization-meta span { display: inline-flex; align-items: center; gap: .3rem; color: var(--color-text-muted); font-size: .72rem; font-weight: 650; }
.organization-meta i { color: var(--color-primary-700); font-size: .68rem; }
.active-actions { display: flex; align-items: center; gap: .45rem; padding: .75rem 1rem; border-top: 1px solid var(--color-border); background: var(--color-surface-soft); }
.active-actions :deep(.p-button:first-child) { margin-right: auto; }

.organization-section, .next-actions { margin-top: 2rem; }
.section-header { display: flex; align-items: start; justify-content: space-between; gap: 1rem; margin-bottom: .85rem; }
.section-header h2 { margin: 0; font-size: 1.1rem; letter-spacing: -.025em; }
.section-header p { margin: .25rem 0 0; color: var(--color-text-muted); font-size: .78rem; }
.count-badge { display: grid; place-items: center; min-width: 1.8rem; height: 1.8rem; padding: 0 .45rem; background: var(--color-surface-soft); color: var(--color-text-muted); font-size: .72rem; font-weight: 800; }
.organization-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .55rem; }
.organization-item { display: flex; min-width: 0; align-items: center; border: 1px solid var(--color-border); background: var(--color-surface-card); transition: border-color 160ms, background 160ms; }
.organization-item:hover { border-color: var(--color-border-strong); }
.organization-item.active { border-color: rgb(var(--color-primary-rgb) / 42%); background: rgb(var(--color-primary-500-rgb) / 5%); }
.organization-select { display: flex; min-width: 0; flex: 1; align-items: center; gap: .7rem; padding: .75rem; border: 0; background: transparent; color: var(--color-text); text-align: left; cursor: pointer; }
.list-mark { display: grid; flex: 0 0 auto; place-items: center; width: 2.35rem; height: 2.35rem; background: var(--color-surface-soft); color: var(--color-primary-700); }
.organization-item.active .list-mark { background: rgb(var(--color-primary-500-rgb) / 14%); }
.list-copy { display: grid; min-width: 0; flex: 1; gap: .15rem; }
.list-copy strong, .list-copy small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.list-copy strong { font-size: .86rem; }
.list-copy small { color: var(--color-text-muted); font-size: .68rem; }
.selected-label { display: inline-flex; align-items: center; gap: .25rem; color: var(--color-primary-700); font-size: .65rem; font-weight: 800; }
.chevron { color: var(--color-text-subtle); font-size: .7rem; }

.action-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .55rem; }
.action-tile { display: flex; align-items: center; gap: .8rem; padding: .85rem; border: 1px solid var(--color-border); background: transparent; color: var(--color-text); text-align: left; cursor: pointer; transition: border-color 160ms, background 160ms; }
.action-tile:hover { border-color: rgb(var(--color-primary-rgb) / 38%); background: var(--color-surface-card); }
.action-tile > span { display: grid; flex: 0 0 auto; place-items: center; width: 2.5rem; height: 2.5rem; background: rgb(var(--color-primary-500-rgb) / 10%); color: var(--color-primary-700); }
.action-tile div { display: grid; min-width: 0; flex: 1; gap: .15rem; }
.action-tile strong { font-size: .84rem; }
.action-tile small { color: var(--color-text-muted); font-size: .7rem; }
.action-tile > i { color: var(--color-text-subtle); font-size: .75rem; }

.empty-card { display: grid; justify-items: center; gap: .7rem; padding: clamp(2rem, 8vw, 4rem) 1rem; border: 1px solid var(--color-border); background: var(--color-surface-card); text-align: center; }
.empty-mark { display: grid; place-items: center; width: 3.5rem; height: 3.5rem; background: rgb(var(--color-primary-500-rgb) / 12%); color: var(--color-primary-700); font-size: 1.25rem; }
.empty-card h2 { margin: .2rem 0 0; font-size: 1.25rem; }
.empty-card p { max-width: 30rem; margin: 0; color: var(--color-text-muted); line-height: 1.5; }
.empty-card > div { display: flex; gap: .55rem; margin-top: .4rem; }
.join-form { display: grid; gap: .75rem; }
.join-form p { margin: 0; color: var(--color-text-muted); line-height: 1.5; }
.join-form label { color: var(--color-text-muted); font-size: .76rem; font-weight: 750; }
.join-form small { margin-top: -.35rem; color: var(--color-text-muted); font-size: .7rem; }
.join-code-input { height: 3.25rem; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 1.3rem; font-weight: 800; letter-spacing: .28em; text-align: center; text-transform: uppercase; }
.join-code-input.legacy-code-input { font-size: .82rem; letter-spacing: .04em; text-transform: none; }

@media (max-width: 720px) {
  .organizations-page { padding-top: .5rem; }
  .page-header { align-items: stretch; flex-direction: column; gap: 1rem; margin-bottom: 1.1rem; }
  .page-header h1 { font-size: 2.15rem; }
  .header-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .header-actions :deep(.p-button) { width: 100%; }
  .active-card-main { gap: .75rem; }
  .organization-mark { width: 2.8rem; height: 2.8rem; }
  .active-actions { display: grid; grid-template-columns: 1fr auto; }
  .active-actions :deep(.p-button:first-child) { grid-column: 1 / -1; width: 100%; margin: 0; }
  .organization-list, .action-grid { grid-template-columns: 1fr; }
}

@media (max-width: 420px) {
  .active-copy h2 { font-size: 1.3rem; }
  .organization-meta { gap: .35rem .65rem; }
  .selected-label { display: none; }
  .empty-card > div { width: 100%; flex-direction: column; }
  .empty-card :deep(.p-button) { width: 100%; }
}
</style>
