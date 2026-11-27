<script setup lang="ts">
import CourtRally from '@/components/auth/CourtRally.vue'
</script>

<template>
  <aside class="auth-showcase" aria-hidden="true">
    <div class="brand"><span class="brand-ball" /> <span>TLA</span></div>

    <div class="showcase-copy">
      <p class="kicker">IL TUO CIRCOLO, SEMPRE IN GIOCO</p>
      <h1>Ogni match.<br />Un'unica <span>visione.</span></h1>
      <p>Organizza tornei, gestisci i giocatori e segui ogni risultato da un solo posto.</p>
    </div>

    <div class="court-card">
      <!-- Section: Court -->
      <CourtRally />
    </div>
    <p class="showcase-footer">Tennis League Administration</p>
  </aside>
</template>

<style scoped>
.auth-showcase { --showcase-main: var(--color-showcase-grass); --showcase-deep: var(--color-sidebar-start); --showcase-accent: var(--color-showcase-grass-accent); position: relative; flex-direction: column; overflow: hidden; padding: clamp(2rem, 4vw, 3.5rem); background: linear-gradient(180deg, var(--color-sidebar-start) 0%, var(--color-sidebar-end) 100%); color: var(--color-white); }
.brand { display: flex; align-items: center; gap: 0.7rem; font-size: 1.35rem; font-weight: 800; letter-spacing: -0.04em; }
.brand-ball { position: relative; width: 2rem; height: 2rem; overflow: hidden; border-radius: 50%; background: var(--showcase-accent); box-shadow: 0 5px 15px rgb(var(--color-black-rgb) / 16%); }
.brand-ball::before, .brand-ball::after { position: absolute; width: 1.5rem; height: 2.25rem; border: 1.5px solid var(--showcase-deep); border-radius: 50%; content: ''; }
.brand-ball::before { left: -1rem; top: -0.15rem; }
.brand-ball::after { right: -1rem; bottom: -0.15rem; }
.showcase-copy { max-width: 480px; margin: auto 0 clamp(2.25rem, 5vh, 4rem); }
.kicker { margin: 0 0 1rem; color: rgb(var(--color-white-rgb) / 65%); font-size: 0.75rem; font-weight: 800; letter-spacing: 0.16em; }
.showcase-copy h1 { margin: 0; font-size: clamp(2.7rem, 5vw, 4.4rem); line-height: 0.98; letter-spacing: -0.06em; }
.showcase-copy h1 span { color: var(--showcase-accent); }
.showcase-copy > p:last-child { max-width: 430px; margin: 1.5rem 0 0; color: rgb(var(--color-white-rgb) / 72%); line-height: 1.65; }
.court-card { width: min(440px, 100%); margin-inline: auto; }
.showcase-footer { margin: 1.5rem 0 0; color: rgb(var(--color-white-rgb) / 40%); font-size: 0.7rem; }
</style>
