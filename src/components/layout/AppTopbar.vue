<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useOrganizationsStore } from '../../stores/organizations'

const route = useRoute()
const organizations = useOrganizationsStore()
const title = computed(() => {
  if (route.path.startsWith('/organizations/explore')) return 'Esplora organizzazioni'
  if (route.path.startsWith('/organizations/new')) return 'Nuova organizzazione'
  if (route.path.startsWith('/organizations')) return 'Organizzazioni'
  if (route.path.startsWith('/players')) return 'Giocatori'
  if (route.path.startsWith('/settings')) return 'Impostazioni'
  if (route.path.startsWith('/profile')) return 'Profilo'
  if (route.path.startsWith('/admin')) return 'Admin'
  if (route.path.includes('/matches/')) return 'Partita'
  return 'Tornei'
})

const activeOrganizationName = computed(() => organizations.activeOrganization?.name ?? 'Tornei globali')
</script>

<template>
  <header class="mobile-topbar hidden max-md:flex items-center gap-3 px-3 h-14 sticky top-0 z-10">
    <div class="topbar-copy">
      <span class="topbar-title">{{ title }}</span>
      <span class="topbar-organization">{{ activeOrganizationName }}</span>
    </div>
  </header>
</template>

<style scoped>
.mobile-topbar {
  margin: 0;
  padding-inline: 0.85rem;
  background: radial-gradient(circle at 100% 0, rgb(var(--color-primary-500-rgb) / 5%), transparent 30rem), var(--app-bg);
  color: var(--color-text);
}
.topbar-copy { display: flex; min-width: 0; flex: 1; align-items: baseline; gap: 0.55rem; overflow: hidden; }
.topbar-title { min-width: 0; overflow: hidden; color: var(--color-text); font-size: 0.92rem; font-weight: 800; letter-spacing: -0.02em; text-overflow: ellipsis; white-space: nowrap; }
.topbar-organization { min-width: 0; overflow: hidden; color: var(--color-text-muted); font-size: 0.76rem; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
</style>
