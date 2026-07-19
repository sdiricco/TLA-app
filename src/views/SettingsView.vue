<script setup lang="ts">
import Tag from 'primevue/tag'
import AdminSettingsPanel from '../components/admin/AdminSettingsPanel.vue'
import { useAuthStore } from '../stores/auth'
import { useOrganizationsStore } from '../stores/organizations'
import { useThemeStore } from '../stores/theme'

const auth = useAuthStore()
const organizations = useOrganizationsStore()
const theme = useThemeStore()
</script>

<template>
  <section class="settings-page">
    <header class="settings-hero">
      <div>
        <p class="eyebrow">PREFERENZE E CONFIGURAZIONE</p>
        <h1>Impostazioni</h1>
        <p>Personalizza le preferenze del tuo account e, se sei amministratore, la configurazione dei tornei.</p>
      </div>
    </header>

    <article class="settings-card">
      <div class="section-heading">
        <div><h2>Impostazioni account</h2><p>Preferenze collegate al tuo accesso.</p></div>
        <i class="pi pi-cog" />
      </div>
      <div class="settings-list">
        <div><span><i class="pi pi-palette" /> Tema</span><strong>Verde</strong></div>
        <div><span><i class="pi pi-moon" /> Modalità scura</span><strong>{{ theme.isDark ? 'Attiva' : 'Disabilitata' }}</strong></div>
        <div><span><i class="pi pi-building" /> Organizzazione attiva</span><strong>{{ organizations.activeOrganization?.name ?? 'Nessuna' }}</strong></div>
      </div>
    </article>

    <section v-if="auth.isAdmin" class="admin-settings">
      <div class="admin-heading">
        <div><p class="eyebrow">AREA AMMINISTRATORE</p><h2>Configurazione tornei</h2><p>Gestisci aspetto app, formati e categorie disponibili.</p></div>
        <Tag value="Solo admin" severity="contrast" />
      </div>
      <AdminSettingsPanel embedded />
    </section>

    <article v-else class="settings-card muted-card">
      <div class="section-heading"><div><h2>Configurazione tornei</h2><p>Formati e categorie sono gestiti dagli amministratori dell’organizzazione.</p></div><i class="pi pi-lock" /></div>
    </article>
  </section>
</template>

<style scoped>
.settings-page { width: min(1080px, 100%); margin: 0 auto; display: grid; gap: 1rem; color: var(--color-text); }
.settings-hero, .settings-card, .admin-settings { padding: clamp(1rem, 3vw, 1.5rem); border: 1px solid var(--color-border); background: var(--color-surface-card); }
.settings-hero h1, h2 { margin: 0; letter-spacing: -.04em; }
.settings-hero h1 { font-size: clamp(2rem, 4vw, 3rem); }
.settings-hero p:last-child, .section-heading p, .admin-heading p { margin: .45rem 0 0; color: var(--color-text-muted); line-height: 1.55; }
.eyebrow { margin: 0 0 .45rem; color: var(--color-primary-700); font-size: .68rem; font-weight: 850; letter-spacing: .14em; }
.section-heading, .admin-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
.section-heading > i { color: var(--color-primary-700); font-size: 1.35rem; }
.settings-list { display: grid; gap: .65rem; margin-top: 1rem; }
.settings-list > div { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding-top: .7rem; border-top: 1px solid var(--color-surface-muted); }
.settings-list span { display: inline-flex; align-items: center; gap: .5rem; color: var(--color-text-muted); font-size: .84rem; }
.settings-list strong { font-size: .84rem; text-align: right; }
.admin-settings { display: grid; gap: 1.2rem; }
.muted-card { background: var(--color-surface-soft); }
@media (max-width: 620px) { .settings-hero, .settings-card, .admin-settings { padding: 1rem; } }
</style>
