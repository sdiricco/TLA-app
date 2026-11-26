<script setup lang="ts">
import { useAuthStore } from './stores/auth'
import { useThemeStore } from './stores/theme'
import PwaUpdatePrompt from './components/pwa/PwaUpdatePrompt.vue'
import ImpersonationBanner from './components/layout/ImpersonationBanner.vue'

useThemeStore()
const auth = useAuthStore()
</script>

<template>
  <!-- The banner height is exposed so full-height layouts can shrink by it. -->
  <div class="contents" :style="auth.isImpersonating ? { '--impersonation-offset': '2.75rem' } : undefined">
    <ImpersonationBanner />
    <RouterView />
  </div>
  <PwaUpdatePrompt />
</template>
