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
  <header class="mobile-topbar hidden max-md:flex items-center gap-1 px-1 h-14 sticky top-0 z-10">
    <Button
      icon="pi pi-bars"
      text
      rounded
      aria-label="Apri menu"
      @click="layout.toggleSidebar()"
    />

    <div class="flex items-center gap-2 font-bold text-base">
      <span class="mobile-ball" />
      <span>TLA</span>
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

<style scoped>
.mobile-topbar { border-bottom: 1px solid rgb(255 255 255 / 10%); background: #064e3b; color: white; box-shadow: 0 5px 18px rgb(15 50 38 / 15%); }
.mobile-topbar :deep(.p-button) { color: rgb(255 255 255 / 82%); }
.mobile-ball { width: 1.15rem; height: 1.15rem; border-radius: 50%; background: #b7f34a; }
</style>
