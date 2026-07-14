<script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import Button from 'primevue/button';
  import InputText from 'primevue/inputtext';
  import Message from 'primevue/message';
  import Password from 'primevue/password';
  import AuthShowcase from '../components/auth/AuthShowcase.vue';
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
  <main class="register-page">
    <section class="register-shell" aria-label="Registrazione a TLA App">
      <AuthShowcase />

      <section class="register-panel">
        <div class="mobile-brand" aria-hidden="true"><span class="brand-ball" /><span>TLA</span></div>

        <div class="register-content">
          <header class="register-header">
            <p class="kicker">UNISCITI AL CLUB</p>
            <h1>{{ auth.registrationPending ? 'Controlla la tua email' : 'Crea il tuo account' }}</h1>
            <p>{{ auth.registrationPending ? 'Abbiamo inviato il link di conferma. Attiva l’account per poter accedere a TLA.' : 'Inserisci i tuoi dati per iniziare a utilizzare TLA.' }}</p>
          </header>

          <section v-if="auth.registrationPending" class="confirmation-panel">
            <Message v-if="auth.error" severity="error" :closable="false">{{ auth.error }}</Message>
            <span class="confirmation-icon"><i class="pi pi-envelope" /></span>
            <h2>Email di conferma inviata</h2>
            <p>{{ auth.registrationPending.message }}</p>
            <strong>{{ auth.registrationPending.email }}</strong>
            <small>Controlla anche la cartella spam. Dopo la conferma potrai accedere con le tue credenziali.</small>
            <Button label="Reinvia email di conferma" icon="pi pi-refresh" severity="secondary" outlined fluid :loading="auth.loading" @click="auth.resendConfirmation()" />
            <Button label="Vai al login" icon="pi pi-arrow-right" icon-pos="right" fluid @click="router.push({ name: 'login' })" />
          </section>

          <form v-else class="register-form" @submit.prevent="handleSubmit">
            <Message v-if="auth.error" severity="error" :closable="false">{{ auth.error }}</Message>

            <div class="field">
              <label for="name">Nome e cognome</label>
              <span class="input-wrap"><i class="pi pi-user" /><InputText id="name" v-model="name" placeholder="Mario Rossi" autocomplete="name" fluid required /></span>
            </div>

            <div class="field">
              <label for="email">Email</label>
              <span class="input-wrap"><i class="pi pi-envelope" /><InputText id="email" v-model="email" type="email" placeholder="nome@esempio.it" autocomplete="email" fluid required /></span>
            </div>

            <div class="field">
              <label for="password">Password</label>
              <span class="input-wrap password-wrap"><i class="pi pi-lock" /><Password id="password" v-model="password" placeholder="Crea una password" :feedback="true" autocomplete="new-password" fluid toggle-mask required /></span>
            </div>

            <div class="field">
              <label for="confirmPassword">Conferma password</label>
              <span class="input-wrap password-wrap"><i class="pi pi-shield" /><Password id="confirmPassword" v-model="confirmPassword" placeholder="Ripeti la password" :feedback="false" autocomplete="new-password" fluid toggle-mask required /></span>
            </div>

            <Button class="register-button" type="submit" label="Crea account" icon="pi pi-arrow-right" icon-pos="right" :loading="auth.loading" fluid />

            <div class="login-row">
              <span>Hai già un account?</span>
              <Button type="button" label="Accedi" variant="link" size="small" @click="router.push({ name: 'login' })" />
            </div>
          </form>
        </div>

        <p class="register-footer">© 2026 TLA · Tennis League Administration</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
.register-page { min-height: 100svh; display: grid; place-items: center; padding: clamp(1rem, 3vw, 2.5rem); background: var(--color-surface-soft); color: var(--color-text); }
.register-shell { width: min(1120px, 100%); min-height: min(760px, calc(100svh - 5rem)); display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(390px, 0.95fr); overflow: hidden; border: 1px solid var(--color-border); background: var(--color-surface-card); box-shadow: 0 28px 70px rgb(var(--color-shadow-rgb) / 14%); }
.register-panel { position: relative; display: flex; flex-direction: column; justify-content: center; padding: clamp(2rem, 5vw, 4rem); }
.register-content { width: min(390px, 100%); margin: auto; }
.register-header { margin-bottom: 1.5rem; }
.kicker { margin: 0 0 0.65rem; color: var(--color-primary-700); font-size: 0.75rem; font-weight: 800; letter-spacing: 0.16em; }
.register-header h1 { margin: 0; font-size: clamp(1.8rem, 3vw, 2.3rem); line-height: 1.15; letter-spacing: -0.045em; }
.register-header > p:last-child { margin: 0.7rem 0 0; color: var(--color-text-muted); font-size: 0.9rem; }
.register-form { display: flex; flex-direction: column; gap: 1rem; }
.confirmation-panel { display: flex; flex-direction: column; align-items: center; gap: .8rem; padding: 1.5rem 1.25rem; border: 1px solid var(--color-border); background: var(--color-surface-soft); text-align: center; }
.confirmation-icon { display: grid; width: 3.5rem; height: 3.5rem; place-items: center; border-radius: 50%; background: rgb(var(--color-primary-500-rgb) / 14%); color: var(--color-primary-700); font-size: 1.35rem; }
.confirmation-panel h2 { margin: .2rem 0 0; font-size: 1.2rem; }
.confirmation-panel p, .confirmation-panel small { margin: 0; color: var(--color-text-muted); line-height: 1.5; }
.confirmation-panel strong { overflow-wrap: anywhere; color: var(--color-text); }
.confirmation-panel :deep(.p-button) { margin-top: .45rem; }
.field { display: flex; flex-direction: column; gap: 0.45rem; }
.field label { color: var(--color-text-muted); font-size: 0.82rem; font-weight: 700; }
.input-wrap { position: relative; display: block; }
.input-wrap > i { position: absolute; z-index: 2; top: 50%; left: 1rem; transform: translateY(-50%); color: var(--color-text-subtle); font-size: 0.9rem; pointer-events: none; }
.input-wrap :deep(.p-inputtext) { height: 3.1rem; padding-left: 2.75rem; border-color: var(--color-border); background: var(--color-surface-soft); color: var(--color-text); font-size: 0.9rem; transition: 160ms; }
.input-wrap :deep(.p-inputtext:focus) { border-color: var(--color-primary-500); background: var(--color-surface-card); box-shadow: 0 0 0 4px rgb(var(--color-primary-500-rgb) / 10%); }
.password-wrap :deep(.p-password), .password-wrap :deep(.p-password-input) { width: 100%; }
.password-wrap :deep(.p-password-input) { padding-right: 3rem; }
.password-wrap :deep(.p-password-toggle-mask-icon) { color: var(--color-text-subtle); }
.register-button { height: 3.2rem; margin-top: 0.2rem; border-color: var(--color-primary-700); background: var(--color-primary-700); box-shadow: 0 10px 24px rgb(var(--color-primary-rgb) / 20%); font-weight: 700; }
.register-button:hover { border-color: var(--color-primary-800) !important; background: var(--color-primary-800) !important; }
.register-button :deep(.p-button-icon) { margin-left: auto; font-size: 0.85rem; }
.login-row { display: flex; align-items: center; justify-content: center; gap: 0.15rem; color: var(--color-text-muted); font-size: 0.82rem; }
.login-row :deep(.p-button) { padding-inline: 0.35rem; color: var(--color-primary-700); }
.register-footer { margin: auto auto 0; padding-top: 1.5rem; color: var(--color-text-subtle); font-size: 0.65rem; text-align: center; }
.mobile-brand { display: none; align-items: center; gap: 0.7rem; color: var(--color-primary-900); font-size: 1.35rem; font-weight: 800; }
.brand-ball { position: relative; width: 2rem; height: 2rem; overflow: hidden; border-radius: 50%; background: var(--color-accent); box-shadow: 0 5px 15px rgb(var(--color-black-rgb) / 16%); }
.brand-ball::before, .brand-ball::after { position: absolute; width: 1.5rem; height: 2.25rem; border: 1.5px solid rgb(var(--color-primary-rgb) / 65%); border-radius: 50%; content: ''; }
.brand-ball::before { left: -1rem; top: -0.15rem; }
.brand-ball::after { right: -1rem; bottom: -0.15rem; }
@media (max-width: 820px) {
  .register-page { padding: 0; background: var(--color-surface-card); }
  .register-shell { min-height: 100svh; grid-template-columns: 1fr; border: 0; box-shadow: none; }
  .auth-showcase { display: none; }
  .register-panel { justify-content: flex-start; padding: max(1.5rem, env(safe-area-inset-top)) clamp(1.25rem, 7vw, 3rem) max(1.5rem, env(safe-area-inset-bottom)); }
  .mobile-brand { display: flex; margin-bottom: clamp(2rem, 7vh, 3.5rem); }
  .register-content { margin: 0 auto; }
  .register-footer { margin-top: auto; }
}
@media (max-width: 420px) { .register-form { gap: 0.85rem; } .login-row { flex-wrap: wrap; } }
</style>
