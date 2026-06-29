<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../stores/auth'
import { usePlayersStore } from '../stores/players'
import type { Player } from '../types'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const store = usePlayersStore()
const toast = useToast()

const player = ref<Player | null>(null)
const loading = ref(true)

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatAge(birthDate: string | null | undefined): string {
  if (!birthDate) return 'Età non disponibile'
  const dob = new Date(birthDate)
  if (Number.isNaN(dob.getTime())) return 'Età non disponibile'
  const diff = Date.now() - dob.getTime()
  const ageDate = new Date(diff)
  return `${Math.abs(ageDate.getUTCFullYear() - 1970)} anni`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

async function loadPlayer(): Promise<void> {
  loading.value = true
  try {
    player.value = await store.getById(route.params['id'] as string)
  } catch {
    toast.add({ severity: 'error', summary: 'Errore', detail: 'Giocatore non trovato', life: 3000 })
    await router.push({ name: 'players' })
  } finally {
    loading.value = false
  }
}

watch(() => route.params['id'], loadPlayer, { immediate: true })

const fullName = computed(() => player.value?.name ?? '')
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 class="m-0 text-2xl">Profilo giocatore</h2>
        <p class="mt-1 mb-0 text-sm text-muted-color">Anagrafica personale e dati sportivi</p>
      </div>
      <div class="flex gap-2">
        <Button label="Torna ai giocatori" severity="secondary" outlined @click="router.push({ name: 'players' })" />
        <Button v-if="auth.isAdmin" label="Anagrafica" icon="pi pi-pencil" @click="router.push({ name: 'players' })" />
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-10">
      <i class="pi pi-spin pi-spinner text-[2rem] text-primary-500" />
    </div>

    <div v-else-if="!player" class="rounded-2xl border border-dashed border-surface-200 bg-surface-50 px-4 py-10 text-center text-muted-color">
      Giocatore non trovato.
    </div>

    <div v-else class="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <template #content>
          <div class="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div class="flex items-center justify-center">
              <Avatar
                :label="getInitials(player.name)"
                :image="player.photo_url ?? undefined"
                shape="circle"
                class="h-28 w-28 text-2xl"
              />
            </div>

            <div class="flex min-w-0 flex-1 flex-col gap-3">
              <div class="flex flex-wrap items-center gap-2">
                <Tag :value="`Rank ${player.ranking}`" severity="secondary" />
                <Tag v-if="player.birth_date" :value="formatAge(player.birth_date)" severity="info" />
              </div>
              <h3 class="m-0 text-3xl font-semibold">{{ fullName }}</h3>
              <p class="m-0 text-sm text-muted-color">
                <template v-if="player.club">{{ player.club }} · </template>
                Profilo giocatore
              </p>
            </div>
          </div>
        </template>
      </Card>

      <Card>
        <template #title>Dettagli</template>
        <template #content>
          <div class="flex flex-col gap-3 text-sm">
            <div class="flex items-center justify-between gap-3">
              <span class="text-muted-color">Data di nascita</span>
              <span class="font-medium">{{ formatDate(player.birth_date) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-muted-color">Età</span>
              <span class="font-medium">{{ formatAge(player.birth_date) }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-muted-color">Club</span>
              <span class="font-medium">{{ player.club ?? '—' }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-muted-color">Contatto</span>
              <span class="font-medium">{{ player.phone ?? '—' }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-muted-color">ID utente</span>
              <span class="font-medium">{{ player.user_id ?? '—' }}</span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span class="text-muted-color">Immagine profilo</span>
              <span class="font-medium break-all">{{ player.photo_url ?? '—' }}</span>
            </div>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>
