<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Menu from 'primevue/menu'
import { useAuthStore } from '../../stores/auth'
import { useOrganizationsStore } from '../../stores/organizations'
import { useLayoutStore } from '../../stores/layout'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const organizations = useOrganizationsStore()
const layout = useLayoutStore()
const organizationMenu = ref()
const title = computed(() => {
  if (route.path.startsWith('/dashboard')) return 'Dashboard'
  if (route.path.startsWith('/organizations/explore')) return 'Esplora organizzazioni'
  if (route.path.startsWith('/organizations/new')) return 'Nuova organizzazione'
  if (route.path.startsWith('/organizations')) return 'Organizzazioni'
  if (route.path.startsWith('/players')) return 'Giocatori'
  if (route.path.startsWith('/settings')) return 'Impostazioni'
  if (route.path.startsWith('/changelog')) return 'Changelog'
  if (route.path.startsWith('/requests')) return 'Richieste'
  if (route.path.startsWith('/profile')) return 'Profilo'
  if (route.path.startsWith('/admin')) return 'Admin'
  if (route.path.includes('/matches/')) return 'Partita'
  return 'Tornei'
})

const organizationFilterLabel = computed(() => organizations.activeOrganization?.name ?? 'Tutti i contenuti')
const organizationMenuItems = computed(() => [
  {
    label: 'Tutti i contenuti',
    icon: organizations.activeOrganization ? 'pi pi-filter' : 'pi pi-check',
    command: selectGlobalContext,
  },
  ...(organizations.organizations.length
    ? organizations.organizations.map((organization) => ({
        label: organization.name,
        icon: organization.id === organizations.activeId ? 'pi pi-check' : 'pi pi-building',
        command: () => selectOrganization(organization.id),
      }))
    : [{
        label: 'Non sei iscritto a nessuna organizzazione',
        icon: 'pi pi-info-circle',
        disabled: true,
      }]),
  { separator: true },
  {
    label: 'Gestisci organizzazioni',
    icon: 'pi pi-cog',
    command: () => void router.push({ name: 'organizations' }),
  },
])
const displayedTitle = computed(() => layout.topbarContext?.title ?? title.value)
const backNavigation = computed(() => {
  if (layout.topbarContext?.backTo) {
    return {
      to: layout.topbarContext.backTo,
      label: layout.topbarContext.backLabel ?? 'Torna indietro',
    }
  }

  if (route.name === 'request-create' || route.name === 'request-detail') {
    return { to: '/requests', label: 'Torna alle richieste' }
  }

  if (route.name === 'settings' || route.name === 'changelog' || route.name === 'requests') {
    return { to: '/profile', label: 'Torna al profilo' }
  }

  return null
})
const createAction = computed(() => {
  if (auth.canCreateTournament && route.name === 'tournaments') {
    return {
      routeName: 'tournament-create' as const,
      label: 'Nuovo torneo',
      icon: 'pi pi-plus',
      ariaLabel: 'Crea un nuovo torneo',
    }
  }
  if (auth.isAdmin && route.name === 'players') {
    return {
      routeName: 'player-create' as const,
      label: 'Nuovo giocatore',
      icon: 'pi pi-user-plus',
      ariaLabel: 'Crea un nuovo giocatore',
    }
  }
  return null
})

function openCreate(): void {
  if (auth.isGuest || !createAction.value) return
  void router.push({ name: createAction.value.routeName })
}

function toggleOrganizationMenu(event: Event): void {
  organizationMenu.value?.toggle(event)
}

function selectOrganization(id: string): void {
  organizations.select(id)
  window.location.assign('/dashboard')
}

function selectGlobalContext(): void {
  organizations.clearSelection()
  window.location.assign('/dashboard')
}

function goBack(): void {
  if (!backNavigation.value) return
  void router.push(backNavigation.value.to)
}
</script>

<template>
  <header class="app-topbar flex h-14 shrink-0 items-center gap-2">
    <button
      v-if="backNavigation"
      type="button"
      class="topbar-icon"
      :aria-label="backNavigation.label"
      :title="backNavigation.label"
      @click="goBack"
    >
      <i class="pi pi-arrow-left" aria-hidden="true" />
    </button>
    <div class="topbar-copy">
      <span class="topbar-title">{{ displayedTitle }}</span>
      <button
        type="button"
        class="organization-filter"
        aria-haspopup="menu"
        :aria-label="`Filtra per organizzazione: ${organizationFilterLabel}`"
        @click="toggleOrganizationMenu"
      >
        <IconifyIcon icon="mdi:filter-variant" aria-hidden="true" />
        <span>{{ organizationFilterLabel }}</span>
        <IconifyIcon icon="mdi:chevron-down" aria-hidden="true" />
      </button>
      <Menu ref="organizationMenu" :model="organizationMenuItems" class="w-72!" popup />
    </div>
    <div class="topbar-actions">
      <button
        type="button"
        class="topbar-icon"
        aria-label="Apri ricerca globale"
        title="Cerca"
        @click="layout.openSearch"
      >
        <i class="pi pi-search" aria-hidden="true" />
      </button>
      <div id="app-topbar-context-actions" class="contents"></div>
      <Button
        v-if="createAction"
        class="md:hidden"
        :icon="createAction.icon"
        :aria-label="createAction.ariaLabel"
        :disabled="auth.isGuest"
        @click="openCreate"
      />
      <Button
        v-if="createAction"
        class="hidden md:inline-flex"
        :label="createAction.label"
        :icon="createAction.icon"
        :aria-label="createAction.ariaLabel"
        :disabled="auth.isGuest"
        @click="openCreate"
      />
    </div>
  </header>
</template>

<style scoped>
.app-topbar {
  margin: 0;
  padding-inline: var(--app-page-padding);
  background: radial-gradient(circle at 100% 0, rgb(var(--color-primary-500-rgb) / 5%), transparent 30rem), var(--app-bg);
  color: var(--color-text);
}
.topbar-copy { display: flex; min-width: 0; flex: 1; align-items: center; gap: 0.55rem; overflow: hidden; }
.topbar-title { min-width: 0; overflow: hidden; color: var(--color-text); font-size: 0.92rem; font-weight: 800; letter-spacing: -0.02em; text-overflow: ellipsis; white-space: nowrap; }
.organization-filter { display: flex; min-width: 0; max-width: min(10rem, 42vw); height: 2rem; align-items: center; gap: .3rem; padding: 0 .5rem; border: 1px solid var(--color-border); border-radius: .6rem; background: transparent; color: var(--color-text-muted); cursor: pointer; }
.organization-filter:hover { border-color: var(--color-primary-300); color: var(--color-primary-700); }
.organization-filter span { min-width: 0; overflow: hidden; font-size: .7rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.organization-filter :deep(svg:first-child) { flex: 0 0 auto; color: var(--color-primary-600); }
.organization-filter :deep(svg:last-child) { flex: 0 0 auto; font-size: .72rem; }
.organization-filter:focus-visible { outline: 2px solid rgb(var(--color-primary-500-rgb) / 35%); outline-offset: 2px; }
.topbar-actions { display: flex; flex: 0 0 auto; align-items: center; gap: 0.15rem; }
.topbar-icon { display: grid; width: 2.5rem; height: 2.5rem; flex: 0 0 auto; place-items: center; border: 0; border-radius: 999px; background: transparent; color: var(--color-text); cursor: pointer; }
.topbar-icon:hover { color: var(--color-primary-600); }
.topbar-icon:focus-visible { outline: 2px solid rgb(var(--color-primary-500-rgb) / 35%); outline-offset: 2px; }
@media (max-width: 767px) { .app-topbar { padding-inline: 0.85rem; } }
@media (min-width: 768px) { .organization-filter { max-width: 14rem; padding-inline: .65rem; } }
</style>
