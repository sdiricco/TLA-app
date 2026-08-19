<script setup lang="ts">
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import AppBottomNav from '../components/layout/AppBottomNav.vue'
import AppSidebar from '../components/layout/AppSidebar.vue'
import AppTopbar from '../components/layout/AppTopbar.vue'
import GlobalSearchDialog from '../components/layout/GlobalSearchDialog.vue'
import { useLayoutStore } from '../stores/layout'

const layout = useLayoutStore()
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <div class="flex flex-1 overflow-hidden relative">
      <div class="shrink-0 h-full max-md:hidden">
        <AppSidebar />
      </div>

      <div class="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AppTopbar />

        <main class="app-content flex-1 overflow-y-auto">
          <RouterView />
        </main>
      </div>
    </div>

    <AppBottomNav />

    <GlobalSearchDialog v-model:visible="layout.searchOpen" />

    <Toast position="bottom-right" />
    <ConfirmDialog />
  </div>
</template>

<style scoped>
.app-content { padding: var(--app-page-padding); background: var(--app-content-background); }
@media (max-width: 767px) { .app-content { padding-bottom: 0.85rem; } }
</style>
