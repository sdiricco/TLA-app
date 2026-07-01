<script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import Button from 'primevue/button';
  import InputText from 'primevue/inputtext';
  import Message from 'primevue/message';
  import Password from 'primevue/password';
  import { useAuthStore } from '../stores/auth';

  /**
   * Stores
   */
  const router = useRouter();
  const auth = useAuthStore();

  /**
   * Reactive vars
   */
  const name = ref('');
  const email = ref('');
  const password = ref('');
  const confirmPassword = ref('');

  /**
   * Actions
   */
  async function handleSubmit(): Promise<void> {
    if (password.value !== confirmPassword.value) {
      auth.error = 'Le password non coincidono.';
      return;
    }

    await auth.register(email.value, password.value, name.value);
    if (auth.isAuthenticated) {
      await router.push('/');
    }
  }
</script>

<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-surface-100">
    <!-- ------------------------------------------------ -->
    <!-- Header -->
    <!-- ------------------------------------------------ -->

    <div class="flex flex-col items-center gap-1 px-6 pt-8 pb-4 text-center">
      <i class="pi pi-circle-fill text-[2.5rem] text-primary-500" />
      <h1 class="mt-2 mb-0 text-[1.75rem] font-bold">TLA App</h1>
      <p class="m-0 text-muted-color text-sm">Crea il tuo account</p>
    </div>

    <!-- ------------------------------------------------ -->
    <!-- Form Registration -->
    <!-- ------------------------------------------------ -->
    <form class="flex flex-col gap-5" @submit.prevent="handleSubmit">
      <Message v-if="auth.error" severity="error" :closable="false">
        {{ auth.error }}
      </Message>

      <!-- Name -->
      <div class="flex flex-col gap-1.5">
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

      <!-- Email -->
      <div class="flex flex-col gap-1.5">
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

      <!-- Password -->
      <div class="flex flex-col gap-1.5">
        <label for="password" class="text-sm font-medium">Password</label>
        <Password
          id="password"
          v-model="password"
          placeholder="••••••••"
          :feedback="true"
          autocomplete="new-password"
          fluid
          toggle-mask
        />
      </div>

      <!-- Confirm Password -->
      <div class="flex flex-col gap-1.5">
        <label for="confirmPassword" class="text-sm font-medium">Conferma password</label>
        <Password
          id="confirmPassword"
          v-model="confirmPassword"
          placeholder="••••••••"
          autocomplete="new-password"
          fluid
          toggle-mask
        />
      </div>

      <!-- Button: Register -->
      <Button
        type="submit"
        label="Registrati"
        icon="pi pi-user-plus"
        :loading="auth.loading"
        fluid
      />

      <!-- Button: Go to Login page -->
      <div class="flex items-center justify-center gap-1 text-sm text-muted-color">
        <span>Hai già un account?</span>
        <Button
          type="button"
          label="Accedi"
          variant="link"
          size="small"
          @click="router.push({ name: 'login' })"
        />
      </div>
    </form>
  </div>
</template>
