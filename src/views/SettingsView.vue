<script setup lang="ts">
import Tag from 'primevue/tag'
import AdminSettingsPanel from '@/components/admin/AdminSettingsPanel.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationsStore } from '@/stores/organizations'
import { useThemeStore } from '@/stores/theme'

// Shared stores provide the read-only account summary and admin permissions.
const auth = useAuthStore()
const organizations = useOrganizationsStore()
const theme = useThemeStore()
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <section class="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 text-(--color-text) sm:gap-5">
    <!-- Section: Header -->
    <PageHeader
      title="Impostazioni"
      description="Consulta il contesto attivo e gestisci le funzionalità disponibili per i tornei."
    />

    <!------------------------------>
    <!-- Section: Account settings -->
    <!------------------------------>
    <article id="personalizzazione" class="scroll-mt-4 rounded-xl border border-(--color-border) bg-(--color-surface-card) p-4 sm:p-6">
      <header class="mb-5 flex items-center gap-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
          <i class="pi pi-sliders-h" aria-hidden="true" />
        </span>
        <div>
          <h2 class="text-xl font-bold tracking-tight">Contesto corrente</h2>
          <p class="mt-1 text-sm text-(--color-text-muted)">Riepilogo delle preferenze applicate alla tua sessione.</p>
        </div>
      </header>

      <dl class="grid gap-3 sm:grid-cols-3">
        <div class="grid gap-3 rounded-lg bg-(--color-surface-soft) p-4">
          <span class="grid size-9 place-items-center rounded-md bg-(--color-surface-card) text-primary shadow-sm"><i class="pi pi-palette" /></span>
          <div>
            <dt class="text-xs font-extrabold tracking-wider text-(--color-text-subtle)">TEMA</dt>
            <dd class="mt-1 font-bold">Verde</dd>
            <p class="mt-1 text-xs text-(--color-text-muted)">Identità visiva attiva</p>
          </div>
        </div>
        <div class="grid gap-3 rounded-lg bg-(--color-surface-soft) p-4">
          <span class="grid size-9 place-items-center rounded-md bg-(--color-surface-card) text-primary shadow-sm"><i class="pi pi-sun" /></span>
          <div>
            <dt class="text-xs font-extrabold tracking-wider text-(--color-text-subtle)">ASPETTO</dt>
            <dd class="mt-1 font-bold">{{ theme.isDark ? 'Scuro' : 'Chiaro' }}</dd>
            <p class="mt-1 text-xs text-(--color-text-muted)">Modalità scura non disponibile</p>
          </div>
        </div>
        <div class="grid gap-3 rounded-lg bg-(--color-surface-soft) p-4">
          <span class="grid size-9 place-items-center rounded-md bg-(--color-surface-card) text-primary shadow-sm"><i class="pi pi-building" /></span>
          <div class="min-w-0">
            <dt class="text-xs font-extrabold tracking-wider text-(--color-text-subtle)">ORGANIZZAZIONE</dt>
            <dd class="mt-1 truncate font-bold" :title="organizations.activeOrganization?.name ?? 'Nessuna'">{{ organizations.activeOrganization?.name ?? 'Nessuna' }}</dd>
            <p class="mt-1 text-xs text-(--color-text-muted)">Contesto dati attivo</p>
          </div>
        </div>
      </dl>
    </article>

    <!------------------------------>
    <!-- Section: Tournament configuration -->
    <!------------------------------>
    <section v-if="auth.isAdmin" id="configurazione" class="scroll-mt-4 grid gap-6 rounded-xl border border-(--color-border) bg-(--color-surface-card) p-4 sm:p-6">
      <header class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div class="flex items-center gap-3">
          <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
            <i class="pi pi-trophy" aria-hidden="true" />
          </span>
          <div>
            <h2 class="text-xl font-bold tracking-tight">Configurazione tornei</h2>
            <p class="mt-1 text-sm text-(--color-text-muted)">Scegli formati e categorie disponibili durante la creazione.</p>
          </div>
        </div>
        <Tag value="Amministrazione" severity="secondary" />
      </header>
      <AdminSettingsPanel embedded />
    </section>

    <article v-else id="configurazione" class="scroll-mt-4 rounded-xl border border-(--color-border) bg-(--color-surface-card) p-4 sm:p-6">
      <div class="flex items-start gap-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-(--color-surface-soft) text-primary">
          <i class="pi pi-lock" aria-hidden="true" />
        </span>
        <div>
          <h2 class="text-xl font-bold tracking-tight">Configurazione tornei</h2>
          <p class="mt-2 text-sm leading-relaxed text-(--color-text-muted)">Formati e categorie sono gestiti dagli amministratori dell’organizzazione.</p>
        </div>
      </div>
    </article>
  </section>
</template>
