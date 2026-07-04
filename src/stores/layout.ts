import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLayoutStore = defineStore('layout', () => {
  const sidebarOpen = ref(false)

  function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value
  }

  function closeSidebar(): void {
    sidebarOpen.value = false
  }

  function openSidebar(): void {
    sidebarOpen.value = true
  }

  return { sidebarOpen, toggleSidebar, openSidebar, closeSidebar }
})
