<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import TournamentListItem from '@/components/tournaments/TournamentListItem.vue'
import { organizersService } from '@/services/organizersApi'
import { useLayoutStore } from '@/stores/layout'
import type { OrganizerProfile } from '@/types'

const route = useRoute()
const router = useRouter()
const layout = useLayoutStore()
const organizer = ref<OrganizerProfile | null>(null)
const loading = ref(true)
const error = ref('')

const initials = computed(() => (organizer.value?.name ?? '')
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase() ?? '')
  .join(''))

async function loadOrganizer(): Promise<void> {
  loading.value = true
  error.value = ''
  try {
    organizer.value = await organizersService.getById(String(route.params['id']))
    layout.setTopbarContext({
      title: organizer.value.name,
      backTo: '/tournaments',
      backLabel: 'Torna ai tornei',
    })
  } catch {
    organizer.value = null
    error.value = 'Questa scheda organizzatore non è disponibile.'
    layout.setTopbarContext({
      title: 'Organizzatore',
      backTo: '/tournaments',
      backLabel: 'Torna ai tornei',
    })
  } finally {
    loading.value = false
  }
}

watch(() => route.params['id'], loadOrganizer, { immediate: true })
onBeforeUnmount(() => layout.clearTopbarContext())
</script>

<template>
  <div class="mx-auto flex w-full max-w-screen-2xl flex-col gap-4 text-(--color-text) sm:gap-5">
    <!-- Section: Loading organizer -->
    <section v-if="loading" class="grid gap-4">
      <div class="flex items-center gap-4 rounded-xl bg-linear-to-b from-(--color-sidebar-start) to-(--color-sidebar-end) p-5 sm:p-7">
        <Skeleton shape="circle" size="5rem" />
        <div class="grid flex-1 gap-3"><Skeleton width="8rem" /><Skeleton width="16rem" height="2.5rem" /></div>
      </div>
      <Skeleton v-for="index in 3" :key="index" height="8rem" border-radius="0.75rem" />
    </section>

    <!-- Section: Missing organizer -->
    <section v-else-if="!organizer" class="grid min-h-72 place-items-center rounded-xl border border-dashed border-(--color-border) bg-(--color-surface-card) p-6 text-center">
      <div>
        <span class="mx-auto grid size-14 place-items-center rounded-full bg-primary-50 text-xl text-primary"><i class="pi pi-user-minus" /></span>
        <h1 class="mt-4 text-xl font-bold">Organizzatore non trovato</h1>
        <p class="mt-1 text-sm text-(--color-text-muted)">{{ error }}</p>
        <Button class="mt-5" label="Torna ai tornei" icon="pi pi-arrow-left" severity="secondary" outlined @click="router.push({ name: 'tournaments' })" />
      </div>
    </section>

    <template v-else>
      <!-- Section: Organizer identity -->
      <section class="overflow-hidden rounded-xl bg-linear-to-b from-(--color-sidebar-start) to-(--color-sidebar-end) p-5 text-white sm:p-7 lg:p-8">
        <div class="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex min-w-0 items-center gap-4 sm:gap-5">
            <Avatar :label="initials" :image="organizer.photo_url ?? undefined" shape="circle" class="size-20! shrink-0 ring-4 ring-white/10 sm:size-24!" />
            <div class="min-w-0">
              <p class="text-xs font-extrabold tracking-[0.16em] text-(--color-accent)">ORGANIZZATORE</p>
              <h1 class="mt-2 truncate text-2xl font-bold tracking-tight sm:text-4xl" :title="organizer.name">{{ organizer.name }}</h1>
              <p class="mt-2 text-sm text-white/60">{{ organizer.tournaments_count }} {{ organizer.tournaments_count === 1 ? 'torneo organizzato' : 'tornei organizzati' }}</p>
            </div>
          </div>
          <Button v-if="organizer.player_id" label="Vedi profilo giocatore" icon="pi pi-user" severity="secondary" class="w-full shrink-0 sm:w-auto" @click="router.push({ name: 'player-detail', params: { id: organizer.player_id } })" />
        </div>
      </section>

      <!-- Section: Organized tournaments -->
      <section class="grid gap-3" aria-labelledby="organized-tournaments-title">
        <header>
          <p class="text-xs font-extrabold tracking-[0.16em] text-primary">ATTIVITÀ</p>
          <h2 id="organized-tournaments-title" class="mt-1 text-xl font-bold tracking-tight sm:text-2xl">Tornei organizzati</h2>
        </header>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <TournamentListItem
            v-for="tournament in organizer.tournaments"
            :key="tournament.id"
            :tournament="tournament"
            @open="router.push({ name: 'tournament-detail', params: { id: tournament.id } })"
          />
        </div>
      </section>
    </template>
  </div>
</template>
