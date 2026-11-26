<script setup lang="ts">
// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'
import { playersService } from '@/services/playersApi'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationsStore } from '@/stores/organizations'
import type { Player } from '@/types'

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------
const router = useRouter()
const auth = useAuthStore()
const organizations = useOrganizationsStore()
const menu = ref()
// The linked player card drives "Il mio profilo" and the avatar photo.
const myPlayer = ref<Player | null>(null)

// -----------------------------------------------------------------------------
// Derived state
// -----------------------------------------------------------------------------
const displayName = computed(() =>
  auth.isGuest ? 'Ospite' : auth.user?.name?.trim() || myPlayer.value?.name.trim() || auth.user?.email || 'Account TLA',
)
const initials = computed(() => {
  if (auth.isGuest) return ''
  return displayName.value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('')
})
const photoUrl = computed(() => myPlayer.value?.photo_url || undefined)
const roleLabel = computed(() => {
  if (auth.isGuest) return 'Accesso ospite'
  if (auth.isPlatformAdmin) return 'Amministratore piattaforma'
  const clubRole = organizations.activeOrganization?.role
  if (clubRole === 'owner') return 'Proprietario del club'
  if (clubRole === 'admin') return 'Amministratore del club'
  if (clubRole === 'member') return 'Membro del club'
  return myPlayer.value ? 'Giocatore' : 'Account personale'
})

// Guests have neither a player card nor account settings, only the exit.
const items = computed(() => [
  ...(!auth.isGuest
    ? [
        { label: 'Il mio profilo', icon: 'pi pi-user', command: openMyProfile },
        { label: 'Gestisci', icon: 'pi pi-cog', command: () => void router.push({ name: 'profile' }) },
      ]
    : []),
  ...(auth.isPlatformAdmin
    ? [{ label: 'Backoffice', icon: 'pi pi-shield', command: () => void router.push({ name: 'admin' }) }]
    : []),
  ...(auth.isImpersonating
    ? [{ label: 'Torna al tuo account', icon: 'pi pi-replay', command: () => auth.stopImpersonation() }]
    : []),
  ...(!auth.isGuest ? [{ separator: true }] : []),
  { label: 'Esci', icon: 'pi pi-sign-out', command: logout },
])

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------
async function loadMyPlayer(): Promise<void> {
  if (auth.isGuest) return
  try {
    myPlayer.value = await playersService.getMyPlayer()
  } catch {
    // The menu still works without a player card: "Il mio profilo" falls back
    // to the account page where the card can be created.
    myPlayer.value = null
  }
}

async function openMyProfile(): Promise<void> {
  if (!myPlayer.value) await loadMyPlayer()
  if (myPlayer.value) {
    void router.push({ name: 'player-detail', params: { id: myPlayer.value.id } })
    return
  }
  void router.push({ name: 'profile' })
}

async function logout(): Promise<void> {
  await auth.logout()
  await router.push('/login')
}

function toggle(event: Event): void {
  menu.value?.toggle(event)
}

// -----------------------------------------------------------------------------
// Lifecycle
// -----------------------------------------------------------------------------
onMounted(loadMyPlayer)
</script>

<template>
  <!-- Section: Avatar trigger -->
  <button
    type="button"
    class="ml-1 grid shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-transparent p-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500/35"
    aria-haspopup="menu"
    :aria-label="`Menu account: ${displayName}`"
    :title="displayName"
    @click="toggle"
  >
    <Avatar
      :image="photoUrl"
      :label="!photoUrl && initials ? initials : undefined"
      :icon="!photoUrl && !initials ? 'pi pi-user' : undefined"
      shape="circle"
      class="size-9! overflow-hidden bg-primary-100! text-sm! font-bold! text-primary-700!"
    />
  </button>

  <!-- Section: Account menu -->
  <Menu ref="menu" :model="items" popup class="w-72! p-1.5!">
    <template #start>
      <div class="mb-1.5 flex items-center gap-3 border-b border-(--color-border) px-2.5 pb-3 pt-2">
        <Avatar
          :image="photoUrl"
          :label="!photoUrl && initials ? initials : undefined"
          :icon="!photoUrl && !initials ? 'pi pi-user' : undefined"
          shape="circle"
          class="size-10! shrink-0 overflow-hidden bg-primary-100! font-bold! text-primary-700!"
        />
        <div class="min-w-0">
          <p class="truncate text-sm font-bold text-(--color-text)">{{ displayName }}</p>
          <p class="mt-0.5 flex items-center gap-1 truncate text-xs text-(--color-text-muted)">
            <i v-if="auth.isPlatformAdmin" class="pi pi-shield text-[0.7rem] text-primary" aria-hidden="true" />
            {{ roleLabel }}
          </p>
        </div>
      </div>
    </template>
    <template #item="{ item, props }">
      <a v-bind="props.action" class="flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm">
        <i :class="[item.icon, 'w-4 text-center text-(--color-text-muted)']" aria-hidden="true" />
        <span class="font-medium">{{ item.label }}</span>
      </a>
    </template>
  </Menu>
</template>
