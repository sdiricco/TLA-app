<script setup lang="ts" generic="T extends string">
// Segmented switch between two views of a draw (rounds/overview, schedule/
// standings). Wraps PrimeVue SelectButton so the checked option reads as a
// raised pill in both light and dark themes.
import SelectButton from 'primevue/selectbutton'

defineProps<{
  options: Array<{ label: string; value: T; icon: string }>
  ariaLabel: string
}>()

const model = defineModel<T>({ required: true })
</script>

<template>
  <SelectButton
    v-model="model"
    :options="options"
    option-label="label"
    option-value="value"
    :allow-empty="false"
    :aria-label="ariaLabel"
    class="gap-0.5! rounded-lg! bg-(--color-surface-soft)! p-0.5! [&_.p-togglebutton]:rounded-md! [&_.p-togglebutton]:border-0! [&_.p-togglebutton]:bg-transparent! [&_.p-togglebutton]:p-0! [&_.p-togglebutton-content]:rounded-md! [&_.p-togglebutton-content]:bg-transparent! [&_.p-togglebutton-content]:px-3! [&_.p-togglebutton-content]:py-1.5! [&_.p-togglebutton-content]:text-sm! [&_.p-togglebutton-content]:text-(--color-text-muted)! [&_.p-togglebutton-checked_.p-togglebutton-content]:bg-(--color-surface-card)! [&_.p-togglebutton-checked_.p-togglebutton-content]:font-semibold! [&_.p-togglebutton-checked_.p-togglebutton-content]:text-(--color-text)! [&_.p-togglebutton-checked_.p-togglebutton-content]:shadow-sm!"
  >
    <template #option="{ option }">
      <i :class="[option.icon, 'text-xs']" aria-hidden="true" />
      <span>{{ option.label }}</span>
    </template>
  </SelectButton>
</template>
