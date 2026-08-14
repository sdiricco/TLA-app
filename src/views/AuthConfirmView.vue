<script setup lang="ts">
import { computed } from 'vue'
import { onBeforeRouteLeave, useRouter } from 'vue-router'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import AuthShowcase from '@/components/auth/AuthShowcase.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const isSuccess = computed(() => auth.emailConfirmation.status === 'success' && auth.isAuthenticated)
const isProcessing = computed(() => auth.emailConfirmation.status === 'processing')
const feedbackMessage = computed(() => {
  if (auth.emailConfirmation.message) return auth.emailConfirmation.message
  return 'Il link di conferma non contiene informazioni valide. Potrebbe essere già stato utilizzato o essere scaduto.'
})

onBeforeRouteLeave(auth.clearEmailConfirmation)

function continueToApp(): void {
  auth.clearEmailConfirmation()
  void router.replace('/')
}

function goToLogin(): void {
  auth.clearEmailConfirmation()
  void router.replace({ name: 'login' })
}

function goToRegistration(): void {
  auth.clearEmailConfirmation()
  void router.replace({ name: 'register' })
}
</script>

<template>
  <main class="grid min-h-svh place-items-center bg-(--color-surface-soft) text-(--color-text) md:p-8 xl:p-10">
    <section class="grid min-h-svh w-full max-w-6xl overflow-hidden bg-(--color-surface-card) md:min-h-[calc(100svh-4rem)] md:grid-cols-2 md:rounded-lg md:border md:border-(--color-border) xl:min-h-[calc(100svh-5rem)]" aria-label="Conferma account TLA">
      <AuthShowcase class="hidden md:flex" />

      <!------------------------------>
      <!-- Section: Confirmation result -->
      <!------------------------------>
      <section class="flex min-h-svh flex-col justify-start px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-10 md:min-h-0 md:justify-center md:p-10 xl:p-16">
        <div class="mb-10 flex items-center gap-3 text-xl font-extrabold text-primary-900 md:hidden" aria-hidden="true">
          <span class="grid size-8 place-items-center rounded-full bg-(--color-accent) shadow-md"><i class="pi pi-circle-fill text-[0.4rem] text-primary-800" /></span>
          <span>TLA</span>
        </div>

        <div class="mx-auto grid w-full max-w-sm justify-items-center gap-4 text-center">
          <template v-if="isProcessing">
            <ProgressSpinner class="size-12" stroke-width="4" />
            <h1 class="text-3xl font-bold tracking-tight">Conferma in corso</h1>
            <p class="text-sm leading-relaxed text-(--color-text-muted)">{{ feedbackMessage }}</p>
          </template>

          <template v-else-if="isSuccess">
            <span class="grid size-16 place-items-center rounded-full bg-primary-100 text-2xl text-primary"><i class="pi pi-check" /></span>
            <div>
              <p class="mb-2 text-xs font-extrabold tracking-[0.16em] text-primary">ACCOUNT ATTIVATO</p>
              <h1 class="text-3xl font-bold tracking-tight">Email confermata</h1>
            </div>
            <p class="text-sm leading-relaxed text-(--color-text-muted)">{{ feedbackMessage }}</p>
            <Button label="Continua in TLA" icon="pi pi-arrow-right" icon-pos="right" fluid @click="continueToApp" />
          </template>

          <template v-else>
            <span class="grid size-16 place-items-center rounded-full bg-red-50 text-2xl text-red-700"><i class="pi pi-times" /></span>
            <div>
              <p class="mb-2 text-xs font-extrabold tracking-[0.16em] text-red-700">CONFERMA NON RIUSCITA</p>
              <h1 class="text-3xl font-bold tracking-tight">Link non valido</h1>
            </div>
            <p class="text-sm leading-relaxed text-(--color-text-muted)">{{ feedbackMessage }}</p>
            <div class="grid w-full gap-2">
              <Button label="Vai al login" icon="pi pi-sign-in" fluid @click="goToLogin" />
              <Button label="Crea un nuovo account" severity="secondary" outlined fluid @click="goToRegistration" />
            </div>
          </template>
        </div>

        <p class="mx-auto mt-auto pt-6 text-center text-xs text-(--color-text-subtle)">© 2026 TLA · Tennis League Administration</p>
      </section>
    </section>
  </main>
</template>
