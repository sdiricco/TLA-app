import { createApp } from 'vue';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import ConfirmationService from 'primevue/confirmationservice';
import ToastService from 'primevue/toastservice';
import { Icon } from '@iconify/vue';
import { definePreset } from '@primeuix/themes';
import Lara from '@primeuix/themes/lara';
import 'primeicons/primeicons.css';
import './style.css';
import App from './App.vue';
import router from './router';

const TlaLara = definePreset(Lara, {
  semantic: {
    primary: {
      50: '#edf8f4',
      100: '#d4eee4',
      200: '#a9deca',
      300: '#72c7aa',
      400: '#38a886',
      500: '#075b46',
      600: '#064e3b',
      700: '#063b30',
      800: '#052f27',
      900: '#04261f',
      950: '#021713',
    },
  },
  components: {
    button: {
      colorScheme: {
        light: {
          root: {
            secondary: {
              background: '{surface.100}',
              hoverBackground: '{surface.200}',
              activeBackground: '{surface.300}',
              borderColor: '{surface.300}',
              hoverBorderColor: '{surface.400}',
              activeBorderColor: '{surface.500}',
              color: '{surface.700}',
              hoverColor: '{surface.800}',
              activeColor: '{surface.900}',
            },
          },
          outlined: {
            secondary: {
              hoverBackground: '{surface.50}',
              activeBackground: '{surface.100}',
              borderColor: '{surface.300}',
              color: '{surface.700}',
            },
          },
          text: {
            secondary: {
              hoverBackground: '{surface.100}',
              activeBackground: '{surface.200}',
              color: '{surface.700}',
            },
          },
        },
      },
    },
    card: {
      root: {
        shadow: 'none',
      },
    },
  },
});

async function enableMocking(): Promise<void> {
  if (
    import.meta.env.PROD ||
    import.meta.env.VITE_DISABLE_MSW === 'true' ||
    import.meta.env.VITE_API_URL
  ) {
    return;
  }
  const { worker } = await import('./mocks/browser');
  await worker.start({ onUnhandledRequest: 'bypass' });
}

await enableMocking();

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(PrimeVue, {
  theme: {
    preset: TlaLara,
    options: {
      darkModeSelector: '.app-dark',
      cssLayer: {
        name: 'primevue',
        order: 'theme, base, primevue',
      },
    },
  },
});
app.use(ConfirmationService);
app.use(ToastService);
app.component('IconifyIcon', Icon);

app.mount('#app');
