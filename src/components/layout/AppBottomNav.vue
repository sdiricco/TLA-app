<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useOrganizationsStore } from '../../stores/organizations'

const route = useRoute()
const auth = useAuthStore()
const organizations = useOrganizationsStore()
const isOrganizationFlow = computed(() => route.name === 'organizations-explore' || route.name === 'organization-create' || route.name === 'organization-edit')

const navItems = computed(() => {
  if (!organizations.activeOrganization) {
    return [{ label: 'Organizzazioni', icon: 'mdi:domain', to: '/organizations' }]
  }

  if (auth.isGuest) {
    return [
      { label: 'Organizzazioni', icon: 'mdi:domain', to: '/organizations' },
      { label: 'Tornei', icon: 'mdi:trophy-outline', to: '/tournaments' },
      { label: 'Giocatori', icon: 'mdi:account-group-outline', to: '/players' },
    ]
  }

  if (auth.isAdmin) {
    return [
      { label: 'Tornei', icon: 'mdi:trophy-outline', to: '/tournaments' },
      { label: 'Giocatori', icon: 'mdi:account-group-outline', to: '/players' },
    ]
  }

  return [
    { label: 'Tornei', icon: 'mdi:trophy-outline', to: '/tournaments' },
  ]
})

function isActive(to: string): boolean {
  if (to === '/') return route.path === to
  return route.path.startsWith(to)
}
</script>

<template>
  <nav v-if="!isOrganizationFlow" class="app-bottom-nav" aria-label="Navigazione mobile principale">
    <RouterLink
      v-for="item in navItems"
      :key="item.to"
      :to="item.to"
      class="bottom-link"
      :class="{ active: isActive(item.to) }"
    >
      <IconifyIcon :icon="item.icon" />
      <span>{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.app-bottom-nav {
  position: sticky;
  bottom: 0;
  z-index: 20;
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 1fr;
  gap: 0.35rem;
  padding: 0.55rem 0.75rem calc(0.55rem + env(safe-area-inset-bottom));
  border-top: 1px solid var(--color-border);
  background: rgb(var(--color-white-rgb) / 92%);
  backdrop-filter: blur(14px);
}

@media (min-width: 768px) {
  .app-bottom-nav {
    display: none;
  }
}

.bottom-link {
  display: grid;
  justify-items: center;
  gap: 0.22rem;
  min-height: 3.25rem;
  padding: 0.45rem 0.35rem;
  color: var(--color-text-muted);
  text-decoration: none;
  transition: 160ms ease;
}

.bottom-link :deep(svg) {
  font-size: 1rem;
}

.bottom-link span {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.bottom-link.active {
  color: var(--color-primary-700);
}
</style>
