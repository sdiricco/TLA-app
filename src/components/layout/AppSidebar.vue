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
const profileMenu = ref()

function isActive(to: string): boolean {
  if (to === '/') return route.path === to
  return route.path.startsWith(to)
}

const navItems = [
  { label: 'Dashboard', icon: 'mdi:view-dashboard-outline', to: '/dashboard' },
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

const displayName = computed(() => auth.user?.name?.trim() || 'Account TLA')
const accountContext = computed(() => {
  if (auth.isGuest) return 'Ospite'
  if (organizations.activeOrganization?.role === 'owner') return 'Proprietario del club'
  if (organizations.activeOrganization?.role === 'admin') return 'Amministratore del club'
  if (organizations.activeOrganization) return 'Membro del club'
  return auth.user?.role === 'admin' ? 'Amministratore piattaforma' : 'Account personale'
})
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
          <small>{{ accountContext }}</small>
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
