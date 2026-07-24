<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
import AuthShowcase from '@/components/auth/AuthShowcase.vue'
import { useAuthStore } from '@/stores/auth'

// -----------------------------------------------------------------------------
// Route services and authentication state
// The store owns request progress, errors and the authenticated user. This view
// keeps only the two credentials entered in the form.
// -----------------------------------------------------------------------------
const router = useRouter()
const auth = useAuthStore()
const email = ref('')
const password = ref('')

// -----------------------------------------------------------------------------
// Authentication actions
// Navigation happens only after the store confirms that a user was created.
// Failed requests remain on this page and are rendered through auth.error.
// -----------------------------------------------------------------------------
async function handleSubmit(): Promise<void> {
  await auth.login(email.value, password.value)
  if (auth.isAuthenticated) await router.push('/')
}

async function handleGuestLogin(): Promise<void> {
  await auth.loginAsGuest()
  if (auth.isAuthenticated) await router.push('/')
}
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <main
    class="grid min-h-svh place-items-center bg-(--color-surface-soft) text-(--color-text) md:p-8 xl:p-10"
  >
    <section
      class="grid min-h-svh w-full max-w-6xl overflow-hidden bg-(--color-surface-card) md:min-h-[calc(100svh-4rem)] md:grid-cols-2 md:rounded-lg md:border md:border-(--color-border) xl:min-h-[calc(100svh-5rem)]"
      aria-label="Accesso a TLA App"
    >
      <!------------------------------>
      <!-- Section: Desktop showcase -->
      <!------------------------------>
      <AuthShowcase class="hidden md:flex" />

      <!------------------------------>
      <!-- Section: Login panel -->
      <!------------------------------>
      <section
        class="relative flex min-h-svh flex-col justify-start bg-(--color-surface-card) px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] sm:px-10 md:min-h-0 md:justify-center md:p-10 xl:p-16"
      >
        <!-- Mobile brand -->
        <div
          class="mb-14 flex items-center gap-3 text-xl font-extrabold tracking-tight text-primary-900 sm:mb-20 md:hidden"
          aria-hidden="true"
        >
          <span class="grid size-8 place-items-center rounded-full bg-(--color-accent) shadow-md">
            <i class="pi pi-circle-fill text-[0.4rem] text-primary-800" />
          </span>
          <span>TLA</span>
        </div>

        <div class="mx-auto w-full max-w-sm">
          <!------------------------------>
          <!-- Section: Login introduction -->
          <!------------------------------>
          <header class="mb-7 sm:mb-8">
            <p class="mb-2 text-xs font-extrabold tracking-[0.16em] text-primary">BENTORNATO</p>
            <h1 class="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">
              Accedi al tuo account
            </h1>
            <p class="mt-3 text-sm text-(--color-text-muted)">
              Inserisci le tue credenziali per continuare.
            </p>
          </header>

          <!------------------------------>
          <!-- Section: Login form -->
          <!------------------------------>
          <form class="flex flex-col gap-4 sm:gap-5" @submit.prevent="handleSubmit">
            <Message v-if="auth.error" severity="error" :closable="false">{{ auth.error }}</Message>

            <!-- Email field -->
            <div class="flex flex-col gap-2">
              <label for="email" class="text-sm font-bold text-(--color-text-muted)">Email</label>
              <InputText
                id="email"
                v-model="email"
                type="email"
                placeholder="nome@esempio.it"
                autocomplete="email"
                fluid
                required
              />
            </div>

            <!-- Password field -->
            <div class="flex flex-col gap-2">
              <label for="password" class="text-sm font-bold text-(--color-text-muted)">Password</label>
              <Password
                id="password"
                v-model="password"
                placeholder="Inserisci la password"
                autocomplete="current-password"
                :feedback="false"
                fluid
                toggle-mask
                required
              />
            </div>

            <!-- Primary login action -->
            <Button
              type="submit"
              label="Accedi"
              icon="pi pi-arrow-right"
              icon-pos="right"
              :loading="auth.loading"
              fluid
            />

            <!-- Alternative access divider -->
            <div class="flex items-center gap-3 text-xs text-(--color-text-subtle)" aria-hidden="true">
              <span class="h-px flex-1 bg-(--color-border)" />
              <span>oppure</span>
              <span class="h-px flex-1 bg-(--color-border)" />
            </div>

            <Button
              type="button"
              label="Entra come ospite"
              icon="pi pi-eye"
              severity="secondary"
              outlined
              :loading="auth.loading"
              fluid
              @click="handleGuestLogin"
            />

            <!-- Registration navigation -->
            <div class="flex flex-wrap items-center justify-center gap-1 text-sm text-(--color-text-muted)">
              <span>Non hai ancora un account?</span>
              <Button
                type="button"
                label="Registrati"
                variant="link"
                size="small"
                @click="router.push({ name: 'register' })"
              />
            </div>
          </form>
        </div>

        <!------------------------------>
        <!-- Section: Footer -->
        <!------------------------------>
        <p class="mx-auto mt-auto pt-8 text-center text-[0.65rem] text-(--color-text-subtle)">
          © 2026 TLA · Tennis League Administration
        </p>
      </section>
    </section>
  </main>
</template>
