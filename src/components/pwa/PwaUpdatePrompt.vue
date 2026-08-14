<script setup lang="ts">
import Button from 'primevue/button'
import { pwaOfflineReady } from '@/pwa'

function close(): void {
  pwaOfflineReady.value = false
}
</script>

<template>
  <Transition name="pwa-notice">
    <aside v-if="pwaOfflineReady" class="pwa-notice" role="status" aria-live="polite">
      <div>
        <strong>App pronta offline</strong>
        <p>L’interfaccia può essere riaperta anche senza connessione.</p>
      </div>

      <div class="pwa-notice__actions">
        <Button icon="pi pi-times" severity="secondary" text rounded aria-label="Chiudi notifica" @click="close" />
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
.pwa-notice {
  position: fixed;
  right: 1rem;
  bottom: calc(1rem + env(safe-area-inset-bottom));
  z-index: 1100;
  display: flex;
  align-items: center;
  gap: 1rem;
  width: min(26rem, calc(100vw - 2rem));
  padding: 0.9rem 1rem;
  color: var(--color-text);
  background: var(--color-surface-card);
  border: 1px solid var(--color-border);
  border-radius: 0.9rem;
  box-shadow: 0 1rem 2.5rem rgb(15 23 42 / 18%);
}

.pwa-notice strong { display: block; font-size: 0.95rem; }
.pwa-notice p { margin: 0.2rem 0 0; color: var(--color-text-muted); font-size: 0.82rem; }
.pwa-notice__actions { display: flex; align-items: center; gap: 0.35rem; margin-left: auto; }
.pwa-notice-enter-active, .pwa-notice-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.pwa-notice-enter-from, .pwa-notice-leave-to { opacity: 0; transform: translateY(0.75rem); }

@media (max-width: 767px) {
  .pwa-notice { right: 0.75rem; bottom: calc(0.75rem + env(safe-area-inset-bottom)); width: calc(100vw - 1.5rem); }
}
</style>
