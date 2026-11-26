<script setup lang="ts">
// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------
import AdminSettingsPanel from '@/components/admin/AdminSettingsPanel.vue'
import PageHeader from '@/components/layout/PageHeader.vue'
import SettingsGroup from '@/components/settings/SettingsGroup.vue'
import SettingsRow from '@/components/settings/SettingsRow.vue'
import { useAuthStore } from '@/stores/auth'
import { useThemeStore } from '@/stores/theme'
import type { ColorSchemePreference } from '@/stores/theme'

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------
const auth = useAuthStore()
const theme = useThemeStore()

// Theme choices rendered as preview tiles; "system" is drawn half light and
// half dark.
const appearanceOptions: Array<{ label: string; value: ColorSchemePreference; icon: string }> = [
  { label: 'Chiaro', value: 'light', icon: 'pi pi-sun' },
  { label: 'Scuro', value: 'dark', icon: 'pi pi-moon' },
  { label: 'Sistema', value: 'system', icon: 'pi pi-desktop' },
]
</script>

<template>
  <section class="mx-auto flex w-full max-w-3xl flex-col gap-8 pb-10 text-(--color-text)">
    <!------------------------------>
    <!-- Section: Header -->
    <!------------------------------>
    <PageHeader title="Impostazioni" description="Preferenze dell’app su questo dispositivo." />

    <!------------------------------>
    <!-- Section: Appearance -->
    <!------------------------------>
    <SettingsGroup id="personalizzazione" class="scroll-mt-4" title="Aspetto">
      <div class="grid gap-4 p-4 sm:p-5">
        <div>
          <p id="appearance-title" class="font-semibold">Tema</p>
          <p class="mt-0.5 text-sm text-(--color-text-muted)">“Sistema” segue l’impostazione chiara o scura del dispositivo.</p>
        </div>

        <div class="grid grid-cols-3 gap-2 sm:gap-3" role="radiogroup" aria-labelledby="appearance-title">
          <button
            v-for="option in appearanceOptions"
            :key="option.value"
            type="button"
            role="radio"
            :aria-checked="theme.appearance === option.value"
            class="group grid cursor-pointer gap-2 rounded-xl border-2 bg-transparent p-1.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500/35"
            :class="theme.appearance === option.value ? 'border-primary-500' : 'border-(--color-border) hover:border-primary-300'"
            @click="theme.setAppearance(option.value)"
          >
            <!-- Mini preview of the app shell in the chosen scheme -->
            <span class="relative block aspect-[16/10] overflow-hidden rounded-lg border border-(--color-border)" aria-hidden="true">
              <span
                class="absolute inset-0 flex"
                :class="option.value === 'dark' ? 'bg-zinc-900' : 'bg-zinc-100'"
              >
                <span class="w-1/4" :class="option.value === 'dark' ? 'bg-primary-950' : 'bg-primary-800'" />
                <span class="flex flex-1 flex-col gap-1 p-1.5 sm:gap-1.5 sm:p-2">
                  <span class="h-1.5 w-1/2 rounded-full" :class="option.value === 'dark' ? 'bg-zinc-600' : 'bg-zinc-300'" />
                  <span class="flex-1 rounded" :class="option.value === 'dark' ? 'bg-zinc-800' : 'bg-white'" />
                  <span class="h-1.5 w-1/3 rounded-full bg-primary-500" />
                </span>
              </span>
              <!-- "Sistema": dark half laid over the right side -->
              <span v-if="option.value === 'system'" class="absolute inset-y-0 right-0 flex w-1/2 bg-zinc-900">
                <span class="flex flex-1 flex-col gap-1 p-1.5 pl-0 sm:gap-1.5 sm:p-2 sm:pl-0">
                  <span class="h-1.5 w-1/3 rounded-full bg-zinc-600" />
                  <span class="flex-1 rounded-r bg-zinc-800" />
                  <span class="h-1.5 w-1/4 rounded-full bg-primary-500" />
                </span>
              </span>
            </span>
            <span class="flex items-center gap-1.5 px-1 pb-0.5 text-sm font-semibold">
              <i
                :class="theme.appearance === option.value ? 'pi pi-check-circle text-primary' : `${option.icon} text-(--color-text-subtle)`"
                aria-hidden="true"
              />
              {{ option.label }}
            </span>
          </button>
        </div>
      </div>
    </SettingsGroup>

    <!------------------------------>
    <!-- Section: Tournament configuration -->
    <!------------------------------>
    <div id="configurazione" class="scroll-mt-4">
      <AdminSettingsPanel v-if="auth.isAdmin" />
      <SettingsGroup v-else title="Tornei">
        <SettingsRow
          title="Formati e categorie"
          description="Sono gestiti dagli amministratori dell’organizzazione."
          icon="pi pi-lock"
          muted
        />
      </SettingsGroup>
    </div>

    <!------------------------------>
    <!-- Section: About -->
    <!------------------------------>
    <SettingsGroup title="Informazioni">
      <SettingsRow title="Novità dell’app" description="Tutti gli aggiornamenti di TLA." icon="pi pi-history" :to="{ name: 'changelog' }" />
      <SettingsRow
        v-if="!auth.isGuest"
        title="Richieste e suggerimenti"
        description="Proponi idee o segnala problemi."
        icon="pi pi-lightbulb"
        :to="{ name: 'requests' }"
      />
    </SettingsGroup>
  </section>
</template>
