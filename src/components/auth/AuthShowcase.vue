<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

type ShowcaseTheme = 'grass' | 'hard' | 'clay'

const themes: ShowcaseTheme[] = ['grass', 'hard', 'clay']
const activeTheme = ref<ShowcaseTheme>('grass')
let rotationTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  rotationTimer = setInterval(() => {
    const currentIndex = themes.indexOf(activeTheme.value)
    activeTheme.value = themes[(currentIndex + 1) % themes.length]!
  }, 2000)
})

onBeforeUnmount(() => {
  if (rotationTimer) clearInterval(rotationTimer)
})
</script>

<template>
  <aside class="auth-showcase" :class="`showcase-${activeTheme}`" aria-hidden="true">
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
</template>

<style scoped>
.auth-showcase { --showcase-main: var(--color-showcase-grass); --showcase-deep: var(--color-showcase-grass-deep); --showcase-accent: var(--color-showcase-grass-accent); position: relative; display: flex; flex-direction: column; overflow: hidden; padding: clamp(2rem, 4vw, 3.5rem); background: var(--showcase-deep); color: var(--color-white); transition: background-color 700ms ease; }
.showcase-hard { --showcase-main: var(--color-showcase-hard); --showcase-deep: var(--color-showcase-hard-deep); --showcase-accent: var(--color-showcase-hard-accent); }
.showcase-clay { --showcase-main: var(--color-showcase-clay); --showcase-deep: var(--color-showcase-clay-deep); --showcase-accent: var(--color-showcase-clay-accent); }
.brand { display: flex; align-items: center; gap: 0.7rem; font-size: 1.35rem; font-weight: 800; letter-spacing: -0.04em; }
.brand-ball { position: relative; width: 2rem; height: 2rem; overflow: hidden; border-radius: 50%; background: var(--showcase-accent); box-shadow: 0 5px 15px rgb(var(--color-black-rgb) / 16%); transition: background-color 700ms ease; }
.brand-ball::before, .brand-ball::after { position: absolute; width: 1.5rem; height: 2.25rem; border: 1.5px solid var(--showcase-deep); border-radius: 50%; content: ''; }
.brand-ball::before { left: -1rem; top: -0.15rem; }
.brand-ball::after { right: -1rem; bottom: -0.15rem; }
.showcase-copy { max-width: 480px; margin: auto 0 clamp(2.25rem, 5vh, 4rem); }
.kicker { margin: 0 0 1rem; color: rgb(var(--color-white-rgb) / 65%); font-size: 0.75rem; font-weight: 800; letter-spacing: 0.16em; }
.showcase-copy h1 { margin: 0; font-size: clamp(2.7rem, 5vw, 4.4rem); line-height: 0.98; letter-spacing: -0.06em; }
.showcase-copy h1 span { color: var(--showcase-accent); transition: color 700ms ease; }
.showcase-copy > p:last-child { max-width: 430px; margin: 1.5rem 0 0; color: rgb(var(--color-white-rgb) / 72%); line-height: 1.65; }
.court-card { width: min(390px, 100%); padding: 0.7rem; border: 1px solid rgb(var(--color-white-rgb) / 16%); background: rgb(var(--color-white-rgb) / 9%); box-shadow: 0 20px 40px rgb(var(--color-black-rgb) / 16%); }
.court { position: relative; height: 105px; overflow: hidden; border: 1px solid rgb(var(--color-white-rgb) / 55%); background: var(--showcase-main); transition: background-color 700ms ease; }
.court::before { position: absolute; inset: 18px 0; border-block: 1px solid rgb(var(--color-white-rgb) / 55%); content: ''; }
.court::after { position: absolute; top: 18px; bottom: 18px; left: 50%; border-left: 1px solid rgb(var(--color-white-rgb) / 55%); content: ''; }
.net { position: absolute; z-index: 1; inset: 50% 0 auto; border-top: 2px solid rgb(var(--color-white-rgb) / 85%); }
.ball { position: absolute; z-index: 2; top: 25%; right: 24%; width: 11px; height: 11px; background: var(--showcase-accent); box-shadow: 0 4px 8px rgb(var(--color-black-rgb) / 25%); transition: background-color 700ms ease; }
.court-info { display: flex; align-items: center; justify-content: space-between; padding: 0.8rem 0.25rem 0.2rem; }
.court-info div { display: grid; gap: 0.15rem; }
.court-info strong { font-size: 0.78rem; }
.court-info small { color: rgb(var(--color-white-rgb) / 60%); font-size: 0.68rem; }
.live { display: flex; align-items: center; gap: 0.35rem; padding: 0.32rem 0.5rem; background: rgb(var(--color-black-rgb) / 18%); color: rgb(var(--color-white-rgb) / 78%); font-size: 0.61rem; font-weight: 800; letter-spacing: 0.08em; }
.live i { width: 6px; height: 6px; background: var(--showcase-accent); transition: background-color 700ms ease; }
.showcase-footer { margin: 1.5rem 0 0; color: rgb(var(--color-white-rgb) / 40%); font-size: 0.7rem; }
@media (prefers-reduced-motion: reduce) { .auth-showcase, .brand-ball, .showcase-copy h1 span, .court, .ball, .live i { transition: none; } }
</style>
