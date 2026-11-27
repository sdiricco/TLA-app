<script setup lang="ts">
import { RouterLink, type RouteLocationRaw } from 'vue-router'

defineProps<{
  label: string
  value: string | number
  icon: string
  hint?: string
  // When set, the whole card becomes a link to the related section.
  to?: RouteLocationRaw
  // Highlights indicators that ask the user to act.
  attention?: boolean
}>()
</script>

<template>
  <component
    :is="to ? RouterLink : 'article'"
    :to="to"
    class="group grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border bg-(--color-surface-card) p-3.5 text-inherit no-underline sm:p-4"
    :class="[
      attention ? 'border-amber-300' : 'border-(--color-border)',
      to ? 'transition-colors hover:border-primary hover:bg-(--color-surface-soft) focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary' : '',
    ]"
  >
    <span
      class="grid size-10 shrink-0 place-items-center rounded-lg sm:size-11"
      :class="attention ? 'bg-amber-50 text-amber-700' : 'bg-(--color-surface-soft) text-primary'"
      aria-hidden="true"
    >
      <i :class="icon" />
    </span>
    <div class="min-w-0">
      <small class="block truncate text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-(--color-text-subtle)">{{ label }}</small>
      <div class="mt-0.5 flex min-w-0 items-baseline gap-2">
        <strong class="text-xl leading-none tracking-tight text-color sm:text-2xl">{{ value }}</strong>
        <span v-if="hint" class="min-w-0 text-[0.7rem] leading-tight text-(--color-text-muted)">{{ hint }}</span>
      </div>
    </div>
    <i
      v-if="to"
      class="pi pi-chevron-right text-[0.65rem] text-(--color-text-subtle) transition-transform group-hover:translate-x-0.5"
      aria-hidden="true"
    />
  </component>
</template>
