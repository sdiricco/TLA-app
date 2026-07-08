import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.tla.app',
  appName: 'TLA',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    StatusBar: {
      style: 'dark',
      backgroundColor: '#064e3b',
      overlaysWebView: false,
    },
  },
}

export default config
