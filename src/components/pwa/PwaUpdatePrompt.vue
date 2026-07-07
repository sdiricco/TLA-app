<script setup lang="ts">
import { useRegisterSW } from 'virtual:pwa-register/vue'

const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW()

function close(): void {
  needRefresh.value = false
  offlineReady.value = false
}
</script>

<template>
  <Transition name="pwa-notice">
    <aside v-if="needRefresh || offlineReady" class="pwa-notice" role="status" aria-live="polite">
      <div>
        <strong>{{ needRefresh ? 'Aggiornamento disponibile' : 'App pronta offline' }}</strong>
        <p>
          {{
            needRefresh
              ? 'È disponibile una nuova versione di TLA.'
              : 'L’interfaccia può essere riaperta anche senza connessione.'
          }}
        </p>
      </div>

      <div class="pwa-notice__actions">
        <button v-if="needRefresh" type="button" class="pwa-notice__update" @click="updateServiceWorker()">
          Aggiorna
        </button>
        <button type="button" class="pwa-notice__close" aria-label="Chiudi notifica" @click="close">
          <i class="pi pi-times" aria-hidden="true" />
        </button>
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
.pwa-notice button { min-height: 2.5rem; border: 0; border-radius: 0.65rem; cursor: pointer; }
.pwa-notice__update { padding: 0 0.85rem; color: #fff; background: var(--color-primary-700); font-weight: 700; }
.pwa-notice__close { width: 2.5rem; color: var(--color-text-muted); background: transparent; }
.pwa-notice button:focus-visible { outline: 3px solid color-mix(in srgb, var(--color-primary-500) 35%, transparent); outline-offset: 2px; }
.pwa-notice-enter-active, .pwa-notice-leave-active { transition: opacity 180ms ease, transform 180ms ease; }
.pwa-notice-enter-from, .pwa-notice-leave-to { opacity: 0; transform: translateY(0.75rem); }

@media (max-width: 767px) {
  .pwa-notice { right: 0.75rem; bottom: calc(0.75rem + env(safe-area-inset-bottom)); width: calc(100vw - 1.5rem); }
}
</style>
