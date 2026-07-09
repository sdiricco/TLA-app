import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import ConfirmationService from 'primevue/confirmationservice'
import ToastService from 'primevue/toastservice'
import { Icon } from '@iconify/vue'
import Nora from '@primeuix/themes/nora'
import 'primeicons/primeicons.css'
import './style.css'
import App from './App.vue'
import router from './router'

async function enableMocking(): Promise<void> {
  if (
    import.meta.env.PROD ||
    import.meta.env.VITE_DISABLE_MSW === 'true' ||
    import.meta.env.VITE_API_URL
  ) {
    return
  }
  const { worker } = await import('./mocks/browser')
  await worker.start({ onUnhandledRequest: 'bypass' })
}

await enableMocking()

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(PrimeVue, {
  theme: {
    preset: Nora,
    options: {
      darkModeSelector: '.app-dark',
      cssLayer: {
        name: 'primevue',
        order: 'theme, base, primevue',
      },
    },
  },
})
app.use(ConfirmationService)
app.use(ToastService)
app.component('IconifyIcon', Icon)

app.mount('#app')
