<script setup lang="ts">
import { computed, ref } from 'vue'
import Tag from 'primevue/tag'
import { changelogEntries, type ChangelogKind } from '../data/changelog'

const activeFilter = ref<ChangelogKind | 'all'>('all')

const filters: Array<{ label: string; value: ChangelogKind | 'all' }> = [
  { label: 'Tutti', value: 'all' },
  { label: 'Novità', value: 'feature' },
  { label: 'Miglioramenti', value: 'improvement' },
  { label: 'Correzioni', value: 'fix' },
]

const visibleEntries = computed(() => activeFilter.value === 'all'
  ? changelogEntries
  : changelogEntries.filter(entry => entry.kind === activeFilter.value))

function kindLabel(kind: ChangelogKind): string {
  return kind === 'feature' ? 'Novità' : kind === 'improvement' ? 'Miglioramento' : 'Correzione'
}

function kindSeverity(kind: ChangelogKind): 'success' | 'info' | 'warn' {
  return kind === 'feature' ? 'success' : kind === 'improvement' ? 'info' : 'warn'
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${date}T12:00:00`))
}
</script>

<template>
  <section class="changelog-page">
    <header class="changelog-header">
      <p class="eyebrow">AGGIORNAMENTI</p>
      <h1>Changelog</h1>
      <p>Le novità che rendono TLA più utile per organizzare tornei e community sportive.</p>
    </header>

    <div class="filter-row" aria-label="Filtra aggiornamenti">
      <button
        v-for="filter in filters"
        :key="filter.value"
        type="button"
        class="filter-button"
        :class="{ active: activeFilter === filter.value }"
        @click="activeFilter = filter.value"
      >
        {{ filter.label }}
      </button>
    </div>

    <div class="timeline">
      <article v-for="entry in visibleEntries" :key="`${entry.date}-${entry.title}`" class="changelog-entry">
        <div class="timeline-marker"><span /></div>
        <div class="entry-date">{{ formatDate(entry.date) }}</div>
        <div class="entry-card">
          <div class="entry-topline">
            <Tag :value="kindLabel(entry.kind)" :severity="kindSeverity(entry.kind)" />
            <span class="entry-version">{{ entry.version }}</span>
          </div>
          <h2>{{ entry.title }}</h2>
          <p>{{ entry.description }}</p>
          <ul>
            <li v-for="item in entry.items" :key="item">{{ item }}</li>
          </ul>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.changelog-page { width: min(880px, 100%); margin: 0 auto; padding: clamp(1rem, 3vw, 2.5rem) 0 3rem; }
.changelog-header { max-width: 620px; margin-bottom: 1.75rem; }
.eyebrow { margin: 0 0 .55rem; color: var(--color-primary-700); font-size: .72rem; font-weight: 850; letter-spacing: .15em; }
h1 { margin: 0; color: var(--color-text); font-size: clamp(2rem, 5vw, 3.2rem); letter-spacing: -.055em; }
.changelog-header > p:last-child { margin: .7rem 0 0; color: var(--color-text-muted); line-height: 1.55; }
.filter-row { display: flex; flex-wrap: wrap; gap: .45rem; margin-bottom: 2rem; }
.filter-button { padding: .55rem .8rem; border: 1px solid var(--color-border); background: var(--color-surface-card); color: var(--color-text-muted); cursor: pointer; font: inherit; font-size: .78rem; font-weight: 750; }
.filter-button.active { border-color: var(--color-primary-500); background: rgb(var(--color-primary-500-rgb) / 12%); color: var(--color-primary-700); }
.timeline { display: grid; gap: 1.35rem; }
.changelog-entry { position: relative; display: grid; grid-template-columns: 10rem minmax(0, 1fr); gap: 1rem; }
.timeline-marker { position: absolute; top: .2rem; left: 10.35rem; display: grid; width: .8rem; height: .8rem; place-items: center; border: 3px solid var(--color-surface-page); border-radius: 50%; background: var(--color-primary-500); box-shadow: 0 0 0 1px var(--color-primary-500); transform: translateX(-50%); }
.entry-date { padding-top: .15rem; color: var(--color-text-muted); font-size: .78rem; text-align: right; }
.entry-card { padding: 1.15rem 1.25rem; border: 1px solid var(--color-border); background: var(--color-surface-card); box-shadow: 0 12px 28px rgb(var(--color-shadow-rgb) / 5%); }
.entry-card h2 { margin: .8rem 0 .35rem; color: var(--color-text); font-size: 1.25rem; letter-spacing: -.025em; }
.entry-card p { margin: 0; color: var(--color-text-muted); line-height: 1.5; }
.entry-card ul { display: grid; gap: .35rem; margin: .9rem 0 0; padding-left: 1.1rem; color: var(--color-text-muted); font-size: .86rem; }
.entry-topline { display: flex; align-items: center; justify-content: space-between; gap: .75rem; }
.entry-version { color: var(--color-text-muted); font-size: .72rem; font-weight: 700; }
@media (min-width: 681px) { .timeline { position: relative; } .timeline::before { position: absolute; top: .2rem; bottom: .2rem; left: 10.35rem; width: 1px; background: var(--color-border); content: ''; } }
@media (max-width: 680px) { .changelog-entry { grid-template-columns: 1fr; gap: .35rem; padding-left: 1rem; } .timeline-marker { top: .2rem; left: 0; } .entry-date { text-align: left; font-size: .74rem; } .entry-card { padding: 1rem; } }
</style>
