import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath } from 'node:url'
import { pwaOptions } from './src/config/pwa'

const srcPath = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: '@', replacement: srcPath },
      // Resolve Moment to its ESM build so the locale files (which import
      // '../moment') share the same instance; with the default UMD entry the
      // dependency optimizer bundled a separate copy and locales never applied.
      { find: /^moment$/, replacement: 'moment/dist/moment.js' },
    ],
  },
  plugins: [
    tailwindcss(),
    vue(),
    VitePWA(pwaOptions),
  ],
})
