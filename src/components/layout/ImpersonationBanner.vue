<script setup lang="ts">
// Always-visible strip shown while a platform admin uses the app as another
// user. It relies only on the /auth/me payload, so it adds no requests, and it
// cannot be dismissed: leaving the mode is the only way to hide it.
import { computed } from 'vue'
import Button from 'primevue/button'
import { useAuthStore } from '@/stores/auth'

const auth = useAuthStore()
const targetLabel = computed(() => auth.user?.name?.trim() || auth.user?.email || 'utente')
</script>

<template>
  <div
    v-if="auth.isImpersonating"
    role="status"
    class="sticky top-0 z-50 flex h-11 items-center gap-3 bg-amber-400 px-4 text-sm text-amber-950 shadow-sm"
  >
    <i class="pi pi-user-edit shrink-0" aria-hidden="true" />
    <p class="min-w-0 flex-1 truncate">
      Stai usando TLA come <strong>{{ targetLabel }}</strong>
      <span class="hidden sm:inline"> · {{ auth.user?.email }}</span>
      <span class="hidden md:inline text-amber-900/80"> — accesso come amministratore {{ auth.impersonator?.name ?? auth.impersonator?.email }}</span>
    </p>
    <Button
      label="Torna al tuo account"
      :pt="{ label: { class: 'max-sm:hidden' } }"
      aria-label="Torna al tuo account"
      icon="pi pi-sign-out"
      size="small"
      class="shrink-0 border-amber-950! bg-amber-950! text-amber-50! hover:bg-amber-900!"
      @click="auth.stopImpersonation()"
    />
  </div>
</template>
