export const pwaOptions = {
  registerType: 'autoUpdate' as const,
  injectRegister: null,
  includeAssets: ['favicon.svg', 'icons.svg'],
  manifest: {
    name: 'TLA - Tennis League App',
    short_name: 'TLA',
    description: 'Tornei, giocatori, tabelloni e risultati TLA.',
    theme_color: '#166534',
    background_color: '#f4f7f5',
    display: 'standalone' as const,
    orientation: 'portrait-primary' as const,
    start_url: '/',
    scope: '/',
    lang: 'it',
    categories: ['sports'],
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable' as const,
      },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
    cleanupOutdatedCaches: true,
    navigateFallback: '/index.html',
  },
}
