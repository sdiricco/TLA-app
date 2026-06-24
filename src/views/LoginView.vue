<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import Password from 'primevue/password'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()

const mode = ref<'login' | 'register'>('login')
const name = ref('')
const email = ref('')
const password = ref('')

function toggleMode(): void {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  auth.error = null
}

async function handleSubmit(): Promise<void> {
  if (mode.value === 'login') {
    await auth.login(email.value, password.value)
  } else {
    await auth.register(email.value, password.value, name.value)
  }
  if (auth.isAuthenticated) {
    await router.push('/')
  }
}

async function continueAsGuest(): Promise<void> {
  await auth.loginAsGuest()
  await router.push('/dashboard')
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-surface-100">
    <Card class="w-full max-w-[400px]">
      <template #header>
        <div class="flex flex-col items-center gap-1 px-6 pt-8 pb-0 text-center">
          <i class="pi pi-circle-fill text-[2.5rem] text-primary-500" />
          <h1 class="mt-2 mb-0 text-[1.75rem] font-bold">TLA App</h1>
          <p class="m-0 text-muted-color text-sm">Tennis League Administration</p>
        </div>
      </template>

      <template #content>
        <form class="flex flex-col gap-5" @submit.prevent="handleSubmit">
          <Message v-if="auth.error" severity="error" :closable="false">
            {{ auth.error }}
          </Message>

          <div v-if="mode === 'register'" class="flex flex-col gap-[0.375rem]">
            <label for="name" class="text-sm font-medium">Nome</label>
            <InputText
              id="name"
              v-model="name"
              placeholder="Mario Rossi"
              autocomplete="name"
              fluid
              required
            />
          </div>

          <div class="flex flex-col gap-[0.375rem]">
            <label for="email" class="text-sm font-medium">Email</label>
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

          <div class="flex flex-col gap-[0.375rem]">
            <label for="password" class="text-sm font-medium">Password</label>
            <Password
              id="password"
              v-model="password"
              placeholder="••••••••"
              :feedback="mode === 'register'"
              autocomplete="current-password"
              fluid
              toggle-mask
            />
          </div>

          <Button
            type="submit"
            :label="mode === 'login' ? 'Accedi' : 'Registrati'"
            :icon="mode === 'login' ? 'pi pi-sign-in' : 'pi pi-user-plus'"
            :loading="auth.loading"
            fluid
          />

          <div class="flex items-center justify-center gap-1 text-sm text-muted-color">
            <span v-if="mode === 'login'">Non hai un account?</span>
            <span v-else>Hai già un account?</span>
            <Button
              type="button"
              :label="mode === 'login' ? 'Registrati' : 'Accedi'"
              variant="link"
              size="small"
              @click="toggleMode"
            />
          </div>

          <Button
            v-if="mode === 'login'"
            type="button"
            label="Entra come ospite"
            icon="pi pi-eye"
            severity="secondary"
            outlined
            fluid
            @click="continueAsGuest"
          />
        </form>
      </template>
    </Card>
  </div>
</template>
