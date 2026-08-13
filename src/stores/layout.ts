import { defineStore } from 'pinia'
import { ref } from 'vue'

interface TopbarContext {
  title: string
  backTo?: string
  backLabel?: string
}

export const useLayoutStore = defineStore('layout', () => {
  const sidebarOpen = ref(false)
  const searchOpen = ref(false)
  const topbarContext = ref<TopbarContext | null>(null)

  function toggleSidebar(): void {
    sidebarOpen.value = !sidebarOpen.value
  }

  function closeSidebar(): void {
    sidebarOpen.value = false
  }

  function openSidebar(): void {
    sidebarOpen.value = true
  }

  function openSearch(): void {
    searchOpen.value = true
  }

  function closeSearch(): void {
    searchOpen.value = false
  }

  function setTopbarContext(context: TopbarContext): void {
    topbarContext.value = context
  }

  function clearTopbarContext(): void {
    topbarContext.value = null
  }

  return {
    sidebarOpen,
    searchOpen,
    topbarContext,
    toggleSidebar,
    openSidebar,
    closeSidebar,
    openSearch,
    closeSearch,
    setTopbarContext,
    clearTopbarContext,
  }
})
