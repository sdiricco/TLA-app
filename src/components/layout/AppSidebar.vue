<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Menu from 'primevue/menu'
import { useAuthStore } from '../../stores/auth'
import { useLayoutStore } from '../../stores/layout'
import { useOrganizationsStore } from '../../stores/organizations'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const layout = useLayoutStore()
const organizations = useOrganizationsStore()
const organizationsOpen = ref(false)
const profileMenu = ref()

function isActive(to: string): boolean {
  if (to === '/') return route.path === to
  return route.path.startsWith(to)
}

const navItems = [
  { label: 'Tornei', icon: 'mdi:trophy-outline', to: '/tournaments' },
  { label: 'Giocatori', icon: 'mdi:account-group-outline', to: '/players' },
]

const profileItems = computed(() => [
  { label: 'Profilo', icon: 'pi pi-user', command: () => void router.push({ name: 'profile' }) },
  { label: 'Impostazioni', icon: 'pi pi-cog', command: () => void router.push({ name: 'settings' }) },
  { label: 'Changelog', icon: 'pi pi-history', command: () => void router.push({ name: 'changelog' }) },
  { label: 'Richieste', icon: 'pi pi-lightbulb', command: () => void router.push({ name: 'requests' }) },
  { label: 'Esci', icon: 'pi pi-sign-out', command: handleLogout },
])

function selectOrganization(id: string): void {
  organizations.select(id)
  organizationsOpen.value = false
  window.location.assign('/tournaments')
}

function selectGlobalContext(): void {
  organizations.clearSelection()
  organizationsOpen.value = false
  window.location.assign('/tournaments')
}

const displayName = computed(() => auth.user?.name || auth.user?.email || 'Utente')
const otherOrganizations = computed(() =>
  organizations.organizations.filter((organization) => organization.id !== organizations.activeId),
)

async function handleLogout(): Promise<void> {
  await auth.logout()
  await router.push('/login')
}

function toggleProfileMenu(event: Event): void {
  profileMenu.value?.toggle(event)
}
</script>

<template>
  <aside class="app-sidebar">
    <div class="sidebar-brand">
      <span class="brand-ball" />
      <div><strong>TLA</strong><small>LEAGUE ADMIN</small></div>
    </div>

    <nav class="sidebar-nav">
      <div class="organization-switcher">
        <div class="organization-header">
          <span>FILTRO ORGANIZZAZIONE</span>
          <RouterLink to="/organizations" @click="layout.closeSidebar()">Gestisci</RouterLink>
        </div>

        <button
          class="organization-current"
          type="button"
          :aria-expanded="organizationsOpen"
          @click="organizationsOpen = !organizationsOpen"
        >
          <span class="organization-current-icon"><IconifyIcon :icon="organizations.activeOrganization ? 'mdi:office-building-outline' : 'mdi:filter-variant'" /></span>
          <span class="organization-current-copy">
            <strong>{{ organizations.activeOrganization?.name ?? 'I miei contenuti' }}</strong>
            <small v-if="organizations.activeOrganization">
              {{ organizations.activeOrganization.role === 'owner' ? 'Proprietario' : organizations.activeOrganization.role === 'admin' ? 'Amministratore' : 'Membro' }}
            </small>
            <small v-else>Globali e mie organizzazioni</small>
          </span>
          <IconifyIcon v-if="otherOrganizations.length > 0" icon="mdi:chevron-down" class="organization-chevron" :class="{ open: organizationsOpen }" />
        </button>

        <div v-if="organizationsOpen && otherOrganizations.length > 0" class="organization-list">
          <button
            v-for="organization in otherOrganizations"
            :key="organization.id"
            type="button"
            class="organization-option"
            @click="selectOrganization(organization.id)"
          >
            <span class="organization-option-name">{{ organization.name }}</span>
            <small>
              {{ organization.role === 'owner' ? 'Proprietario' : organization.role === 'admin' ? 'Amministratore' : 'Membro' }}
            </small>
          </button>
        </div>
        <button v-if="organizationsOpen" type="button" class="organization-option" @click="selectGlobalContext">
          <span class="organization-option-name">I miei contenuti</span>
          <small>Globali e mie organizzazioni</small>
        </button>
      </div>
      <p>MENU</p>
      <ul>
        <li v-for="item in navItems" :key="item.to">
          <RouterLink
            :to="item.to"
            class="nav-link"
            :class="{ active: isActive(item.to) }"
            @click="layout.closeSidebar()"
          >
            <span class="nav-icon"><IconifyIcon :icon="item.icon" /></span>
            <span>{{ item.label }}</span>
            <IconifyIcon v-if="isActive(item.to)" icon="mdi:chevron-right" class="nav-arrow" />
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="sidebar-footer">
      <button class="profile-row" type="button" @click="toggleProfileMenu">
        <div class="profile-avatar"><IconifyIcon icon="mdi:account" /></div>
        <div class="profile-copy">
          <span>{{ displayName }}</span>
          <small>{{ auth.isAdmin ? 'Amministratore' : auth.isGuest ? 'Ospite' : 'Giocatore' }}</small>
        </div>
      </button>

      <Menu ref="profileMenu" :model="profileItems" popup />

    </div>
  </aside>
</template>

<style scoped>
.app-sidebar { width: 244px; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: linear-gradient(180deg, var(--color-sidebar-start) 0%, var(--color-sidebar-end) 100%); color: var(--color-white); box-shadow: 10px 0 30px rgb(var(--color-shadow-rgb) / 8%); }
.sidebar-brand { display: flex; align-items: center; gap: 0.75rem; padding: 1.35rem 1.15rem 1.2rem; border-bottom: 1px solid rgb(var(--color-white-rgb) / 9%); }
.sidebar-brand > div { display: grid; }
.sidebar-brand strong { font-size: 1.1rem; line-height: 1; letter-spacing: -0.04em; }
.sidebar-brand small { margin-top: 0.22rem; color: rgb(var(--color-white-rgb) / 55%); font-size: 0.62rem; font-weight: 800; letter-spacing: 0.1em; }
.brand-ball { position: relative; width: 1.7rem; height: 1.7rem; overflow: hidden; flex: 0 0 auto; border-radius: 50%; background: var(--color-accent); box-shadow: 0 5px 15px rgb(var(--color-black-rgb) / 18%); }
.brand-ball::before, .brand-ball::after { position: absolute; width: 1.5rem; height: 2.25rem; border: 1.5px solid rgb(var(--color-primary-rgb) / 65%); border-radius: 50%; content: ''; }
.brand-ball::before { left: -1rem; top: -0.15rem; }
.brand-ball::after { right: -1rem; bottom: -0.15rem; }
.sidebar-nav { flex: 1; overflow-y: auto; padding: 1.15rem 0.75rem; }
.organization-switcher { display: grid; gap: .5rem; margin: 0 0 1.1rem; padding: 0 0 1rem; border-bottom: 1px solid rgb(var(--color-white-rgb) / 9%); }
.organization-header { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
.organization-header > span { color: rgb(var(--color-white-rgb) / 45%); font-size: .58rem; font-weight: 800; letter-spacing: .11em; }
.organization-header a { color: rgb(var(--color-white-rgb) / 58%); font-size: .66rem; text-decoration: none; }
.organization-switcher a:hover { color: var(--color-accent); }
.organization-current { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .65rem; width: 100%; min-height: 3.25rem; padding: .55rem .65rem; border: 0; border-radius: .75rem; background: rgb(var(--color-white-rgb) / 4%); color: var(--color-white); text-align: left; cursor: pointer; transition: background 160ms ease; }
.organization-current:hover { background: rgb(var(--color-white-rgb) / 8%); }
.organization-current:disabled { cursor: default; }
.organization-current-icon { display: grid; place-items: center; width: 1.55rem; height: 1.55rem; color: var(--color-accent); font-size: .72rem; }
.organization-current-icon :deep(svg) { width: 1em; height: 1em; }
.organization-current-copy { display: grid; min-width: 0; gap: .1rem; }
.organization-current-copy strong { overflow: hidden; font-size: .74rem; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
.organization-current-copy small { color: rgb(var(--color-white-rgb) / 55%); font-size: .62rem; }
.organization-chevron { color: rgb(var(--color-white-rgb) / 45%); font-size: .58rem; transition: transform 160ms ease; }
.organization-chevron :deep(svg) { width: 1em; height: 1em; }
.organization-chevron.open { transform: rotate(180deg); }
.organization-list { display: grid; gap: .16rem; margin-left: 2.1rem; padding-top: .1rem; }
.organization-option { display: grid; gap: .08rem; padding: .45rem .55rem; border: 0; border-radius: .6rem; background: transparent; color: rgb(var(--color-white-rgb) / 80%); text-align: left; cursor: pointer; }
.organization-option:hover { background: rgb(var(--color-white-rgb) / 6%); color: var(--color-white); }
.organization-option-name { overflow: hidden; font-size: .72rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.organization-option small { color: rgb(var(--color-white-rgb) / 48%); font-size: .6rem; }
.sidebar-nav > p { margin: 0 0.55rem 0.55rem; color: rgb(var(--color-white-rgb) / 50%); font-size: 0.64rem; font-weight: 800; letter-spacing: 0.12em; }
.sidebar-nav ul { display: flex; flex-direction: column; gap: 0.35rem; margin: 0; padding: 0; list-style: none; }
.nav-link { display: flex; align-items: center; gap: 0.75rem; min-height: 3rem; padding: 0.5rem 0.65rem; border-radius: .75rem; color: rgb(var(--color-white-rgb) / 67%); font-size: 0.82rem; font-weight: 550; text-decoration: none; transition: 160ms ease; }
.nav-link:hover { background: rgb(var(--color-white-rgb) / 6%); color: var(--color-white); }
.nav-link.active { background: rgb(var(--color-accent-rgb) / 15%); color: var(--color-accent-soft); font-weight: 750; }
.nav-icon { display: grid; place-items: center; width: 2rem; height: 2rem; flex: 0 0 auto; border-radius: .6rem; background: rgb(var(--color-white-rgb) / 7%); font-size: 0.85rem; }
.active .nav-icon { background: var(--color-accent); color: var(--color-primary-800); }
.nav-arrow { margin-left: auto; font-size: 0.6rem; }
.nav-arrow :deep(svg) { width: 1em; height: 1em; }
.sidebar-footer { display: flex; flex-direction: column; gap: 0.65rem; padding: 0.9rem 0.75rem; border-top: 1px solid rgb(var(--color-white-rgb) / 9%); background: rgb(var(--color-black-rgb) / 6%); }
.profile-row { display: flex; align-items: center; gap: 0.7rem; min-width: 0; padding: 0.55rem; border: 0; border-radius: .75rem; background: transparent; text-align: left; cursor: pointer; transition: background 160ms ease; }
.profile-row:hover { background: rgb(var(--color-white-rgb) / 6%); }
.profile-row:hover .profile-copy span { color: var(--color-accent-soft); }
.profile-avatar { display: grid; place-items: center; width: 2rem; height: 2rem; flex: 0 0 auto; border: 1px solid rgb(var(--color-accent-rgb) / 28%); border-radius: var(--p-content-border-radius); background: rgb(var(--color-accent-rgb) / 12%); color: var(--color-accent); font-size: 0.72rem; }
.profile-avatar :deep(svg) { width: 1em; height: 1em; }
.profile-copy { display: grid; min-width: 0; }
.profile-copy span { overflow: hidden; color: rgb(var(--color-white-rgb) / 88%); font-size: 0.8rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.profile-copy small { margin-top: 0.12rem; color: rgb(var(--color-white-rgb) / 55%); font-size: 0.68rem; }
</style>
