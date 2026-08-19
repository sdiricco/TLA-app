<script setup lang="ts">
import { computed } from 'vue'
import SelectButton from 'primevue/selectbutton'
import Tag from 'primevue/tag'
import AdminSettingsPanel from '@/components/admin/AdminSettingsPanel.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationsStore } from '@/stores/organizations'
import { useThemeStore } from '@/stores/theme'
import type { ColorSchemePreference } from '@/stores/theme'

// Shared stores provide the read-only account summary and admin permissions.
const auth = useAuthStore()
const organizations = useOrganizationsStore()
const theme = useThemeStore()
const appearanceOptions: Array<{ label: string; value: ColorSchemePreference; icon: string }> = [
  { label: 'Chiaro', value: 'light', icon: 'pi pi-sun' },
  { label: 'Scuro', value: 'dark', icon: 'pi pi-moon' },
  { label: 'Sistema', value: 'system', icon: 'pi pi-desktop' },
]
const appearanceLabel = computed(() => appearanceOptions.find(({ value }) => value === theme.appearance)?.label ?? 'Sistema')
const appearanceIcon = computed(() => appearanceOptions.find(({ value }) => value === theme.appearance)?.icon ?? 'pi pi-desktop')
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
    <!-- Section: Appearance preferences -->
    <!------------------------------>
    <article id="personalizzazione" class="scroll-mt-4 rounded-xl border border-(--color-border) bg-(--color-surface-card) p-4 sm:p-6">
      <header class="mb-5 flex items-center gap-3">
        <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
          <i class="pi pi-sliders-h" aria-hidden="true" />
        </span>
        <div>
          <h2 class="text-xl font-bold tracking-tight">Personalizzazione</h2>
          <p class="mt-1 text-sm text-(--color-text-muted)">Scegli come visualizzare TLA su questo dispositivo.</p>
        </div>
      </header>

      <div class="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.6fr)]">
        <section class="grid gap-4 rounded-lg border border-(--color-border) bg-(--color-surface-soft) p-4" aria-labelledby="appearance-title">
          <div class="flex items-start gap-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-(--color-surface-card) text-primary shadow-sm"><i :class="appearanceIcon" /></span>
            <div>
              <h3 id="appearance-title" class="font-bold">Aspetto</h3>
              <p class="mt-1 text-sm leading-relaxed text-(--color-text-muted)">“Sistema” segue automaticamente l’impostazione chiara o scura del dispositivo.</p>
            </div>
          </div>
          <SelectButton
            :model-value="theme.appearance"
            :options="appearanceOptions"
            option-label="label"
            option-value="value"
            :allow-empty="false"
            aria-labelledby="appearance-title"
            @update:model-value="(value) => theme.setAppearance(value as ColorSchemePreference)"
          >
            <template #option="{ option }">
              <span class="flex items-center justify-center gap-2"><i :class="option.icon" /><span>{{ option.label }}</span></span>
            </template>
          </SelectButton>
          <p class="text-xs text-(--color-text-muted)">Preferenza salvata: <strong class="text-(--color-text)">{{ appearanceLabel }}</strong></p>
        </section>

        <dl class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div class="flex items-center gap-3 rounded-lg bg-(--color-surface-soft) p-4">
            <span class="grid size-9 shrink-0 place-items-center rounded-md bg-(--color-surface-card) text-primary shadow-sm"><i class="pi pi-palette" /></span>
            <div class="min-w-0">
              <dt class="text-xs font-extrabold tracking-wider text-(--color-text-subtle)">TEMA</dt>
              <dd class="mt-1 font-bold">Verde TLA</dd>
            </div>
          </div>
          <div class="flex items-center gap-3 rounded-lg bg-(--color-surface-soft) p-4">
            <span class="grid size-9 shrink-0 place-items-center rounded-md bg-(--color-surface-card) text-primary shadow-sm"><i class="pi pi-building" /></span>
            <div class="min-w-0">
              <dt class="text-xs font-extrabold tracking-wider text-(--color-text-subtle)">CONTESTO</dt>
              <dd class="mt-1 truncate font-bold" :title="organizations.activeOrganization?.name ?? 'Tutti i contenuti'">{{ organizations.activeOrganization?.name ?? 'Tutti i contenuti' }}</dd>
            </div>
          </div>
        </dl>
      </div>
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
