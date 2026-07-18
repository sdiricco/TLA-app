<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useAuthStore } from '../stores/auth'
import { useOrganizationsStore } from '../stores/organizations'
import { ref } from 'vue'

const router = useRouter()
const auth = useAuthStore()
const store = useOrganizationsStore()
const inviteMessage = ref<string | null>(null)

function goToExplorer(): void {
  void router.push({ name: 'organizations-explore' })
}

function goToCreate(): void {
  void router.push({ name: 'organization-create' })
}

function goToEdit(): void {
  void router.push({ name: 'organization-edit' })
}

async function copyInviteCode(organization: { join_code: string }): Promise<void> {
  if (!organization.join_code) return
  await navigator.clipboard.writeText(organization.join_code)
  inviteMessage.value = 'Codice copiato negli appunti.'
  window.setTimeout(() => { inviteMessage.value = null }, 2200)
}
</script>

<template>
  <section class="organization-detail-page">
    <header class="page-header">
      <p class="eyebrow">ORGANIZZAZIONI</p>
      <h1>{{ store.activeOrganization ? 'La tua organizzazione' : 'Inizia da un’organizzazione' }}</h1>
      <p>{{ store.activeOrganization ? 'Gestisci i dettagli dello spazio attualmente selezionato.' : 'Scegli una community esistente oppure crea il tuo spazio.' }}</p>
    </header>

    <Message v-if="store.error" severity="error" :closable="false">{{ store.error }}</Message>

    <template v-if="store.activeOrganization">
      <section class="current-organization-card" aria-labelledby="current-organization-title">
        <div class="organization-avatar"><i class="pi pi-building" /></div>
        <div class="organization-heading">
          <p class="eyebrow">SPAZIO ATTIVO</p>
          <h2 id="current-organization-title">{{ store.activeOrganization.name }}</h2>
          <p>{{ store.activeOrganization.city || 'Località non indicata' }} · {{ store.activeOrganization.visibility === 'public' ? 'Organizzazione pubblica' : 'Organizzazione privata' }}</p>
        </div>
        <span class="role-badge">{{ store.activeOrganization.role === 'owner' ? 'Proprietario' : store.activeOrganization.role === 'admin' ? 'Amministratore' : 'Membro' }}</span>
      </section>

      <div class="primary-actions">
        <Button label="Cambia organizzazione" icon="pi pi-map" fluid @click="goToExplorer" />
        <Button v-if="store.isAdmin" label="Modifica organizzazione" icon="pi pi-pencil" severity="secondary" outlined fluid @click="goToEdit" />
        <Button v-if="store.isAdmin && store.activeOrganization.join_code" label="Condividi codice invito" icon="pi pi-copy" severity="secondary" outlined fluid @click="copyInviteCode(store.activeOrganization)" />
        <Button v-if="!auth.isGuest" label="Crea nuova organizzazione" icon="pi pi-plus" severity="secondary" outlined fluid @click="goToCreate" />
      </div>
      <small v-if="inviteMessage" class="invite-message">{{ inviteMessage }}</small>

      <section v-if="!auth.isGuest && store.organizations.length > 1" class="my-organizations" aria-labelledby="my-organizations-title">
        <div class="section-heading"><div><p class="eyebrow">I TUOI SPAZI</p><h2 id="my-organizations-title">Le tue organizzazioni</h2></div><span>{{ store.organizations.length }}</span></div>
        <div class="organization-list">
          <div v-for="organization in store.organizations" :key="organization.id" class="organization-row" :class="{ active: organization.id === store.activeOrganization.id }">
            <button type="button" class="organization-select" @click="store.select(organization.id)">
              <span class="organization-icon"><i class="pi pi-building" /></span>
              <span><strong>{{ organization.name }}</strong><small>{{ organization.visibility === 'public' ? 'Pubblica' : 'Privata' }} · {{ organization.role === 'owner' ? 'Proprietario' : organization.role === 'admin' ? 'Amministratore' : 'Membro' }}</small></span>
            </button>
            <Button v-if="organization.join_code && ['owner', 'admin'].includes(organization.role)" icon="pi pi-copy" text rounded aria-label="Copia codice invito" @click="copyInviteCode(organization)" />
          </div>
        </div>
      </section>
    </template>

    <section v-else class="empty-organization-card">
      <div class="empty-icon"><i class="pi pi-building" /></div>
      <h2>Nessuna organizzazione selezionata</h2>
      <p>Per entrare nell’app devi prima creare un’organizzazione o entrare in una community esistente.</p>
      <div class="empty-actions">
        <Button v-if="!auth.isGuest" label="Crea organizzazione" icon="pi pi-plus" fluid @click="goToCreate" />
        <Button label="Esplora organizzazioni" icon="pi pi-map" severity="secondary" :outlined="!auth.isGuest" fluid @click="goToExplorer" />
      </div>
    </section>
  </section>
</template>

<style scoped>
.organization-detail-page { width: min(760px, 100%); margin: 0 auto; padding: clamp(1rem, 3vw, 2.5rem) 0; }
.page-header { max-width: 620px; margin-bottom: 1.5rem; }
.eyebrow { margin: 0 0 .55rem; color: var(--color-primary-700); font-size: .72rem; font-weight: 850; letter-spacing: .15em; }
h1 { margin: 0; color: var(--color-text); font-size: clamp(2rem, 7vw, 3rem); letter-spacing: -.055em; }
.page-header > p:last-child { color: var(--color-text-muted); line-height: 1.55; }
.current-organization-card, .empty-organization-card { border: 1px solid var(--color-border); background: var(--color-surface-card); box-shadow: 0 16px 34px rgb(var(--color-shadow-rgb) / 6%); }
.current-organization-card { display: flex; align-items: center; gap: 1rem; padding: clamp(1.1rem, 4vw, 1.6rem); }
.organization-avatar, .empty-icon { display: grid; flex: 0 0 auto; place-items: center; width: 3.5rem; height: 3.5rem; background: rgb(var(--color-primary-500-rgb) / 12%); color: var(--color-primary-700); font-size: 1.35rem; }
.organization-heading { min-width: 0; flex: 1; }
.organization-heading h2 { margin: 0; overflow: hidden; font-size: 1.35rem; letter-spacing: -.03em; text-overflow: ellipsis; white-space: nowrap; }
.organization-heading p:last-child { margin: .3rem 0 0; color: var(--color-text-muted); font-size: .82rem; }
.role-badge { align-self: flex-start; color: var(--color-primary-700); font-size: .7rem; font-weight: 800; white-space: nowrap; }
.primary-actions, .empty-actions { display: grid; gap: .65rem; margin: 1rem 0 1.5rem; }
.invite-message { display: block; color: var(--color-primary-700); font-weight: 750; }
.my-organizations { margin-top: 1.5rem; }
.organization-list { display: grid; gap: .5rem; }
.organization-row { display: flex; align-items: center; gap: .5rem; border: 1px solid var(--color-border); background: var(--color-surface-card); }
.organization-row.active { border-color: var(--color-primary-500); }
.organization-select { display: flex; align-items: center; gap: .7rem; min-width: 0; flex: 1; padding: .7rem; border: 0; background: transparent; color: var(--color-text); text-align: left; cursor: pointer; }
.organization-select > span:last-child { display: grid; min-width: 0; gap: .15rem; }
.organization-select small { color: var(--color-text-muted); font-size: .72rem; }
.empty-organization-card { display: grid; justify-items: center; gap: .75rem; padding: clamp(1.5rem, 7vw, 3rem) 1.2rem; text-align: center; }
.empty-icon { margin-bottom: .25rem; }
.empty-organization-card h2 { margin: 0; font-size: 1.3rem; }
.empty-organization-card p { max-width: 34rem; margin: 0; color: var(--color-text-muted); line-height: 1.55; }
.empty-actions { width: min(22rem, 100%); margin-bottom: 0; }
@media (max-width: 680px) {
  .current-organization-card { align-items: flex-start; }
  .role-badge { margin-left: auto; }
}
</style>
