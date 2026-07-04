<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useAuthStore } from '../../stores/auth'
import { useLayoutStore } from '../../stores/layout'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const layout = useLayoutStore()

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
.app-sidebar { width: 260px; height: 100%; display: flex; flex-direction: column; overflow: hidden; background: linear-gradient(180deg, #063b30 0%, #075b46 100%); color: white; box-shadow: 10px 0 30px rgb(15 50 38 / 8%); }
.sidebar-brand { display: flex; align-items: center; gap: 0.75rem; padding: 1.6rem 1.35rem 1.4rem; border-bottom: 1px solid rgb(255 255 255 / 9%); }
.sidebar-brand > div { display: grid; }
.sidebar-brand strong { font-size: 1.25rem; line-height: 1; letter-spacing: -0.04em; }
.sidebar-brand small { margin-top: 0.3rem; color: rgb(255 255 255 / 55%); font-size: 0.7rem; font-weight: 800; letter-spacing: 0.1em; }
.brand-ball { position: relative; width: 2rem; height: 2rem; overflow: hidden; flex: 0 0 auto; border-radius: 50%; background: #b7f34a; box-shadow: 0 5px 15px rgb(0 0 0 / 18%); }
.brand-ball::before, .brand-ball::after { position: absolute; width: 1.5rem; height: 2.25rem; border: 1.5px solid rgb(5 94 70 / 65%); border-radius: 50%; content: ''; }
.brand-ball::before { left: -1rem; top: -0.15rem; }
.brand-ball::after { right: -1rem; bottom: -0.15rem; }
.sidebar-nav { flex: 1; overflow-y: auto; padding: 1.4rem 0.85rem; }
.sidebar-nav > p { margin: 0 0.7rem 0.65rem; color: rgb(255 255 255 / 50%); font-size: 0.7rem; font-weight: 800; letter-spacing: 0.12em; }
.sidebar-nav ul { display: flex; flex-direction: column; gap: 0.35rem; margin: 0; padding: 0; list-style: none; }
.nav-link { display: flex; align-items: center; gap: 0.8rem; min-height: 3rem; padding: 0.45rem 0.7rem; border-radius: 11px; color: rgb(255 255 255 / 67%); font-size: 0.86rem; font-weight: 550; text-decoration: none; transition: 160ms ease; }
.nav-link:hover { background: rgb(255 255 255 / 6%); color: white; }
.nav-link.active { background: rgb(183 243 74 / 13%); color: #d9ff7a; font-weight: 750; }
.nav-icon { display: grid; place-items: center; width: 2rem; height: 2rem; flex: 0 0 auto; border-radius: 8px; background: rgb(255 255 255 / 7%); font-size: 0.88rem; }
.active .nav-icon { background: #b7f34a; color: #075b46; }
.nav-arrow { margin-left: auto; font-size: 0.6rem; }
.sidebar-footer { display: flex; flex-direction: column; gap: 0.8rem; padding: 1rem; border-top: 1px solid rgb(255 255 255 / 9%); background: rgb(0 0 0 / 6%); }
.profile-row { display: flex; align-items: center; gap: 0.7rem; min-width: 0; }
.profile-avatar { display: grid; place-items: center; width: 2.35rem; height: 2.35rem; flex: 0 0 auto; border: 1px solid rgb(183 243 74 / 28%); border-radius: 50%; background: rgb(183 243 74 / 12%); color: #cfff76; font-size: 0.8rem; }
.profile-copy { display: grid; min-width: 0; }
.profile-copy span { overflow: hidden; color: rgb(255 255 255 / 88%); font-size: 0.875rem; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.profile-copy small { margin-top: 0.15rem; color: rgb(255 255 255 / 55%); font-size: 0.75rem; }
.logout-button { justify-content: flex-start; height: 2.75rem; color: rgb(255 255 255 / 65%); font-size: 0.8125rem; }
.logout-button:hover { background: rgb(255 255 255 / 6%) !important; color: white !important; }
</style>
