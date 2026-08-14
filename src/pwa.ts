import { ref } from 'vue'
import { registerSW } from 'virtual:pwa-register'

export const pwaOfflineReady = ref(false)

registerSW({
  immediate: true,
  onOfflineReady() {
    pwaOfflineReady.value = true
  },
})
