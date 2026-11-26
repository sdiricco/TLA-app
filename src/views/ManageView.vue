<script setup lang="ts">
// -----------------------------------------------------------------------------
// Imports
// -----------------------------------------------------------------------------
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import AdminUsersPanel from '@/components/admin/AdminUsersPanel.vue'
import { useAuthStore } from '@/stores/auth'

// -----------------------------------------------------------------------------
// State
// Platform backoffice: the bridge between sign-in and the app for platform
// admins. It lives outside the app shell on purpose, so app navigation and
// in-app tools (tournament configuration lives in Impostazioni) never show
// here; from this page the admin enters the app as themselves or as a user.
// -----------------------------------------------------------------------------
const router = useRouter()
const auth = useAuthStore()

// -----------------------------------------------------------------------------
// Actions
// -----------------------------------------------------------------------------
async function logout(): Promise<void> {
  await auth.logout()
  await router.push('/login')
}
</script>

<template>
  <div class="min-h-svh bg-(--color-surface-ground) text-(--color-text)">
    <!------------------------------>
    <!-- Section: Backoffice bar -->
    <!------------------------------>
    <header
      class="sticky top-0 z-10 border-b border-(--color-border) bg-(--color-surface-card) pt-[env(safe-area-inset-top)]"
    >
      <div class="mx-auto flex h-16 w-full max-w-245 items-center gap-3 px-4 sm:px-6">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <img src="/favicon.svg?v=2" alt="" class="size-8 shrink-0" />
          <div class="min-w-0 leading-tight">
            <p class="whitespace-nowrap text-base font-extrabold tracking-tight">TLA <span class="font-semibold text-(--color-text-muted)">Backoffice</span></p>
            <p class="truncate text-xs text-(--color-text-muted)">{{ auth.user?.name || auth.user?.email }}</p>
          </div>
        </div>
        <Button
          size="small"
          aria-label="Entra nell'app con il tuo account"
          class="shrink-0 gap-2 whitespace-nowrap"
          @click="router.push({ name: 'dashboard' })"
        >
          <span class="max-sm:hidden">Entra nell'app</span>
          <span class="sm:hidden">App</span>
          <i class="pi pi-arrow-right text-sm" aria-hidden="true" />
        </Button>
        <Button
          icon="pi pi-sign-out"
          text
          rounded
          severity="secondary"
          aria-label="Esci"
          title="Esci"
          @click="logout"
        />
      </div>
    </header>

    <!------------------------------>
    <!-- Section: Users -->
    <!------------------------------>
    <main class="mx-auto flex w-full max-w-245 flex-col gap-5 px-4 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-8">
      <header>
        <h1 class="text-2xl font-bold tracking-tight">Utenti</h1>
        <p class="mt-1 text-sm text-(--color-text-muted)">
          Gestisci account e ruoli, oppure entra nell'app al posto di un utente.
        </p>
      </header>
      <AdminUsersPanel />
    </main>
  </div>
</template>
