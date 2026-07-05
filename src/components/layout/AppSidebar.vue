<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useAuthStore } from '../../stores/auth'
import { useLayoutStore } from '../../stores/layout'
import { useThemeStore, type CourtTheme } from '../../stores/theme'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const layout = useLayoutStore()
const theme = useThemeStore()

const courtThemes: { value: CourtTheme; label: string }[] = [
  { value: 'grass', label: 'Erba' },
  { value: 'hard', label: 'Cemento' },
  { value: 'clay', label: 'Terra rossa' },
]

function isActive(to: string): boolean {
  if (to === '/') return route.path === to
  return route.path.startsWith(to)
}

const navItems = computed(() => {
  if (auth.isAdmin) {
    return [
      { label: 'Tornei', icon: 'pi pi-trophy', to: '/tournaments' },
      { label: 'Giocatori', icon: 'pi pi-users', to: '/players' },
      { label: 'Admin', icon: 'pi pi-sliders-h', to: '/admin/feature-flags' },
    ]
  }
  return [
    { label: 'Tornei', icon: 'pi pi-trophy', to: '/tournaments' },
  ]
})

const displayName = computed(() => auth.user?.name || auth.user?.email || 'Utente')

async function handleLogout(): Promise<void> {
  await auth.logout()
  await router.push('/login')
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
            <span class="nav-icon"><i :class="item.icon" /></span>
            <span>{{ item.label }}</span>
            <i v-if="isActive(item.to)" class="pi pi-chevron-right nav-arrow" />
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="sidebar-footer">
      <div class="theme-picker">
        <span>SUPERFICIE</span>
        <div class="theme-options" role="radiogroup" aria-label="Tema superficie">
          <button
            v-for="item in courtThemes"
            :key="item.value"
            type="button"
            :title="item.label"
            :aria-label="item.label"
            :aria-checked="theme.courtTheme === item.value"
            :class="{ active: theme.courtTheme === item.value }"
            role="radio"
            @click="theme.applyTheme(item.value)"
          >
            <i :class="`theme-swatch-${item.value}`" />
          </button>
        </div>
      </div>

      <div class="profile-row">
        <div class="profile-avatar"><i class="pi pi-user" /></div>
        <div class="profile-copy">
          <span>{{ displayName }}</span>
          <small>{{ auth.isAdmin ? 'Amministratore' : auth.isGuest ? 'Ospite' : 'Giocatore' }}</small>
        </div>
      </div>

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
.app-sidebar { width: 260px; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: linear-gradient(180deg, var(--color-sidebar-start) 0%, var(--color-sidebar-end) 100%); color: var(--color-white); box-shadow: 10px 0 30px rgb(var(--color-shadow-rgb) / 8%); }
.sidebar-brand { display: flex; align-items: center; gap: 0.75rem; padding: 1.6rem 1.35rem 1.4rem; border-bottom: 1px solid rgb(var(--color-white-rgb) / 9%); }
.sidebar-brand > div { display: grid; }
.sidebar-brand strong { font-size: 1.25rem; line-height: 1; letter-spacing: -0.04em; }
.sidebar-brand small { margin-top: 0.3rem; color: rgb(var(--color-white-rgb) / 55%); font-size: 0.7rem; font-weight: 800; letter-spacing: 0.1em; }
.brand-ball { position: relative; width: 2rem; height: 2rem; overflow: hidden; flex: 0 0 auto; border-radius: 50%; background: var(--color-accent); box-shadow: 0 5px 15px rgb(var(--color-black-rgb) / 18%); }
.brand-ball::before, .brand-ball::after { position: absolute; width: 1.5rem; height: 2.25rem; border: 1.5px solid rgb(var(--color-primary-rgb) / 65%); border-radius: 50%; content: ''; }
.brand-ball::before { left: -1rem; top: -0.15rem; }
.brand-ball::after { right: -1rem; bottom: -0.15rem; }
.sidebar-nav { flex: 1; overflow-y: auto; padding: 1.4rem 0.85rem; }
.sidebar-nav > p { margin: 0 0.7rem 0.65rem; color: rgb(var(--color-white-rgb) / 50%); font-size: 0.7rem; font-weight: 800; letter-spacing: 0.12em; }
.sidebar-nav ul { display: flex; flex-direction: column; gap: 0.35rem; margin: 0; padding: 0; list-style: none; }
.nav-link { display: flex; align-items: center; gap: 0.8rem; min-height: 3rem; padding: 0.45rem 0.7rem; border-radius: 11px; color: rgb(var(--color-white-rgb) / 67%); font-size: 0.86rem; font-weight: 550; text-decoration: none; transition: 160ms ease; }
.nav-link:hover { background: rgb(var(--color-white-rgb) / 6%); color: var(--color-white); }
.nav-link.active { background: rgb(var(--color-accent-rgb) / 13%); color: var(--color-accent-soft); font-weight: 750; }
.nav-icon { display: grid; place-items: center; width: 2rem; height: 2rem; flex: 0 0 auto; border-radius: 8px; background: rgb(var(--color-white-rgb) / 7%); font-size: 0.88rem; }
.active .nav-icon { background: var(--color-accent); color: var(--color-primary-800); }
.nav-arrow { margin-left: auto; font-size: 0.6rem; }
.sidebar-footer { display: flex; flex-direction: column; gap: 0.8rem; padding: 1rem; border-top: 1px solid rgb(var(--color-white-rgb) / 9%); background: rgb(var(--color-black-rgb) / 6%); }
.theme-picker { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
.theme-picker > span { color: rgb(var(--color-white-rgb) / 50%); font-size: 0.65rem; font-weight: 800; letter-spacing: 0.1em; }
.theme-options { display: flex; gap: 0.35rem; }
.theme-options button { display: grid; width: 1.75rem; height: 1.75rem; place-items: center; padding: 0; border: 1px solid transparent; background: transparent; cursor: pointer; }
.theme-options button.active { border-color: rgb(var(--color-white-rgb) / 70%); }
.theme-options i { display: block; width: 0.9rem; height: 0.9rem; }
.theme-swatch-grass { background: var(--color-theme-grass); }
.theme-swatch-hard { background: var(--color-theme-hard); }
.theme-swatch-clay { background: var(--color-theme-clay); }
.profile-row { display: flex; align-items: center; gap: 0.7rem; min-width: 0; }
.profile-avatar { display: grid; place-items: center; width: 2.35rem; height: 2.35rem; flex: 0 0 auto; border: 1px solid rgb(var(--color-accent-rgb) / 28%); border-radius: 50%; background: rgb(var(--color-accent-rgb) / 12%); color: var(--color-accent); font-size: 0.8rem; }
.profile-copy { display: grid; min-width: 0; }
.profile-copy span { overflow: hidden; color: rgb(var(--color-white-rgb) / 88%); font-size: 0.875rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.profile-copy small { margin-top: 0.15rem; color: rgb(var(--color-white-rgb) / 55%); font-size: 0.75rem; }
.logout-button { justify-content: flex-start; height: 2.75rem; color: rgb(var(--color-white-rgb) / 65%); font-size: 0.8125rem; }
.logout-button:hover { background: rgb(var(--color-white-rgb) / 6%) !important; color: var(--color-white) !important; }
</style>
