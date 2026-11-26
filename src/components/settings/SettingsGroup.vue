<script setup lang="ts">
// A titled group of settings rows rendered as a single divided card, so pages
// avoid nesting cards inside cards.
defineProps<{
  title: string
  description?: string
}>()
</script>

<template>
  <section class="grid gap-2.5">
    <div class="flex items-end justify-between gap-3 px-1">
      <div class="min-w-0">
        <h2 class="text-xs font-extrabold tracking-[0.14em] text-(--color-text-subtle) uppercase">{{ title }}</h2>
        <p v-if="description" class="mt-1 text-sm text-(--color-text-muted)">{{ description }}</p>
      </div>
      <slot name="actions" />
    </div>
    <div class="divide-y divide-(--color-border) overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-card)">
      <slot />
    </div>
  </section>
</template>
