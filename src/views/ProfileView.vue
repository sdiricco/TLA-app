<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import AdminSettingsPanel from '../components/admin/AdminSettingsPanel.vue'
import { useAuthStore } from '../stores/auth'
import { useOrganizationsStore } from '../stores/organizations'
import { useThemeStore } from '../stores/theme'

const router = useRouter()
const auth = useAuthStore()
const organizations = useOrganizationsStore()
const theme = useThemeStore()

const displayName = computed(() => auth.user?.name || auth.user?.email || 'Profilo')
const email = computed(() => auth.user?.email ?? '—')
const appRoleLabel = computed(() => auth.isAdmin ? 'Admin' : auth.isGuest ? 'Ospite' : 'Giocatore')
const organizationRoleLabel = computed(() => {
  const role = organizations.activeOrganization?.role
  if (role === 'owner') return 'Proprietario'
  if (role === 'admin') return 'Amministratore'
  if (role === 'member') return 'Membro'
  return 'Nessuna organizzazione'
})

const permissions = computed(() => {
  if (auth.isGuest) {
    return ['Consultazione tornei', 'Accesso limitato', 'Nessuna modifica dati']
  }

  const base = ['Visualizzazione tornei', 'Accesso organizzazione attiva']
  if (auth.isAdmin) {
    return [
      ...base,
      'Gestione giocatori',
      'Gestione tornei',
      'Configurazione formati e categorie',
    ]
  }

  return [...base, 'Profilo personale collegato']
})
</script>

<template>
  <div class="profile-page">
    <header class="profile-hero">
      <div class="hero-copy">
        <p class="eyebrow">PROFILO PERSONALE</p>
        <h1>{{ displayName }}</h1>
        <p>Ruoli, permessi e impostazioni del tuo accesso TLA in un unico posto.</p>
      </div>

      <div class="hero-badges">
        <Tag :value="appRoleLabel" severity="contrast" />
        <Tag v-if="organizations.activeOrganization" :value="organizationRoleLabel" severity="success" />
      </div>
    </header>

    <section class="summary-grid">
      <article class="summary-card">
        <span class="summary-icon"><i class="pi pi-user" /></span>
        <div>
          <small>ACCOUNT</small>
          <strong>{{ email }}</strong>
          <p>{{ appRoleLabel }}</p>
        </div>
      </article>

      <article class="summary-card">
        <span class="summary-icon"><i class="pi pi-building" /></span>
        <div>
          <small>ORGANIZZAZIONE ATTIVA</small>
          <strong>{{ organizations.activeOrganization?.name ?? 'Nessuna selezione' }}</strong>
          <p>{{ organizationRoleLabel }}</p>
        </div>
      </article>

      <article class="summary-card">
        <span class="summary-icon"><i class="pi pi-palette" /></span>
        <div>
          <small>ASPETTO</small>
          <strong>Tema verde fisso</strong>
          <p>{{ theme.isDark ? 'Scuro' : 'Chiaro' }} · Varianti disabilitate</p>
        </div>
      </article>
    </section>

    <section class="content-grid">
      <article class="panel-card">
        <div class="panel-heading">
          <div>
            <h2>Ruoli e permessi</h2>
            <p>Qui trovi i privilegi effettivi del tuo accesso corrente.</p>
          </div>
        </div>

        <div class="info-list">
          <div>
            <small>RUOLO APP</small>
            <strong>{{ appRoleLabel }}</strong>
          </div>
          <div>
            <small>RUOLO ORGANIZZAZIONE</small>
            <strong>{{ organizationRoleLabel }}</strong>
          </div>
          <div>
            <small>ORGANIZZAZIONE</small>
            <strong>{{ organizations.activeOrganization?.name ?? '—' }}</strong>
          </div>
        </div>

        <div class="permission-chips">
          <span v-for="permission in permissions" :key="permission">{{ permission }}</span>
        </div>
      </article>

      <article class="panel-card">
        <div class="panel-heading">
          <div>
            <h2>Impostazioni</h2>
            <p>Preferenze e configurazioni personali collegate al tuo accesso.</p>
          </div>
        </div>

        <div class="settings-list">
          <div>
            <span><i class="pi pi-palette" /> Tema</span>
            <strong>Verde</strong>
          </div>
          <div>
            <span><i class="pi pi-moon" /> Modalità scura</span>
            <strong>Disabilitata</strong>
          </div>
          <div>
            <span><i class="pi pi-building" /> Spazi</span>
            <Button label="Gestisci organizzazioni" icon="pi pi-arrow-right" text @click="router.push({ name: 'organizations' })" />
          </div>
        </div>
      </article>
    </section>

    <section v-if="auth.isAdmin" class="admin-section">
      <div class="panel-heading">
        <div>
          <p class="eyebrow">AREA ADMIN</p>
          <h2>Configurazione applicazione</h2>
          <p>La vecchia pagina Admin ora vive direttamente nel tuo profilo personale.</p>
        </div>
      </div>

      <AdminSettingsPanel embedded />
    </section>
  </div>
</template>

<style scoped>
.profile-page { --green: var(--color-primary-700); display: flex; max-width: 1480px; margin: 0 auto; flex-direction: column; gap: 1rem; color: var(--color-text); }
.profile-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1.2rem; border: 1px solid var(--color-border); background: var(--color-surface-card); }
.hero-copy { min-width: 0; }
.eyebrow { margin: 0 0 0.45rem; color: var(--green); font-size: 0.68rem; font-weight: 800; letter-spacing: 0.14em; }
.profile-hero h1 { margin: 0; font-size: clamp(1.9rem, 4vw, 3rem); line-height: 1; letter-spacing: -0.05em; }
.profile-hero p:last-child { margin: 0.7rem 0 0; color: var(--color-text-muted); font-size: 0.9rem; }
.hero-badges { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.45rem; }
.summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.8rem; }
.summary-card { display: flex; align-items: center; gap: 0.85rem; padding: 0.95rem 1rem; border: 1px solid var(--color-border); background: var(--color-surface-card); }
.summary-icon { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; flex: 0 0 auto; background: var(--color-primary-soft-surface); color: var(--green); }
.summary-card small { display: block; color: var(--color-text-subtle); font-size: 0.56rem; font-weight: 800; letter-spacing: 0.08em; }
.summary-card strong { display: block; margin-top: 0.16rem; font-size: 0.88rem; }
.summary-card p { margin: 0.2rem 0 0; color: var(--color-text-muted); font-size: 0.7rem; }
.content-grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(320px, 0.9fr); gap: 0.8rem; }
.panel-card, .admin-section { padding: 1rem; border: 1px solid var(--color-border); background: var(--color-surface-card); }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.8rem; margin-bottom: 0.9rem; }
.panel-heading h2 { margin: 0; font-size: 1.1rem; letter-spacing: -0.03em; }
.panel-heading p { margin: 0.35rem 0 0; color: var(--color-text-muted); font-size: 0.78rem; }
.info-list { display: grid; gap: 0.65rem; }
.info-list > div, .settings-list > div { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.75rem 0; border-top: 1px solid var(--color-surface-muted); }
.info-list > div:first-child, .settings-list > div:first-child { border-top: 0; padding-top: 0; }
.info-list small { color: var(--color-text-subtle); font-size: 0.56rem; font-weight: 800; letter-spacing: 0.08em; }
.info-list strong { display: block; margin-top: 0.14rem; font-size: 0.9rem; }
.permission-chips { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 1rem; }
.permission-chips span { padding: 0.42rem 0.6rem; background: var(--color-surface-soft); color: var(--color-text-muted); font-size: 0.72rem; font-weight: 650; }
.settings-list span { display: inline-flex; align-items: center; gap: 0.45rem; color: var(--color-text-muted); font-size: 0.8rem; }
.settings-list strong { font-size: 0.8rem; }
.admin-section { display: flex; flex-direction: column; gap: 1rem; }

@media (max-width: 920px) {
  .summary-grid, .content-grid { grid-template-columns: 1fr; }
}

@media (max-width: 620px) {
  .profile-page { gap: 0.8rem; }
  .profile-hero { flex-direction: column; padding: 0.9rem; }
  .hero-badges { justify-content: flex-start; }
  .summary-card, .panel-card, .admin-section { padding: 0.85rem; }
  .panel-heading h2 { font-size: 1rem; }
}
</style>
