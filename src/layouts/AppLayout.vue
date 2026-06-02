<script setup lang="ts">
import ConfirmDialog from 'primevue/confirmdialog'
import Toast from 'primevue/toast'
import AppSidebar from '../components/layout/AppSidebar.vue'
import AppTopbar from '../components/layout/AppTopbar.vue'
import { useLayoutStore } from '../stores/layout'

const layout = useLayoutStore()
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <AppTopbar />

    <div class="flex flex-1 overflow-hidden relative">
      <Transition name="fade">
        <div
          v-if="layout.sidebarOpen"
          class="fixed inset-0 top-14 bg-black/40 z-[99] md:hidden"
          @click="layout.closeSidebar()"
        />
      </Transition>

      <div
        class="shrink-0 h-full max-md:fixed max-md:top-14 max-md:left-0 max-md:bottom-0 max-md:z-[100] max-md:transition-transform max-md:duration-[250ms] max-md:ease-in-out"
        :class="{ 'max-md:translate-x-0': layout.sidebarOpen, 'max-md:-translate-x-full': !layout.sidebarOpen }"
      >
        <AppSidebar />
      </div>

      <main class="flex-1 overflow-y-auto p-6 bg-surface-50">
        <RouterView />
      </main>
    </div>

    <Toast position="bottom-right" />
    <ConfirmDialog />
  </div>
</template>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
