<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  icon: string
  hint?: string
}>()
</script>

<template>
  <article class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-3 rounded-xl border border-(--color-border) bg-(--color-surface-card) p-3.5 sm:p-4">
    <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-(--color-surface-soft) text-primary sm:size-11" aria-hidden="true">
      <i :class="icon" />
    </span>
    <div class="min-w-0">
      <small class="block truncate text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-(--color-text-subtle)">{{ label }}</small>
      <div class="mt-0.5 flex min-w-0 items-baseline gap-2">
        <strong class="text-xl leading-none tracking-tight text-color sm:text-2xl">{{ value }}</strong>
        <span v-if="hint" class="truncate text-[0.7rem] text-(--color-text-muted)">{{ hint }}</span>
      </div>
    </div>
  </article>
</template>
