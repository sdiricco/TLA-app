<script setup lang="ts">
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import AppBottomNav from '../components/layout/AppBottomNav.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import AppTopbar from '../components/layout/AppTopbar.vue'
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <AppTopbar />

    <div class="flex flex-1 overflow-hidden relative">
      <div class="shrink-0 h-full max-md:hidden">
        <AppSidebar />
      </div>

      <main class="app-content flex-1 overflow-y-auto">
        <RouterView />
      </main>
    </div>

    <AppBottomNav />

    <Toast position="bottom-right" />
    <ConfirmDialog />
  </div>
</template>

<style scoped>
.app-content { padding: var(--app-page-padding); background: radial-gradient(circle at 100% 0, rgb(var(--color-primary-500-rgb) / 5%), transparent 30rem), var(--color-surface-ground); }
@media (max-width: 767px) { .app-content { padding-bottom: 0.85rem; } }
</style>
