<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useAuthStore } from '../../stores/auth'
import { useLayoutStore } from '../../stores/layout'
import { useOrganizationsStore } from '../../stores/organizations'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const layout = useLayoutStore()
const organizations = useOrganizationsStore()
const organizationsOpen = ref(false)

function isActive(to: string): boolean {
  if (to === '/') return route.path === to
  return route.path.startsWith(to)
}

const navItems = computed(() => {
  if (auth.isGuest) {
    return [
      { label: 'Organizzazioni', icon: 'mdi:domain', to: '/organizations' },
      { label: 'Tornei', icon: 'mdi:trophy-outline', to: '/tournaments' },
      { label: 'Giocatori', icon: 'mdi:account-group-outline', to: '/players' },
    ]
  }

  if (auth.isAdmin) {
    return [
      { label: 'Tornei', icon: 'mdi:trophy-outline', to: '/tournaments' },
      { label: 'Giocatori', icon: 'mdi:account-group-outline', to: '/players' },
      { label: 'Profilo', icon: 'mdi:account-outline', to: '/profile' },
    ]
  }
  return [
    { label: 'Tornei', icon: 'mdi:trophy-outline', to: '/tournaments' },
    { label: 'Profilo', icon: 'mdi:account-outline', to: '/profile' },
  ]
})

function selectOrganization(id: string): void {
  organizations.select(id)
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

function openProfile(): void {
  if (auth.isGuest) return
  void router.push({ name: 'profile' })
  layout.closeSidebar()
}
</script>

<template>
  <aside class="app-sidebar">
    <div class="sidebar-brand">
      <span class="brand-ball" />
      <div><strong>TLA</strong><small>LEAGUE ADMIN</small></div>
    </div>

    <nav class="sidebar-nav">
      <div v-if="organizations.activeOrganization" class="organization-switcher">
        <div class="organization-header">
          <span>ORGANIZZAZIONE</span>
          <RouterLink to="/organizations" @click="layout.closeSidebar()">Gestisci</RouterLink>
        </div>

        <button
          class="organization-current"
          type="button"
          :aria-expanded="organizationsOpen"
          :disabled="otherOrganizations.length === 0"
          @click="organizationsOpen = !organizationsOpen"
        >
          <span class="organization-current-icon"><IconifyIcon icon="mdi:office-building-outline" /></span>
          <span class="organization-current-copy">
            <strong>{{ organizations.activeOrganization.name }}</strong>
            <small>
              {{ organizations.activeOrganization.role === 'owner' ? 'Proprietario' : organizations.activeOrganization.role === 'admin' ? 'Amministratore' : 'Membro' }}
            </small>
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
      <button class="profile-row" type="button" :disabled="auth.isGuest" @click="openProfile">
        <div class="profile-avatar"><IconifyIcon icon="mdi:account" /></div>
        <div class="profile-copy">
          <span>{{ displayName }}</span>
          <small>{{ auth.isAdmin ? 'Amministratore' : auth.isGuest ? 'Ospite' : 'Giocatore' }}</small>
        </div>
      </button>

      <Button
        class="logout-button"
        label="Esci dall’account"
        icon="pi pi-sign-out"
        text
        size="small"
        fluid
        @click="handleLogout"
      />
    </div>
  </aside>
</template>

<style scoped>
.app-sidebar { width: 244px; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: linear-gradient(180deg, var(--color-sidebar-start) 0%, var(--color-sidebar-end) 100%); color: var(--color-white); box-shadow: 10px 0 30px rgb(var(--color-shadow-rgb) / 8%); }
.sidebar-brand { display: flex; align-items: center; gap: 0.65rem; padding: 1.2rem 1rem 1.05rem; border-bottom: 1px solid rgb(var(--color-white-rgb) / 9%); }
.sidebar-brand > div { display: grid; }
.sidebar-brand strong { font-size: 1.1rem; line-height: 1; letter-spacing: -0.04em; }
.sidebar-brand small { margin-top: 0.22rem; color: rgb(var(--color-white-rgb) / 55%); font-size: 0.62rem; font-weight: 800; letter-spacing: 0.1em; }
.brand-ball { position: relative; width: 1.7rem; height: 1.7rem; overflow: hidden; flex: 0 0 auto; border-radius: 50%; background: var(--color-accent); box-shadow: 0 5px 15px rgb(var(--color-black-rgb) / 18%); }
.brand-ball::before, .brand-ball::after { position: absolute; width: 1.5rem; height: 2.25rem; border: 1.5px solid rgb(var(--color-primary-rgb) / 65%); border-radius: 50%; content: ''; }
.brand-ball::before { left: -1rem; top: -0.15rem; }
.brand-ball::after { right: -1rem; bottom: -0.15rem; }
.sidebar-nav { flex: 1; overflow-y: auto; padding: 1rem 0.65rem; }
.organization-switcher { display: grid; gap: .4rem; margin: 0 .15rem .9rem; padding: 0 0 .8rem; border-bottom: 1px solid rgb(var(--color-white-rgb) / 9%); }
.organization-header { display: flex; align-items: center; justify-content: space-between; gap: .5rem; }
.organization-header > span { color: rgb(var(--color-white-rgb) / 45%); font-size: .58rem; font-weight: 800; letter-spacing: .11em; }
.organization-header a { color: rgb(var(--color-white-rgb) / 58%); font-size: .66rem; text-decoration: none; }
.organization-switcher a:hover { color: var(--color-accent); }
.organization-current { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .55rem; width: 100%; padding: .35rem 0; border: 0; background: transparent; color: var(--color-white); text-align: left; cursor: pointer; }
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
.organization-option { display: grid; gap: .08rem; padding: .28rem 0; border: 0; background: transparent; color: rgb(var(--color-white-rgb) / 80%); text-align: left; cursor: pointer; }
.organization-option:hover { color: var(--color-white); }
.organization-option-name { overflow: hidden; font-size: .72rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.organization-option small { color: rgb(var(--color-white-rgb) / 48%); font-size: .6rem; }
.sidebar-nav > p { margin: 0 0.5rem 0.45rem; color: rgb(var(--color-white-rgb) / 50%); font-size: 0.64rem; font-weight: 800; letter-spacing: 0.12em; }
.sidebar-nav ul { display: flex; flex-direction: column; gap: 0.2rem; margin: 0; padding: 0; list-style: none; }
.nav-link { display: flex; align-items: center; gap: 0.65rem; min-height: 2.6rem; padding: 0.35rem 0.55rem; border-radius: 0; color: rgb(var(--color-white-rgb) / 67%); font-size: 0.8rem; font-weight: 550; text-decoration: none; transition: 160ms ease; }
.nav-link:hover { background: rgb(var(--color-white-rgb) / 6%); color: var(--color-white); }
.nav-link.active { background: rgb(var(--color-accent-rgb) / 13%); color: var(--color-accent-soft); font-weight: 750; }
.nav-icon { display: grid; place-items: center; width: 1.8rem; height: 1.8rem; flex: 0 0 auto; border-radius: 0; background: rgb(var(--color-white-rgb) / 7%); font-size: 0.8rem; }
.active .nav-icon { background: var(--color-accent); color: var(--color-primary-800); }
.nav-arrow { margin-left: auto; font-size: 0.6rem; }
.nav-arrow :deep(svg) { width: 1em; height: 1em; }
.sidebar-footer { display: flex; flex-direction: column; gap: 0.65rem; padding: 0.85rem; border-top: 1px solid rgb(var(--color-white-rgb) / 9%); background: rgb(var(--color-black-rgb) / 6%); }
.profile-row { display: flex; align-items: center; gap: 0.6rem; min-width: 0; padding: 0; border: 0; background: transparent; text-align: left; cursor: pointer; }
.profile-row:hover .profile-copy span { color: var(--color-accent-soft); }
.profile-avatar { display: grid; place-items: center; width: 2rem; height: 2rem; flex: 0 0 auto; border: 1px solid rgb(var(--color-accent-rgb) / 28%); border-radius: 0; background: rgb(var(--color-accent-rgb) / 12%); color: var(--color-accent); font-size: 0.72rem; }
.profile-avatar :deep(svg) { width: 1em; height: 1em; }
.profile-copy { display: grid; min-width: 0; }
.profile-copy span { overflow: hidden; color: rgb(var(--color-white-rgb) / 88%); font-size: 0.8rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.profile-copy small { margin-top: 0.12rem; color: rgb(var(--color-white-rgb) / 55%); font-size: 0.68rem; }
.logout-button { justify-content: flex-start; height: 2.35rem; color: rgb(var(--color-white-rgb) / 65%); font-size: 0.76rem; }
.logout-button:hover { background: rgb(var(--color-white-rgb) / 6%) !important; color: var(--color-white) !important; }
</style>
