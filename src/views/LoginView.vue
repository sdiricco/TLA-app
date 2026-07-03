<script setup lang="ts">
  import { ref } from 'vue';
  import { useRouter } from 'vue-router';
  import Button from 'primevue/button';
  import InputText from 'primevue/inputtext';
  import Message from 'primevue/message';
  import Password from 'primevue/password';
  import { useAuthStore } from '../stores/auth';

  const router = useRouter();
  const auth = useAuthStore();
  const email = ref('');
  const password = ref('');

  async function handleSubmit(): Promise<void> {
    await auth.login(email.value, password.value);
    if (auth.isAuthenticated) await router.push('/');
  }

  async function continueAsGuest(): Promise<void> {
    await auth.loginAsGuest();
    await router.push({ name: 'tournaments' });
  }
</script>

<template>
  <main class="login-page">
    <section class="login-shell" aria-label="Accesso a TLA App">
      <aside class="showcase" aria-hidden="true">
        <div class="glow glow-top" />
        <div class="glow glow-bottom" />
        <div class="brand"><span class="brand-ball" /> <span>TLA</span></div>

        <div class="showcase-copy">
          <p class="kicker">IL TUO CIRCOLO, SEMPRE IN GIOCO</p>
          <h1>Ogni match.<br />Un'unica <span>visione.</span></h1>
          <p>Organizza tornei, gestisci i giocatori e segui ogni risultato da un solo posto.</p>
        </div>

        <div class="court-card">
          <div class="court"><i class="net" /><i class="ball" /></div>
          <div class="court-info">
            <div><strong>Torneo sociale</strong><small>Tabellone in corso</small></div>
            <span class="live"><i /> LIVE</span>
          </div>
        </div>
        <p class="showcase-footer">Tennis League Administration</p>
      </aside>

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

            <div class="divider"><span>oppure</span></div>
            <Button class="guest-button" type="button" label="Continua come ospite" icon="pi pi-compass" severity="secondary" outlined fluid @click="continueAsGuest" />
          </form>
        </div>

        <p class="login-footer">© 2026 TLA · Tennis League Administration</p>
      </section>
    </section>
  </main>
</template>

<style scoped>
  .login-page {
    --brand: #10b981;
    --brand-dark: #047857;
    min-height: 100svh;
    display: grid;
    place-items: center;
    padding: clamp(1rem, 3vw, 2.5rem);
    background: radial-gradient(circle at 10% 10%, rgb(16 185 129 / 9%), transparent 28rem), #f3f6f5;
    color: #17211d;
  }

  .login-shell {
    width: min(1120px, 100%);
    min-height: min(720px, calc(100svh - 5rem));
    display: grid;
    grid-template-columns: minmax(0, 1.05fr) minmax(390px, 0.95fr);
    overflow: hidden;
    border: 1px solid rgb(15 23 42 / 6%);
    border-radius: 28px;
    background: #fff;
    box-shadow: 0 28px 70px rgb(15 45 33 / 14%);
  }

  .showcase {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: clamp(2rem, 4vw, 3.5rem);
    background: linear-gradient(145deg, #07382e, #075f49 55%, #087f5b);
    color: white;
  }

  .showcase::after {
    position: absolute;
    z-index: -1;
    inset: 0;
    content: '';
    opacity: 0.18;
    background-image: radial-gradient(rgb(255 255 255 / 45%) 0.7px, transparent 0.7px);
    background-size: 14px 14px;
    mask-image: linear-gradient(to bottom, black, transparent 70%);
  }

  .glow { position: absolute; z-index: -1; border-radius: 50%; }
  .glow-top { width: 300px; height: 300px; top: -160px; right: -80px; background: rgb(110 231 183 / 17%); }
  .glow-bottom { width: 360px; height: 360px; bottom: -250px; left: -120px; border: 1px solid rgb(255 255 255 / 12%); box-shadow: 0 0 0 50px rgb(255 255 255 / 3%), 0 0 0 100px rgb(255 255 255 / 2%); }

  .brand { display: flex; align-items: center; gap: 0.7rem; font-size: 1.35rem; font-weight: 800; letter-spacing: -0.04em; }
  .brand-ball { position: relative; width: 2rem; height: 2rem; overflow: hidden; border-radius: 50%; background: #b7f34a; box-shadow: 0 5px 15px rgb(0 0 0 / 16%); }
  .brand-ball::before, .brand-ball::after { position: absolute; width: 1.5rem; height: 2.25rem; border: 1.5px solid rgb(5 94 70 / 65%); border-radius: 50%; content: ''; }
  .brand-ball::before { left: -1rem; top: -0.15rem; }
  .brand-ball::after { right: -1rem; bottom: -0.15rem; }

  .showcase-copy { max-width: 480px; margin: auto 0 clamp(2.25rem, 5vh, 4rem); }
  .kicker { margin: 0 0 1rem; color: #a7f3d0; font-size: 0.75rem; font-weight: 800; letter-spacing: 0.16em; }
  .showcase-copy h1 { margin: 0; font-size: clamp(2.7rem, 5vw, 4.4rem); line-height: 0.98; letter-spacing: -0.06em; }
  .showcase-copy h1 span { color: #b7f34a; }
  .showcase-copy > p:last-child { max-width: 430px; margin: 1.5rem 0 0; color: rgb(255 255 255 / 72%); line-height: 1.65; }

  .court-card { width: min(390px, 100%); padding: 0.7rem; border: 1px solid rgb(255 255 255 / 16%); border-radius: 18px; background: rgb(255 255 255 / 9%); box-shadow: 0 20px 40px rgb(0 0 0 / 16%); backdrop-filter: blur(12px); }
  .court { position: relative; height: 105px; overflow: hidden; border: 1px solid rgb(255 255 255 / 55%); background: #0b8b61; }
  .court::before { position: absolute; inset: 18px 0; border-block: 1px solid rgb(255 255 255 / 55%); content: ''; }
  .court::after { position: absolute; top: 18px; bottom: 18px; left: 50%; border-left: 1px solid rgb(255 255 255 / 55%); content: ''; }
  .net { position: absolute; z-index: 1; inset: 50% 0 auto; border-top: 2px solid rgb(255 255 255 / 85%); }
  .ball { position: absolute; z-index: 2; top: 25%; right: 24%; width: 11px; height: 11px; border-radius: 50%; background: #d9ff66; box-shadow: 0 4px 8px rgb(0 0 0 / 25%); }
  .court-info { display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 0.25rem 0.2rem; }
  .court-info div { display: grid; gap: 0.15rem; }
  .court-info strong { font-size: 0.78rem; }
  .court-info small { color: rgb(255 255 255 / 60%); font-size: 0.68rem; }
  .live { display: flex; align-items: center; gap: 0.35rem; padding: 0.32rem 0.5rem; border-radius: 99px; background: rgb(0 0 0 / 18%); color: #d1fae5; font-size: 0.61rem; font-weight: 800; letter-spacing: 0.08em; }
  .live i { width: 6px; height: 6px; border-radius: 50%; background: #b7f34a; box-shadow: 0 0 0 3px rgb(183 243 74 / 16%); }
  .showcase-footer { margin: 1.5rem 0 0; color: rgb(255 255 255 / 40%); font-size: 0.7rem; }

  .login-panel { position: relative; display: flex; flex-direction: column; justify-content: center; padding: clamp(2.5rem, 6vw, 5rem); }
  .mobile-brand { display: none; color: #064e3b; }
  .login-content { width: min(390px, 100%); margin: auto; }
  .login-header { margin-bottom: 2rem; }
  .login-header .kicker { margin-bottom: 0.65rem; color: var(--brand-dark); }
  .login-header h2 { margin: 0; font-size: clamp(1.8rem, 3vw, 2.3rem); line-height: 1.15; letter-spacing: -0.045em; }
  .login-header > p:last-child { margin: 0.7rem 0 0; color: #66736e; font-size: 0.92rem; }
  .login-form { display: flex; flex-direction: column; gap: 1.25rem; }
  .field { display: flex; flex-direction: column; gap: 0.5rem; }
  .field label { color: #34413c; font-size: 0.82rem; font-weight: 700; }
  .input-wrap { position: relative; display: block; }
  .input-wrap > i { position: absolute; z-index: 2; top: 50%; left: 1rem; transform: translateY(-50%); color: #8a9892; font-size: 0.9rem; pointer-events: none; }
  .input-wrap :deep(.p-inputtext) { height: 3.25rem; padding-left: 2.75rem; border-color: #dce5e1; border-radius: 12px; background: #fbfdfc; font-size: 0.9rem; transition: 160ms; }
  .input-wrap :deep(.p-inputtext:focus) { border-color: var(--brand); background: white; box-shadow: 0 0 0 4px rgb(16 185 129 / 10%); }
  .password-wrap :deep(.p-password), .password-wrap :deep(.p-password-input) { width: 100%; }
  .password-wrap :deep(.p-password-input) { padding-right: 3rem; }
  .password-wrap :deep(.p-password-toggle-mask-icon) { color: #8a9892; }
  .login-button { height: 3.25rem; margin-top: 0.25rem; border-color: var(--brand-dark); border-radius: 12px; background: var(--brand-dark); box-shadow: 0 10px 24px rgb(4 120 87 / 20%); font-weight: 700; }
  .login-button:hover { border-color: #065f46 !important; background: #065f46 !important; }
  .login-button :deep(.p-button-icon) { margin-left: auto; font-size: 0.85rem; }
  .register-row { display: flex; align-items: center; justify-content: center; gap: 0.15rem; color: #697670; font-size: 0.82rem; }
  .register-row :deep(.p-button) { padding-inline: 0.35rem; color: var(--brand-dark); }
  .divider { display: flex; align-items: center; gap: 0.8rem; color: #9aa5a0; font-size: 0.72rem; }
  .divider::before, .divider::after { flex: 1; height: 1px; background: #e6ece9; content: ''; }
  .guest-button { height: 3.15rem; border-color: #dce5e1; border-radius: 12px; color: #34413c; font-weight: 650; }
  .guest-button:hover { border-color: #a7d9c8 !important; background: #f3fbf8 !important; }
  .login-footer { margin: auto auto 0; padding-top: 2rem; color: #a3ada9; font-size: 0.65rem; text-align: center; }

  @media (max-width: 820px) {
    .login-page { padding: 0; background: white; }
    .login-shell { min-height: 100svh; grid-template-columns: 1fr; border: 0; border-radius: 0; box-shadow: none; }
    .showcase { display: none; }
    .login-panel { justify-content: flex-start; padding: max(2rem, env(safe-area-inset-top)) clamp(1.25rem, 7vw, 3rem) max(1.5rem, env(safe-area-inset-bottom)); background: radial-gradient(circle at 100% 0, rgb(16 185 129 / 10%), transparent 16rem), white; }
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
