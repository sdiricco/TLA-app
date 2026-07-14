<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Menu from 'primevue/menu'
import { useAuthStore } from '../../stores/auth'
import { useOrganizationsStore } from '../../stores/organizations'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const organizations = useOrganizationsStore()
const accountMenu = ref()
const title = computed(() => {
  if (route.path.startsWith('/players')) return 'Giocatori'
  if (route.path.startsWith('/profile')) return 'Profilo'
  if (route.path.startsWith('/admin')) return 'Admin'
  if (route.path.includes('/matches/')) return 'Partita'
  return 'Tornei'
})

const displayName = computed(() => auth.user?.name || auth.user?.email || 'Profilo')
const email = computed(() => auth.user?.email ?? '')
const accountInitials = computed(() => {
  const source = auth.user?.name?.trim() || auth.user?.email?.trim() || 'TLA'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return `${parts[0]?.[0] ?? ''}${parts[1]?.[0] ?? ''}`.toUpperCase()
  return source.slice(0, 2).toUpperCase()
})

const activeOrganizationName = computed(() => organizations.activeOrganization?.name ?? 'Organizzazione')

const accountItems = computed(() => [
  ...(!organizations.activeOrganization || auth.isGuest
    ? []
    : [{
        label: 'Profilo',
        icon: 'mdi:account-outline',
        command: () => {
          void router.push({ name: 'profile' })
        },
      }]),
  {
    label: 'Organizzazioni',
    icon: 'mdi:domain',
    command: () => {
      void router.push({ name: 'organizations' })
    },
  },
  {
    label: 'Esci',
    icon: 'mdi:logout',
    command: async () => {
      await auth.logout()
      await router.push('/login')
    },
  },
])

function toggleAccountMenu(event: Event): void {
  accountMenu.value?.toggle(event)
}
</script>

<template>
  <header class="mobile-topbar hidden max-md:flex items-center gap-3 px-3 h-14 sticky top-0 z-10">
    <div class="topbar-copy">
      <span class="topbar-title">{{ title }}</span>
      <span class="topbar-organization">{{ activeOrganizationName }}</span>
    </div>
    <div class="topbar-actions">
      <button class="account-trigger" type="button" aria-label="Apri menu account" @click="toggleAccountMenu">
        <span>{{ accountInitials }}</span>
      </button>
    </div>

    <Menu ref="accountMenu" :model="accountItems" popup class="topbar-popup-menu account-popup">
      <template #start>
        <div class="account-menu-header">
          <div class="account-menu-avatar">{{ accountInitials }}</div>
          <div class="account-menu-copy">
            <strong>{{ displayName }}</strong>
            <small>{{ email || 'Account TLA' }}</small>
          </div>
        </div>
      </template>
    </Menu>
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
.topbar-actions { display: flex; align-items: center; gap: 0.1rem; margin-left: auto; }
.account-trigger { display: grid; place-items: center; width: 2.2rem; height: 2.2rem; padding: 0; border: 1px solid rgb(var(--color-primary-rgb) / 22%); border-radius: 0; background: var(--color-surface-card); color: var(--color-primary-700); font-size: 0.75rem; font-weight: 800; cursor: pointer; }
.account-trigger:hover { background: var(--color-surface-soft); }
.topbar-popup-menu :deep(.p-menu) { min-width: 15rem; border: 1px solid var(--color-border); border-radius: 0; background: var(--color-surface-card); box-shadow: 0 16px 34px rgb(var(--color-shadow-rgb) / 12%); }
.topbar-popup-menu :deep(.p-menu-list) { padding: 0.35rem 0; }
.topbar-popup-menu :deep(.p-menu-item-link) { gap: 0.75rem; padding: 0.8rem 0.95rem; }
.topbar-popup-menu :deep(.p-menu-item-icon) { color: var(--color-text-muted); }
.topbar-popup-menu :deep(.p-menu-item-label) { font-weight: 500; }
.account-popup :deep(.p-menu-start) { padding: 0.55rem; border-bottom: 1px solid var(--color-border); }
.account-menu-header { display: flex; align-items: center; gap: 0.8rem; padding: 0.8rem; background: var(--color-surface-soft); }
.account-menu-avatar { display: grid; place-items: center; width: 3rem; height: 3rem; flex: 0 0 auto; border-radius: 0; background: var(--color-primary-700); color: var(--color-white); font-size: 1.15rem; font-weight: 800; }
.account-menu-copy { display: grid; min-width: 0; gap: 0.16rem; }
.account-menu-copy strong { overflow: hidden; font-size: 0.95rem; text-overflow: ellipsis; white-space: nowrap; }
.account-menu-copy small { overflow: hidden; color: var(--color-text-muted); font-size: 0.78rem; text-overflow: ellipsis; white-space: nowrap; }
</style>
