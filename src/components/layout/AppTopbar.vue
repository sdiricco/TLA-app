<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import { useLayoutStore } from '../../stores/layout'

const route = useRoute()
const layout = useLayoutStore()
const title = computed(() => {
  if (route.path.startsWith('/players')) return 'Giocatori'
  if (route.path.startsWith('/profile')) return 'Profilo'
  if (route.path.startsWith('/admin')) return 'Admin'
  if (route.path.includes('/matches/')) return 'Partita'
  return 'Tornei'
})
</script>

<template>
  <header class="mobile-topbar hidden max-md:flex items-center gap-3 px-4 h-14 sticky top-0 z-10">
    <Button
      class="menu-button"
      icon="pi pi-bars"
      text
      rounded
      aria-label="Apri menu"
      :aria-expanded="layout.sidebarOpen"
      @click="layout.toggleSidebar()"
    />
    <div class="flex items-center gap-2 font-bold text-base">
      <span class="brand-ball" />
      <span>TLA</span>
    </div>
    <span class="topbar-title">{{ title }}</span>
  </header>
</template>

<style scoped>
.mobile-topbar { border-bottom: 1px solid rgb(var(--color-white-rgb) / 10%); background: var(--color-primary-900); color: var(--color-white); box-shadow: 0 5px 18px rgb(var(--color-shadow-rgb) / 15%); }
.mobile-topbar :deep(.p-button) { color: rgb(var(--color-white-rgb) / 82%); }
.mobile-topbar :deep(.menu-button.p-button:hover),
.mobile-topbar :deep(.menu-button.p-button:focus-visible),
.mobile-topbar :deep(.menu-button.p-button[aria-expanded="true"]) { background: rgb(var(--color-white-rgb) / 12%); color: var(--color-accent); }
.mobile-topbar :deep(.menu-button .p-button-icon) { color: inherit; }
.menu-button { width: 2.75rem; min-width: 2.75rem; margin-left: -0.6rem; }
.brand-ball { position: relative; width: 1.15rem; height: 1.15rem; overflow: hidden; flex: 0 0 auto; border-radius: 50%; background: var(--color-accent); box-shadow: 0 3px 10px rgb(var(--color-black-rgb) / 18%); }
.brand-ball::before, .brand-ball::after { position: absolute; width: 0.85rem; height: 1.35rem; border: 1.25px solid rgb(var(--color-primary-rgb) / 65%); border-radius: 50%; content: ''; }
.brand-ball::before { left: -0.58rem; top: -0.08rem; }
.brand-ball::after { right: -0.58rem; bottom: -0.08rem; }
.topbar-title { margin-left: auto; color: rgb(var(--color-white-rgb) / 75%); font-size: 0.75rem; font-weight: 750; letter-spacing: 0.07em; text-transform: uppercase; }
</style>
