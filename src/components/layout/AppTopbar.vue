<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import Button from 'primevue/button'
import { useLayoutStore } from '../../stores/layout'

const route = useRoute()
const layout = useLayoutStore()
const title = computed(() => {
  if (route.path.startsWith('/players')) return 'Giocatori'
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
      <span class="mobile-ball" />
      <span>TLA</span>
    </div>
    <span class="topbar-title">{{ title }}</span>
  </header>
</template>

<style scoped>
.mobile-topbar { border-bottom: 1px solid rgb(255 255 255 / 10%); background: #064e3b; color: white; box-shadow: 0 5px 18px rgb(15 50 38 / 15%); }
.mobile-topbar :deep(.p-button) { color: rgb(255 255 255 / 82%); }
.menu-button { width: 2.75rem; min-width: 2.75rem; margin-left: -0.6rem; }
.mobile-ball { width: 1.15rem; height: 1.15rem; border-radius: 50%; background: #b7f34a; }
.topbar-title { margin-left: auto; color: rgb(255 255 255 / 75%); font-size: 0.75rem; font-weight: 750; letter-spacing: 0.07em; text-transform: uppercase; }
</style>
