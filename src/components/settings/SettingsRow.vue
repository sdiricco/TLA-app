<script setup lang="ts">
// One line of a SettingsGroup: icon, label and description on the left, the
// control (toggle, link, value) in the trailing slot. When `to` is set the
// whole row becomes a navigation link.
import type { RouteLocationRaw } from 'vue-router'

defineProps<{
  title: string
  description?: string
  icon?: string
  muted?: boolean
  to?: RouteLocationRaw
  labelFor?: string
}>()
</script>

<template>
  <component
    :is="to ? 'RouterLink' : 'div'"
    :to="to"
    class="flex items-center gap-3 px-4 py-3.5 text-(--color-text) no-underline sm:px-5"
    :class="to ? 'transition-colors hover:bg-(--color-surface-soft) focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500/35' : ''"
  >
    <span
      v-if="icon"
      class="grid size-9 shrink-0 place-items-center rounded-lg"
      :class="muted ? 'bg-(--color-surface-soft) text-(--color-text-subtle)' : 'bg-primary-50 text-primary'"
    >
      <i :class="icon" aria-hidden="true" />
    </span>
    <span class="min-w-0 flex-1">
      <component
        :is="labelFor ? 'label' : 'span'"
        :for="labelFor"
        class="block font-semibold"
        :class="[{ 'text-(--color-text-muted)': muted }, labelFor ? 'cursor-pointer' : '']"
      >
        {{ title }}
      </component>
      <span v-if="description" class="mt-0.5 block text-sm leading-snug text-(--color-text-muted)">{{ description }}</span>
    </span>
    <slot />
    <i v-if="to" class="pi pi-chevron-right text-xs text-(--color-text-subtle)" aria-hidden="true" />
  </component>
</template>
