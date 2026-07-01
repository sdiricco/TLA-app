import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

const srcPath = fileURLToPath(new URL('./src', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': srcPath,
    },
  },
  plugins: [tailwindcss(), vue()],
})
