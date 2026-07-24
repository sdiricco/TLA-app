<script setup lang="ts">
  // Vue, PrimeVue components and local types
  import { computed } from 'vue'
  import Card from 'primevue/card'
  import type { TournamentFormat } from '@/types'
  import type { TournamentFormatOption } from './tournamentForm'

  /**
   * Public component contract
   */
  const props = defineProps<{ options: TournamentFormatOption[] }>()
  defineEmits<{ select: [format: TournamentFormat] }>()

  const selectableOptions = computed(() => props.options.filter((option) => option.selectable))
</script>

<template>
  <!------------------------------>
  <!-- Section: Tournament formats -->
  <!------------------------------>
  <div class="grid gap-5">
    <div class="grid gap-2">
      <p class="text-sm text-muted-color">
        Scegli come verranno organizzati incontri e classifica.
      </p>

      <div class="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Formato torneo">
        <Card
          v-for="option in selectableOptions"
          :key="option.format"
          role="radio"
          :aria-checked="option.selected"
          tabindex="0"
          class="cursor-pointer overflow-hidden rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/20"
          :class="
            option.selected
              ? 'border-primary-500 bg-primary-50'
              : 'border-(--color-border) bg-(--color-surface-card) hover:border-primary-300'
          "
          :pt="{
            body: { class: 'h-full p-0!' },
            content: { class: 'h-full' },
          }"
          @click="$emit('select', option.format)"
          @keydown.enter="$emit('select', option.format)"
          @keydown.space.prevent="$emit('select', option.format)"
        >
          <template #content>
            <div class="flex h-full items-start gap-3 p-4">
              <span
                class="grid size-11 shrink-0 place-items-center rounded-lg"
                :class="option.selected ? 'bg-primary-100 text-primary' : 'bg-surface-100 text-muted-color'"
                aria-hidden="true"
              >
                <i :class="[option.icon, 'text-lg']" />
              </span>

              <div class="min-w-0 flex-1">
                <div class="flex items-start justify-between gap-3">
                  <h3 class="font-bold text-color">{{ option.title }}</h3>
                  <span
                    class="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border"
                    :class="
                      option.selected
                        ? 'border-primary-500 bg-primary-500 text-white'
                        : 'border-(--color-border-strong) bg-(--color-surface-card)'
                    "
                    aria-hidden="true"
                  >
                    <i v-if="option.selected" class="pi pi-check text-[0.65rem]" />
                  </span>
                </div>
                <p class="mt-1.5 text-sm leading-relaxed text-muted-color">
                  {{ option.description }}
                </p>
              </div>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </div>
</template>
