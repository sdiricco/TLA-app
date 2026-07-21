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
  <section class="mx-auto flex w-full max-w-270 flex-col gap-4 text-(--color-text)">
    <!-- Section: Header -->
    <div class="border border-(--color-border) bg-(--color-surface-card) p-4 sm:p-6">
      <PageHeader
        eyebrow="PREFERENZE E CONFIGURAZIONE"
        title="Impostazioni"
        description="Personalizza le preferenze del tuo account e, se sei amministratore, la configurazione dei tornei."
      />
    </div>

    <!------------------------------>
    <!-- Section: Account settings -->
    <!------------------------------>
    <article class="border border-(--color-border) bg-(--color-surface-card) p-4 sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold tracking-tight">Impostazioni account</h2>
          <p class="mt-2 text-sm text-(--color-text-muted)">Preferenze collegate al tuo accesso.</p>
        </div>
        <i class="pi pi-cog text-xl text-primary-700" aria-hidden="true" />
      </div>

      <dl class="mt-4 grid gap-3 text-sm">
        <div class="flex items-center justify-between gap-4 border-t border-(--color-surface-muted) pt-3">
          <dt class="flex items-center gap-2 text-(--color-text-muted)"><i class="pi pi-palette" /> Tema</dt>
          <dd class="font-bold">Verde</dd>
        </div>
        <div class="flex items-center justify-between gap-4 border-t border-(--color-surface-muted) pt-3">
          <dt class="flex items-center gap-2 text-(--color-text-muted)"><i class="pi pi-moon" /> Modalità scura</dt>
          <dd class="font-bold">{{ theme.isDark ? 'Attiva' : 'Disabilitata' }}</dd>
        </div>
        <div class="flex items-center justify-between gap-4 border-t border-(--color-surface-muted) pt-3">
          <dt class="flex items-center gap-2 text-(--color-text-muted)"><i class="pi pi-building" /> Organizzazione attiva</dt>
          <dd class="text-right font-bold">{{ organizations.activeOrganization?.name ?? 'Nessuna' }}</dd>
        </div>
      </dl>
    </article>

    <!------------------------------>
    <!-- Section: Tournament configuration -->
    <!------------------------------>
    <section v-if="auth.isAdmin" class="grid gap-5 border border-(--color-border) bg-(--color-surface-card) p-4 sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <p class="mb-2 text-xs font-extrabold tracking-[0.14em] text-primary-700">AREA AMMINISTRATORE</p>
          <h2 class="text-xl font-bold tracking-tight">Configurazione tornei</h2>
          <p class="mt-2 text-sm text-(--color-text-muted)">Gestisci aspetto app, formati e categorie disponibili.</p>
        </div>
        <Tag value="Solo admin" severity="contrast" />
      </div>
      <AdminSettingsPanel embedded />
    </section>

    <article v-else class="border border-(--color-border) bg-(--color-surface-soft) p-4 sm:p-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold tracking-tight">Configurazione tornei</h2>
          <p class="mt-2 text-sm leading-relaxed text-(--color-text-muted)">Formati e categorie sono gestiti dagli amministratori dell’organizzazione.</p>
        </div>
        <i class="pi pi-lock text-xl text-primary-700" aria-hidden="true" />
      </div>
    </article>
  </section>
</template>
