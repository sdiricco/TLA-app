<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useLayoutStore } from '../../stores/layout'

const route = useRoute()
const auth = useAuthStore()
const layout = useLayoutStore()

const items = computed(() => auth.isAdmin
  ? [
      { label: 'Tornei', icon: 'pi pi-trophy', to: '/tournaments' },
      { label: 'Giocatori', icon: 'pi pi-users', to: '/players' },
      { label: 'Admin', icon: 'pi pi-sliders-h', to: '/admin/feature-flags' },
    ]
  : [{ label: 'Tornei', icon: 'pi pi-trophy', to: '/tournaments' }])

function active(to: string): boolean {
  return route.path.startsWith(to)
}
</script>

<template>
  <nav class="bottom-nav md:hidden" aria-label="Navigazione principale">
    <RouterLink v-for="item in items" :key="item.to" :to="item.to" :class="{ active: active(item.to) }">
      <i :class="item.icon" />
      <span>{{ item.label }}</span>
    </RouterLink>
    <button type="button" aria-label="Apri profilo e menu" :aria-expanded="layout.sidebarOpen" @click="layout.toggleSidebar()">
      <i class="pi pi-user" />
      <span>Profilo</span>
    </button>
  </nav>
</template>

<style scoped>
.bottom-nav { position: fixed; z-index: 90; right: 0; bottom: 0; left: 0; min-height: 4.25rem; padding: 0.4rem 0.5rem max(0.4rem, env(safe-area-inset-bottom)); border-top: 1px solid #dfe7e3; background: rgb(255 255 255 / 96%); box-shadow: 0 -8px 24px rgb(20 54 41 / 8%); backdrop-filter: blur(16px); }
.bottom-nav { display: flex; align-items: stretch; justify-content: space-around; }
.bottom-nav a, .bottom-nav button { display: flex; min-width: 3.8rem; flex: 1; flex-direction: column; align-items: center; justify-content: center; gap: 0.2rem; border: 0; border-radius: 10px; background: transparent; color: #6b7872; font-size: 0.75rem; font-weight: 650; text-decoration: none; }
.bottom-nav i { font-size: 1rem; }
.bottom-nav .active { background: #ecfdf5; color: var(--app-green); font-weight: 800; }
</style>
