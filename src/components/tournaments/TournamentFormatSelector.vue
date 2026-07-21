<script setup lang="ts">
  // PrimeVue components and local types
  import Card from 'primevue/card'
  import Tag from 'primevue/tag'
  import type { TournamentFormat } from '@/types'
  import type { TournamentFormatOption } from './tournamentForm'

  /**
   * Public component contract
   */
  defineProps<{ options: TournamentFormatOption[] }>()
  defineEmits<{ select: [format: TournamentFormat] }>()
</script>

<template>
  <!------------------------------>
  <!-- Section: Tournament formats -->
  <!------------------------------>
  <div class="grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Formato torneo">
    <Card
      v-for="option in options"
      :key="option.format"
      class="overflow-hidden rounded-none border transition-colors duration-150"
      :class="[
        option.selectable ? 'cursor-pointer' : 'cursor-not-allowed',
        option.selected
          ? 'border-primary-300 bg-primary-50/60 shadow-sm'
          : 'border-surface-200',
        option.selectable
          ? 'hover:border-primary-200 hover:bg-surface-50'
          : 'opacity-60 grayscale',
      ]"
      :pt="{
        body: { class: 'h-full p-4' },
        content: { class: 'h-full p-0' },
      }"
      role="radio"
      :aria-checked="option.selected"
      :aria-disabled="!option.selectable"
      :tabindex="option.selectable ? 0 : -1"
      @click="option.selectable && $emit('select', option.format)"
      @keydown.enter="option.selectable && $emit('select', option.format)"
      @keydown.space.prevent="option.selectable && $emit('select', option.format)"
    >
      <template #content>
        <div class="flex h-full flex-col gap-3">
          <div class="flex items-start justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <div
                class="flex size-11 shrink-0 items-center justify-center"
                :class="
                  option.selected
                    ? 'bg-primary-100 text-primary-600'
                    : 'bg-surface-100 text-muted-color'
                "
              >
                <i :class="[option.icon, 'text-lg']" />
              </div>
              <div class="min-w-0">
                <h3 class="text-base font-semibold">{{ option.title }}</h3>
                <p class="mt-1 text-sm leading-relaxed text-muted-color">
                  {{ option.description }}
                </p>
              </div>
            </div>
            <Tag
              :value="
                option.selectable
                  ? option.selected
                    ? 'Selezionato'
                    : 'Disponibile'
                  : 'Coming soon'
              "
              :severity="
                option.selectable ? (option.selected ? 'success' : 'info') : 'secondary'
              "
            />
          </div>

          <div class="mt-auto flex items-center justify-between gap-3 pt-1 text-sm">
            <span class="text-muted-color">
              {{ option.selectable ? 'Puoi selezionarlo ora' : 'Bloccato per il momento' }}
            </span>
            <span v-if="option.selected" class="font-semibold text-primary-600">Attivo</span>
          </div>
        </div>
      </template>
    </Card>
  </div>
</template>
