<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useAuthStore } from '../../stores/auth'
import { useLayoutStore } from '../../stores/layout'

const router = useRouter()
const auth = useAuthStore()
const layout = useLayoutStore()

async function handleLogout(): Promise<void> {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <header class="hidden max-md:flex items-center gap-1 px-1 h-14 bg-surface-0 border-b border-surface-200 sticky top-0 z-10">
    <Button
      icon="pi pi-bars"
      text
      rounded
      aria-label="Apri menu"
      @click="layout.toggleSidebar()"
    />

    <div class="flex items-center gap-2 font-bold text-base text-color">
      <i class="pi pi-circle-fill text-primary-500" />
      <span>TLA App</span>
    </div>

    <div class="flex-1" />

    <Button
      icon="pi pi-sign-out"
      text
      rounded
      severity="secondary"
      aria-label="Esci"
      @click="handleLogout"
    />
  </header>
</template>
