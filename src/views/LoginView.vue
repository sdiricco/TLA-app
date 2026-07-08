<script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import Button from 'primevue/button';
  import InputText from 'primevue/inputtext';
  import Message from 'primevue/message';
  import Password from 'primevue/password';
  import AuthShowcase from '../components/auth/AuthShowcase.vue';
  import { useAuthStore } from '../stores/auth';

  const router = useRouter();
  const auth = useAuthStore();
  const email = ref('');
  const password = ref('');

  async function handleSubmit(): Promise<void> {
    await auth.login(email.value, password.value);
    if (auth.isAuthenticated) await router.push('/');
  }

</script>

<template>
  <main class="login-page">
    <section class="login-shell" aria-label="Accesso a TLA App">
      <AuthShowcase />

      <section class="login-panel">
        <div class="brand mobile-brand" aria-hidden="true"><span class="brand-ball" /> <span>TLA</span></div>

        <div class="login-content">
          <header class="login-header">
            <p class="kicker">BENTORNATO</p>
            <h2>Accedi al tuo account</h2>
            <p>Inserisci le tue credenziali per continuare.</p>
          </header>

          <form class="login-form" @submit.prevent="handleSubmit">
            <Message v-if="auth.error" severity="error" :closable="false">{{ auth.error }}</Message>

            <div class="field">
              <label for="email">Email</label>
              <span class="input-wrap">
                <i class="pi pi-envelope" />
                <InputText id="email" v-model="email" type="email" placeholder="nome@esempio.it" autocomplete="email" fluid required />
              </span>
            </div>

            <div class="field">
              <label for="password">Password</label>
              <span class="input-wrap password-wrap">
                <i class="pi pi-lock" />
                <Password id="password" v-model="password" placeholder="Inserisci la password" autocomplete="current-password" fluid toggle-mask required />
              </span>
            </div>

            <Button class="login-button" type="submit" label="Accedi" icon="pi pi-arrow-right" icon-pos="right" :loading="auth.loading" fluid />

            <div class="register-row">
              <span>Non hai ancora un account?</span>
              <Button type="button" label="Registrati" variant="link" size="small" @click="router.push({ name: 'register' })" />
            </div>

          </form>
        </div>

        <p class="login-footer">© 2026 TLA · Tennis League Administration</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
  .login-page {
    --brand: var(--color-primary-500);
    --brand-dark: var(--color-primary-700);
    min-height: 100svh;
    display: grid;
    place-items: center;
    padding: clamp(1rem, 3vw, 2.5rem);
    background: radial-gradient(circle at 10% 10%, rgb(var(--color-primary-500-rgb) / 9%), transparent 28rem), var(--color-surface-soft);
    color: var(--color-text);
  }

  .login-shell {
    width: min(1120px, 100%);
    min-height: min(720px, calc(100svh - 5rem));
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(390px, 0.95fr);
    overflow: hidden;
    border: 1px solid rgb(var(--color-shadow-rgb) / 6%);
    border-radius: 0;
    background: var(--color-surface-card);
    box-shadow: 0 28px 70px rgb(var(--color-shadow-rgb) / 14%);
  }

  .showcase {
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: clamp(2rem, 4vw, 3.5rem);
    background: var(--color-primary-800);
    color: var(--color-white);
  }

  .brand { display: flex; align-items: center; gap: 0.7rem; font-size: 1.35rem; font-weight: 800; letter-spacing: -0.04em; }
  .brand-ball { position: relative; width: 2rem; height: 2rem; overflow: hidden; border-radius: 50%; background: var(--color-accent); box-shadow: 0 5px 15px rgb(var(--color-black-rgb) / 16%); }
  .brand-ball::before, .brand-ball::after { position: absolute; width: 1.5rem; height: 2.25rem; border: 1.5px solid rgb(var(--color-primary-rgb) / 65%); border-radius: 50%; content: ''; }
  .brand-ball::before { left: -1rem; top: -0.15rem; }
  .brand-ball::after { right: -1rem; bottom: -0.15rem; }

  .showcase-copy { max-width: 480px; margin: auto 0 clamp(2.25rem, 5vh, 4rem); }
  .kicker { margin: 0 0 1rem; color: var(--color-primary-200); font-size: 0.75rem; font-weight: 800; letter-spacing: 0.16em; }
  .showcase-copy h1 { margin: 0; font-size: clamp(2.7rem, 5vw, 4.4rem); line-height: 0.98; letter-spacing: -0.06em; }
  .showcase-copy h1 span { color: var(--color-accent); }
  .showcase-copy > p:last-child { max-width: 430px; margin: 1.5rem 0 0; color: rgb(var(--color-white-rgb) / 72%); line-height: 1.65; }

  .court-card { width: min(390px, 100%); padding: 0.7rem; border: 1px solid rgb(var(--color-white-rgb) / 16%); border-radius: 0; background: rgb(var(--color-white-rgb) / 9%); box-shadow: 0 20px 40px rgb(var(--color-black-rgb) / 16%); backdrop-filter: blur(12px); }
  .court { position: relative; height: 105px; overflow: hidden; border: 1px solid rgb(var(--color-white-rgb) / 55%); background: var(--color-primary-700); }
  .court::before { position: absolute; inset: 18px 0; border-block: 1px solid rgb(var(--color-white-rgb) / 55%); content: ''; }
  .court::after { position: absolute; top: 18px; bottom: 18px; left: 50%; border-left: 1px solid rgb(var(--color-white-rgb) / 55%); content: ''; }
  .net { position: absolute; z-index: 1; inset: 50% 0 auto; border-top: 2px solid rgb(var(--color-white-rgb) / 85%); }
  .ball { position: absolute; z-index: 2; top: 25%; right: 24%; width: 11px; height: 11px; border-radius: 50%; background: var(--color-accent); box-shadow: 0 4px 8px rgb(var(--color-black-rgb) / 25%); }
  .court-info { display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 0.25rem 0.2rem; }
  .court-info div { display: grid; gap: 0.15rem; }
  .court-info strong { font-size: 0.78rem; }
  .court-info small { color: rgb(var(--color-white-rgb) / 60%); font-size: 0.68rem; }
  .live { display: flex; align-items: center; gap: 0.35rem; padding: 0.32rem 0.5rem; border-radius: 99px; background: rgb(var(--color-black-rgb) / 18%); color: var(--color-primary-100); font-size: 0.61rem; font-weight: 800; letter-spacing: 0.08em; }
  .live i { width: 6px; height: 6px; border-radius: 50%; background: var(--color-accent); box-shadow: 0 0 0 3px rgb(var(--color-accent-rgb) / 16%); }
  .showcase-footer { margin: 1.5rem 0 0; color: rgb(var(--color-white-rgb) / 40%); font-size: 0.7rem; }

  .login-panel { position: relative; display: flex; flex-direction: column; justify-content: center; padding: clamp(2.5rem, 6vw, 5rem); }
  .mobile-brand { display: none; color: var(--color-primary-900); }
  .login-content { width: min(390px, 100%); margin: auto; }
  .login-header { margin-bottom: 2rem; }
  .login-header .kicker { margin-bottom: 0.65rem; color: var(--brand-dark); }
  .login-header h2 { margin: 0; font-size: clamp(1.8rem, 3vw, 2.3rem); line-height: 1.15; letter-spacing: -0.045em; }
  .login-header > p:last-child { margin: 0.7rem 0 0; color: var(--color-text-muted); font-size: 0.92rem; }
  .login-form { display: flex; flex-direction: column; gap: 1.25rem; }
  .field { display: flex; flex-direction: column; gap: 0.5rem; }
  .field label { color: var(--color-text-muted); font-size: 0.82rem; font-weight: 700; }
  .input-wrap { position: relative; display: block; }
  .input-wrap > i { position: absolute; z-index: 2; top: 50%; left: 1rem; transform: translateY(-50%); color: var(--color-text-subtle); font-size: 0.9rem; pointer-events: none; }
  .input-wrap :deep(.p-inputtext) { height: 3.25rem; padding-left: 2.75rem; border-color: var(--color-border); border-radius: 0; background: var(--color-surface-soft); font-size: 0.9rem; transition: 160ms; }
  .input-wrap :deep(.p-inputtext:focus) { border-color: var(--brand); background: var(--color-surface-card); box-shadow: 0 0 0 4px rgb(var(--color-primary-500-rgb) / 10%); }
  .password-wrap :deep(.p-password), .password-wrap :deep(.p-password-input) { width: 100%; }
  .password-wrap :deep(.p-password-input) { padding-right: 3rem; }
  .password-wrap :deep(.p-password-toggle-mask-icon) { color: var(--color-text-subtle); }
  .login-button { height: 3.25rem; margin-top: 0.25rem; border-color: var(--brand-dark); border-radius: 0; background: var(--brand-dark); box-shadow: 0 10px 24px rgb(var(--color-primary-rgb) / 20%); font-weight: 700; }
  .login-button:hover { border-color: var(--color-primary-800) !important; background: var(--color-primary-800) !important; }
  .login-button :deep(.p-button-icon) { margin-left: auto; font-size: 0.85rem; }
  .register-row { display: flex; align-items: center; justify-content: center; gap: 0.15rem; color: var(--color-text-muted); font-size: 0.82rem; }
  .register-row :deep(.p-button) { padding-inline: 0.35rem; color: var(--brand-dark); }
  .divider { display: flex; align-items: center; gap: 0.8rem; color: var(--color-text-subtle); font-size: 0.72rem; }
  .divider::before, .divider::after { flex: 1; height: 1px; background: var(--color-border); content: ''; }
  .guest-button { height: 3.15rem; border-color: var(--color-border); border-radius: 0; color: var(--color-text-muted); font-weight: 650; }
  .guest-button:hover { border-color: var(--color-primary-300) !important; background: var(--color-surface-soft) !important; }
  .login-footer { margin: auto auto 0; padding-top: 2rem; color: var(--color-text-subtle); font-size: 0.65rem; text-align: center; }

  @media (max-width: 820px) {
    .login-page { padding: 0; background: var(--color-surface-card); }
    .login-shell { min-height: 100svh; grid-template-columns: 1fr; border: 0; border-radius: 0; box-shadow: none; }
    .auth-showcase { display: none; }
    .login-panel { justify-content: flex-start; padding: max(2rem, env(safe-area-inset-top)) clamp(1.25rem, 7vw, 3rem) max(1.5rem, env(safe-area-inset-bottom)); background: radial-gradient(circle at 100% 0, rgb(var(--color-primary-500-rgb) / 10%), transparent 16rem), var(--color-surface-card); }
    .mobile-brand { display: flex; margin-bottom: clamp(3.5rem, 11vh, 6rem); }
    .login-content { margin: 0 auto; }
    .login-footer { margin-top: auto; }
  }

  @media (max-width: 420px) {
    .login-header { margin-bottom: 1.65rem; }
    .login-form { gap: 1.05rem; }
    .register-row { flex-wrap: wrap; }
  }

  @media (max-height: 720px) and (min-width: 821px) {
    .login-page { padding: 1rem; }
    .login-shell { min-height: calc(100svh - 2rem); }
    .showcase-copy { margin-bottom: 1.5rem; }
    .court { height: 80px; }
    .login-panel { padding-block: 2rem; }
  }
</style>
