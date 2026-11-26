<script setup lang="ts">
// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------
import { computed, onMounted, ref } from 'vue'
import moment from 'moment'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Menu from 'primevue/menu'
import type { MenuItem } from 'primevue/menuitem'
import Skeleton from 'primevue/skeleton'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import AdminUserCreateDialog from '@/components/admin/AdminUserCreateDialog.vue'
import { adminService } from '@/services/adminApi'
import { useAuthStore } from '@/stores/auth'
import type { AdminUser, AdminUserCreate, UserRole } from '@/types'

// -----------------------------------------------------------------------------
// State
// -----------------------------------------------------------------------------
const auth = useAuthStore()
const confirm = useConfirm()
const toast = useToast()

const users = ref<AdminUser[]>([])
const loading = ref(true)
const loadError = ref<string | null>(null)
const search = ref('')
const roleFilter = ref<'all' | UserRole>('all')
const createOpen = ref(false)
const creating = ref(false)
const busyUserId = ref<string | null>(null)
const actionsMenu = ref<{ toggle: (event: Event) => void } | null>(null)
const menuUser = ref<AdminUser | null>(null)


// -----------------------------------------------------------------------------
// Derived state
// -----------------------------------------------------------------------------
const filteredUsers = computed(() => {
  const query = search.value.trim().toLowerCase()
  return users.value.filter((user) =>
    (roleFilter.value === 'all' || user.role === roleFilter.value)
    && (!query || `${user.name ?? ''} ${user.email}`.toLowerCase().includes(query)),
  )
})
const adminCount = computed(() => users.value.filter((user) => user.role === 'admin').length)

// Role filters sit in the list header with their counts, like quiet tabs.
const roleFilters = computed<{ label: string; value: 'all' | UserRole; count: number }[]>(() => [
  { label: 'Tutti', value: 'all', count: users.value.length },
  { label: 'Admin', value: 'admin', count: adminCount.value },
  { label: 'Giocatori', value: 'player', count: users.value.length - adminCount.value },
])

// Row menu: role change and deletion, built for the user that opened it.
const menuItems = computed<MenuItem[]>(() => {
  const user = menuUser.value
  if (!user) return []
  const isSelf = user.id === auth.user?.id
  return [
    user.role === 'admin'
      ? {
          label: 'Rendi giocatore',
          icon: 'pi pi-user',
          disabled: isSelf || adminCount.value <= 1,
          command: () => void changeRole(user, 'player'),
        }
      : {
          label: 'Promuovi ad amministratore',
          icon: 'pi pi-shield',
          command: () => confirmPromotion(user),
        },
    { separator: true },
    {
      label: 'Elimina utente',
      icon: 'pi pi-trash',
      class: 'text-red-600',
      disabled: isSelf,
      command: () => confirmDeletion(user),
    },
  ]
})

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------
function initials(user: AdminUser): string {
  return (user.name ?? user.email)
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function lastSignInLabel(user: AdminUser): string {
  if (!user.last_sign_in_at) return 'Mai entrato'
  return `Ultimo accesso ${moment(user.last_sign_in_at).locale('it').fromNow()}`
}

function canImpersonate(user: AdminUser): boolean {
  return user.role !== 'admin' && user.id !== auth.user?.id
}

function notifyError(summary: string, error: unknown): void {
  toast.add({ severity: 'error', summary, detail: (error as Error).message, life: 5000 })
}

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------
async function loadUsers(): Promise<void> {
  loading.value = true
  loadError.value = null
  try {
    users.value = await adminService.listUsers()
  } catch (error) {
    loadError.value = (error as Error).message
  } finally {
    loading.value = false
  }
}

function openActions(event: Event, user: AdminUser): void {
  menuUser.value = user
  actionsMenu.value?.toggle(event)
}

async function impersonate(user: AdminUser): Promise<void> {
  busyUserId.value = user.id
  try {
    await auth.startImpersonation(user.id)
  } catch (error) {
    notifyError('Accesso non riuscito', error)
    busyUserId.value = null
  }
}

function confirmPromotion(user: AdminUser): void {
  confirm.require({
    header: 'Promuovi ad amministratore',
    message: `${user.name ?? user.email} potrà gestire utenti, ruoli e configurazione della piattaforma.`,
    icon: 'pi pi-shield',
    rejectLabel: 'Annulla',
    acceptLabel: 'Promuovi',
    accept: () => void changeRole(user, 'admin'),
  })
}

async function changeRole(user: AdminUser, role: UserRole): Promise<void> {
  busyUserId.value = user.id
  try {
    const updated = await adminService.updateRole(user.id, role)
    users.value = users.value.map((entry) => (entry.id === updated.id ? updated : entry))
    toast.add({
      severity: 'success',
      summary: 'Ruolo aggiornato',
      detail: `${updated.name ?? updated.email} ora è ${role === 'admin' ? 'amministratore' : 'giocatore'}.`,
      life: 3000,
    })
  } catch (error) {
    notifyError('Ruolo non aggiornato', error)
  } finally {
    busyUserId.value = null
  }
}

function confirmDeletion(user: AdminUser): void {
  confirm.require({
    header: 'Elimina utente',
    message: `Eliminare definitivamente ${user.name ?? user.email}? L’account e i tornei personali verranno rimossi; la scheda giocatore resterà anonima nei tabelloni.`,
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Annulla',
    acceptLabel: 'Elimina',
    acceptSeverity: 'danger',
    accept: () => void deleteUser(user),
  })
}

async function deleteUser(user: AdminUser): Promise<void> {
  busyUserId.value = user.id
  try {
    await adminService.deleteUser(user.id)
    users.value = users.value.filter((entry) => entry.id !== user.id)
    toast.add({ severity: 'success', summary: 'Utente eliminato', detail: user.email, life: 3000 })
  } catch (error) {
    notifyError('Eliminazione non riuscita', error)
  } finally {
    busyUserId.value = null
  }
}

async function createUser(data: AdminUserCreate): Promise<void> {
  creating.value = true
  try {
    const created = await adminService.createUser(data)
    users.value = [...users.value, created]
    createOpen.value = false
    toast.add({ severity: 'success', summary: 'Utente creato', detail: `${created.email} può già accedere.`, life: 3500 })
  } catch (error) {
    notifyError('Creazione non riuscita', error)
  } finally {
    creating.value = false
  }
}

// -----------------------------------------------------------------------------
// Lifecycle
// -----------------------------------------------------------------------------
onMounted(loadUsers)
</script>

<template>
  <div class="grid gap-4">
    <!-- Section: Toolbar -->
    <div class="flex items-center gap-3">
      <IconField class="min-w-0 flex-1">
        <InputIcon class="pi pi-search" />
        <InputText v-model="search" placeholder="Cerca per nome o email" aria-label="Cerca utenti" fluid />
      </IconField>
      <Button
        label="Nuovo utente"
        icon="pi pi-user-plus"
        aria-label="Nuovo utente"
        class="shrink-0 whitespace-nowrap"
        :pt="{ label: { class: 'max-sm:hidden' } }"
        @click="createOpen = true"
      />
    </div>

    <!-- Section: Users list -->
    <div class="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-card)">
      <div class="flex items-center gap-2 border-b border-(--color-border) px-2 py-1.5 sm:px-3">
        <!-- Section: Role filters -->
        <div class="flex min-w-0 flex-1 gap-1 overflow-x-auto" role="group" aria-label="Filtra per ruolo">
          <button
            v-for="filter in roleFilters"
            :key="filter.value"
            type="button"
            class="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border-0 px-2.5 py-1.5 text-sm transition-colors"
            :class="roleFilter === filter.value
              ? 'bg-(--color-surface-muted) font-semibold text-(--color-text)'
              : 'bg-transparent text-(--color-text-muted) hover:text-(--color-text)'"
            :aria-pressed="roleFilter === filter.value"
            @click="roleFilter = filter.value"
          >
            {{ filter.label }}
            <span v-if="!loading" class="text-xs tabular-nums text-(--color-text-subtle)">{{ filter.count }}</span>
          </button>
        </div>
        <Button icon="pi pi-refresh" text rounded size="small" severity="secondary" aria-label="Ricarica utenti" :loading="loading" @click="loadUsers" />
      </div>

      <div v-if="loading" class="divide-y divide-(--color-border)">
        <div v-for="index in 6" :key="index" class="flex items-center gap-3 px-4 py-3.5 sm:px-5">
          <Skeleton shape="circle" size="2.5rem" />
          <div class="grid flex-1 gap-1.5"><Skeleton width="40%" /><Skeleton width="60%" height="0.75rem" /></div>
        </div>
      </div>

      <div v-else-if="loadError" class="grid justify-items-center gap-3 px-4 py-10 text-center text-sm text-(--color-text-muted)">
        <i class="pi pi-exclamation-circle text-xl" aria-hidden="true" />
        <p>{{ loadError }}</p>
        <Button label="Riprova" size="small" severity="secondary" outlined @click="loadUsers" />
      </div>

      <p v-else-if="filteredUsers.length === 0" class="px-4 py-10 text-center text-sm text-(--color-text-muted)">
        Nessun utente corrisponde alla ricerca.
      </p>

      <ul v-else class="m-0 list-none divide-y divide-(--color-border) p-0">
        <li v-for="user in filteredUsers" :key="user.id" class="flex items-center gap-3 px-4 py-3 sm:px-5">
          <Avatar
            :image="user.player?.photo_url ?? undefined"
            :label="user.player?.photo_url ? undefined : initials(user)"
            shape="circle"
            class="size-10! shrink-0 overflow-hidden bg-primary-50! text-sm! font-bold! text-primary-700!"
          />
          <div class="min-w-0 flex-1">
            <p class="flex min-w-0 items-center gap-2">
              <span class="truncate font-semibold">{{ user.name ?? 'Senza nome' }}</span>
              <span
                v-if="user.role === 'admin'"
                class="inline-flex shrink-0 items-center gap-1 rounded-md border border-(--color-border) px-1.5 py-px text-[0.7rem] font-medium text-(--color-text-muted)"
              >
                <i class="pi pi-shield text-[0.65rem]" aria-hidden="true" /><span class="max-sm:sr-only">Amministratore</span>
              </span>
              <span v-if="user.id === auth.user?.id" class="shrink-0 text-xs text-(--color-text-subtle)">(tu)</span>
            </p>
            <p class="truncate text-sm text-(--color-text-muted)">{{ user.email }}</p>
            <p class="mt-0.5 flex flex-wrap gap-x-3 text-xs text-(--color-text-subtle)">
              <span>{{ lastSignInLabel(user) }}</span>
              <span v-if="!user.onboarding_completed">Onboarding da completare</span>
              <span v-if="!user.email_confirmed" class="text-amber-600">Email non confermata</span>
            </p>
          </div>
          <Button
            v-if="canImpersonate(user)"
            icon="pi pi-sign-in"
            label="Entra come"
            size="small"
            severity="secondary"
            outlined
            class="shrink-0"
            :pt="{ label: { class: 'max-sm:hidden' } }"
            :aria-label="`Entra come ${user.name ?? user.email}`"
            :loading="busyUserId === user.id"
            :disabled="busyUserId !== null"
            @click="impersonate(user)"
          />
          <Button
            icon="pi pi-ellipsis-v"
            text
            rounded
            size="small"
            severity="secondary"
            class="shrink-0"
            aria-haspopup="true"
            :aria-label="`Altre azioni per ${user.name ?? user.email}`"
            :disabled="busyUserId !== null"
            @click="openActions($event, user)"
          />
        </li>
      </ul>
    </div>

    <Menu ref="actionsMenu" :model="menuItems" popup />
    <AdminUserCreateDialog v-model:visible="createOpen" :saving="creating" @submit="createUser" />
  </div>
</template>
