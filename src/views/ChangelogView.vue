<script setup lang="ts">
import { computed, ref } from 'vue'
import moment from 'moment'
import 'moment/locale/it.js'
import Button from 'primevue/button'
import Tag from 'primevue/tag'
import PageHeader from '@/components/layout/PageHeader.vue'
import { changelogEntries, type ChangelogKind } from '@/data/changelog'

interface ChangelogFilter {
  label: string
  value: ChangelogKind | 'all'
}

// -----------------------------------------------------------------------------
// Filter configuration and local state
// Keeping the options declarative makes the filter controls and filtering logic
// share the same ChangelogKind values.
// -----------------------------------------------------------------------------
const activeFilter = ref<ChangelogKind | 'all'>('all')
const filters: ChangelogFilter[] = [
  { label: 'Tutti', value: 'all' },
  { label: 'Novità', value: 'feature' },
  { label: 'Miglioramenti', value: 'improvement' },
  { label: 'Correzioni', value: 'fix' },
]
const labelsByKind: Record<ChangelogKind, string> = {
  feature: 'Novità',
  improvement: 'Miglioramento',
  fix: 'Correzione',
}
const severitiesByKind: Record<ChangelogKind, 'success' | 'info' | 'warn'> = {
  feature: 'success',
  improvement: 'info',
  fix: 'warn',
}

// -----------------------------------------------------------------------------
// Visible timeline entries
// The source data remains immutable; switching filters only derives a new list
// for presentation.
// -----------------------------------------------------------------------------
const visibleEntries = computed(() =>
  activeFilter.value === 'all'
    ? changelogEntries
    : changelogEntries.filter((entry) => entry.kind === activeFilter.value),
)

// -----------------------------------------------------------------------------
// Presentation helpers
// Labels and PrimeVue severities are centralized so every entry uses the same
// visual language for a given change kind.
// -----------------------------------------------------------------------------
function kindLabel(kind: ChangelogKind): string {
  return labelsByKind[kind]
}

function kindSeverity(kind: ChangelogKind): 'success' | 'info' | 'warn' {
  return severitiesByKind[kind]
}

function formatDate(date: string): string {
  const parsedDate = moment(date, 'YYYY-MM-DD', true)
  return parsedDate.isValid() ? parsedDate.locale('it').format('D MMMM YYYY') : date
}
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <section class="mx-auto flex w-full max-w-220 flex-col gap-7 pb-12 pt-4 sm:pt-8">
    <!------------------------------>
    <!-- Section: Header -->
    <!------------------------------>
    <PageHeader
      eyebrow="AGGIORNAMENTI"
      title="Changelog"
      description="Le novità che rendono TLA più utile per organizzare tornei e community sportive."
    />

    <!------------------------------>
    <!-- Section: Change filters -->
    <!------------------------------>
    <div class="flex flex-wrap gap-2" aria-label="Filtra aggiornamenti">
      <Button
        v-for="filter in filters"
        :key="filter.value"
        class="rounded-none"
        :label="filter.label"
        size="small"
        :severity="activeFilter === filter.value ? 'primary' : 'secondary'"
        :outlined="activeFilter !== filter.value"
        :aria-pressed="activeFilter === filter.value"
        @click="activeFilter = filter.value"
      />
    </div>

    <!------------------------------>
    <!-- Section: Changes timeline -->
    <!------------------------------>
    <div class="relative grid gap-5">
      <!-- A real element replaces the former CSS pseudo-element timeline. -->
      <span
        class="absolute bottom-2 left-1.5 top-2 w-px bg-(--color-border) md:left-[10.35rem]"
        aria-hidden="true"
      />

      <article
        v-for="entry in visibleEntries"
        :key="`${entry.date}-${entry.title}`"
        class="relative grid gap-1.5 pl-6 md:grid-cols-[10rem_minmax(0,1fr)] md:gap-4 md:pl-0"
      >
        <!-- Timeline marker -->
        <span
          class="absolute left-0 top-1 size-3 rounded-full border-3 border-(--color-surface-page) bg-primary-500 ring-1 ring-primary-500 md:left-[10.35rem] md:-translate-x-1/2"
          aria-hidden="true"
        />

        <time
          class="pt-0.5 text-xs text-(--color-text-muted) md:text-right"
          :datetime="entry.date"
        >
          {{ formatDate(entry.date) }}
        </time>

        <!-- Change card -->
        <div
          class="border border-(--color-border) bg-(--color-surface-card) p-4 shadow-[0_12px_28px_rgb(var(--color-shadow-rgb)/5%)] sm:px-5 sm:py-4.5"
        >
          <div class="flex items-center justify-between gap-3">
            <Tag :value="kindLabel(entry.kind)" :severity="kindSeverity(entry.kind)" />
            <span class="text-xs font-bold text-(--color-text-muted)">{{ entry.version }}</span>
          </div>

          <h2 class="mb-1.5 mt-3 text-xl font-bold tracking-tight text-(--color-text)">
            {{ entry.title }}
          </h2>
          <p class="leading-relaxed text-(--color-text-muted)">
            {{ entry.description }}
          </p>

          <ul class="mt-3 grid list-disc gap-1.5 pl-5 text-sm text-(--color-text-muted)">
            <li v-for="item in entry.items" :key="item">{{ item }}</li>
          </ul>
        </div>
      </article>
    </div>
  </section>
</template>
