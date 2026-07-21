<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description?: string
}>()
</script>

<template>
  <header class="flex items-start justify-between gap-8 pt-0 sm:items-end sm:pt-1">
    <div class="min-w-0 flex-1">
      <p
        v-if="eyebrow"
        class="mb-2 hidden text-xs font-extrabold tracking-[0.16em] text-primary-700 sm:block"
      >
        {{ eyebrow }}
      </p>
      <h1 class="truncate text-3xl font-bold leading-tight tracking-tighter sm:text-4xl lg:text-5xl">
        {{ title }}
      </h1>
      <p v-if="description" class="mt-3 hidden text-sm text-(--color-text-muted) md:block">
        {{ description }}
      </p>
    </div>
    <slot />
  </header>
</template>
