<script setup lang="ts">
import { useThemeStore } from './stores/theme'
import PwaUpdatePrompt from './components/pwa/PwaUpdatePrompt.vue'

useThemeStore()
</script>

<template>
  <RouterView />
  <PwaUpdatePrompt />
</template>
