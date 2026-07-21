<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
import AuthShowcase from '@/components/auth/AuthShowcase.vue'
import { useAuthStore } from '@/stores/auth'

// Authentication state and local registration fields.
const router = useRouter()
const auth = useAuthStore()
const name = ref('')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')

async function handleSubmit(): Promise<void> {
  if (password.value !== confirmPassword.value) {
    auth.error = 'Le password non coincidono.'
    return
  }
  await auth.register(email.value, password.value, name.value)
  if (auth.isAuthenticated) await router.push('/')
}
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <main class="grid min-h-svh place-items-center bg-(--color-surface-soft) text-(--color-text) md:p-8 xl:p-10">
    <section class="grid min-h-svh w-full max-w-6xl overflow-hidden bg-(--color-surface-card) md:min-h-[calc(100svh-4rem)] md:grid-cols-2 md:border md:border-(--color-border) md:shadow-xl xl:min-h-[calc(100svh-5rem)]" aria-label="Registrazione a TLA App">
      <AuthShowcase class="hidden md:flex" />

      <!------------------------------>
      <!-- Section: Registration panel -->
      <!------------------------------>
      <section class="flex min-h-svh flex-col justify-start px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-10 md:min-h-0 md:justify-center md:p-10 xl:p-16">
        <div class="mb-10 flex items-center gap-3 text-xl font-extrabold text-primary-900 md:hidden" aria-hidden="true">
          <span class="grid size-8 place-items-center rounded-full bg-(--color-accent) shadow-md"><i class="pi pi-circle-fill text-[0.4rem] text-primary-800" /></span>
          <span>TLA</span>
        </div>

        <div class="mx-auto w-full max-w-sm">
          <!-- Section: Introduction -->
          <header class="mb-6">
            <p class="mb-2 text-xs font-extrabold tracking-[0.16em] text-primary-700">UNISCITI AL CLUB</p>
            <h1 class="text-3xl font-bold leading-tight tracking-tight xl:text-4xl">{{ auth.registrationPending ? 'Controlla la tua email' : 'Crea il tuo account' }}</h1>
            <p class="mt-3 text-sm leading-relaxed text-(--color-text-muted)">{{ auth.registrationPending ? 'Abbiamo inviato il link di conferma. Attiva l’account per poter accedere a TLA.' : 'Inserisci i tuoi dati per iniziare a utilizzare TLA.' }}</p>
          </header>

          <!------------------------------>
          <!-- Section: Email confirmation -->
          <!------------------------------>
          <section v-if="auth.registrationPending" class="flex flex-col items-center gap-3 border border-(--color-border) bg-(--color-surface-soft) p-5 text-center">
            <Message v-if="auth.error" class="w-full" severity="error" :closable="false">{{ auth.error }}</Message>
            <span class="grid size-14 place-items-center rounded-full bg-primary-100 text-xl text-primary-700"><i class="pi pi-envelope" /></span>
            <h2 class="text-xl font-bold">Email di conferma inviata</h2>
            <p class="text-sm leading-relaxed text-(--color-text-muted)">{{ auth.registrationPending.message }}</p>
            <strong class="wrap-anywhere">{{ auth.registrationPending.email }}</strong>
            <small class="leading-relaxed text-(--color-text-muted)">Controlla anche la cartella spam. Dopo la conferma potrai accedere con le tue credenziali.</small>
            <Button class="mt-2" label="Reinvia email di conferma" icon="pi pi-refresh" severity="secondary" outlined fluid :loading="auth.loading" @click="auth.resendConfirmation()" />
            <Button label="Vai al login" icon="pi pi-arrow-right" icon-pos="right" fluid @click="router.push({ name: 'login' })" />
          </section>

          <!------------------------------>
          <!-- Section: Registration form -->
          <!------------------------------>
          <form v-else class="flex flex-col gap-3.5" @submit.prevent="handleSubmit">
            <Message v-if="auth.error" severity="error" :closable="false">{{ auth.error }}</Message>

            <label for="name" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Nome e cognome<InputText id="name" v-model="name" placeholder="Mario Rossi" autocomplete="name" fluid required /></label>
            <label for="email" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Email<InputText id="email" v-model="email" type="email" placeholder="nome@esempio.it" autocomplete="email" fluid required /></label>
            <label for="password" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Password<Password id="password" v-model="password" class="w-full [&_.p-inputtext]:w-full" placeholder="Crea una password" :feedback="true" autocomplete="new-password" fluid toggle-mask required /></label>
            <label for="confirmPassword" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Conferma password<Password id="confirmPassword" v-model="confirmPassword" class="w-full [&_.p-inputtext]:w-full" placeholder="Ripeti la password" :feedback="false" autocomplete="new-password" fluid toggle-mask required /></label>

            <Button class="mt-1 h-13 rounded-none font-bold" type="submit" label="Crea account" icon="pi pi-arrow-right" icon-pos="right" :loading="auth.loading" fluid />
            <div class="flex flex-wrap items-center justify-center gap-1 text-sm text-(--color-text-muted)">
              <span>Hai già un account?</span>
              <Button class="px-1! text-primary-700!" type="button" label="Accedi" variant="link" size="small" @click="router.push({ name: 'login' })" />
            </div>
          </form>
        </div>

        <p class="mx-auto mt-auto pt-6 text-center text-xs text-(--color-text-subtle)">© 2026 TLA · Tennis League Administration</p>
      </section>
    </section>
  </main>
</template>
