<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import { useAuthStore } from '../../stores/auth'
import { useLayoutStore } from '../../stores/layout'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const layout = useLayoutStore()

function isActive(to: string): boolean {
  if (to === '/' || to === '/dashboard') return route.path === to
  return route.path.startsWith(to)
}

const navItems = computed(() => {
  if (auth.isAdmin) {
    return [
      { label: 'Dashboard', icon: 'pi pi-home', to: '/dashboard' },
      { label: 'Tornei', icon: 'pi pi-trophy', to: '/tournaments' },
      { label: 'Giocatori', icon: 'pi pi-users', to: '/players' },
    ]
  }
  return [
    { label: 'Tornei', icon: 'pi pi-trophy', to: '/tournaments' },
  ]
})

const displayName = computed(() => auth.user?.name || auth.user?.email || 'Utente')

async function handleLogout(): Promise<void> {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <aside class="w-[260px] h-full flex flex-col bg-surface-0 border-r border-surface-200">
    <div class="flex items-center gap-3 px-5 py-[1.125rem] text-lg font-bold border-b border-surface-200 text-color">
      <i class="pi pi-circle-fill text-[1.4rem] text-primary-500" />
      <span>TLA App</span>
    </div>

    <nav class="flex-1 px-2 py-[0.625rem] overflow-y-auto">
      <ul class="flex flex-col gap-[0.125rem] list-none m-0 p-0">
        <li v-for="item in navItems" :key="item.to">
          <RouterLink
            :to="item.to"
            class="flex items-center gap-3 px-[0.875rem] py-[0.625rem] rounded-md text-color no-underline text-[0.9375rem] transition-[background] duration-150 hover:bg-surface-100"
            :class="{ 'bg-primary-50 text-primary-600 font-semibold': isActive(item.to) }"
            @click="layout.closeSidebar()"
          >
            <i :class="[item.icon, 'text-base w-5 text-center shrink-0']" />
            <span>{{ item.label }}</span>
          </RouterLink>
        </li>
      </ul>
    </nav>

    <div class="flex flex-col gap-3 px-4 py-[0.875rem] border-t border-surface-200">
      <div class="flex items-center gap-[0.625rem] min-w-0">
        <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center shrink-0 text-sm">
          <i class="pi pi-user" />
        </div>
        <div class="min-w-0">
          <span class="block text-[0.8125rem] font-medium text-color overflow-hidden text-ellipsis whitespace-nowrap">{{ displayName }}</span>
        </div>
      </div>

      <Button
        label="Esci"
        icon="pi pi-sign-out"
        severity="secondary"
        outlined
        size="small"
        fluid
        @click="handleLogout"
      />
    </div>
  </aside>
</template>
