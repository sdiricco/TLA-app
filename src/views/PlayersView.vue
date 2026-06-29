<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../stores/auth'
import { usePlayersStore } from '../stores/players'
import { profilesService } from '../services/profilesService'
import type { Player, Profile } from '../types'

const store = usePlayersStore()
const auth = useAuthStore()
const router = useRouter()
const confirm = useConfirm()
const toast = useToast()
const canViewAdmin = computed(() => auth.isAdmin || auth.isGuest)

const unlinkedProfiles = ref<Profile[]>([])
const addingUserId = ref<string | null>(null)

function formatAge(birthDate: string | null | undefined): string {
  if (!birthDate) return 'Età non disponibile'
  const dob = new Date(birthDate)
  if (Number.isNaN(dob.getTime())) return 'Età non disponibile'
  const diff = Date.now() - dob.getTime()
  const ageDate = new Date(diff)
  return `${Math.abs(ageDate.getUTCFullYear() - 1970)} anni`
}

function getPlayerInitials(player: Player): string {
  return player.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

function openCreate(): void {
  if (auth.isGuest) return
  void router.push({ name: 'player-create' })
}

function openEdit(player: Player): void {
  if (auth.isGuest) return
  void router.push({ name: 'player-edit', params: { id: player.id } })
}

function confirmDelete(player: Player): void {
  if (auth.isGuest) return
  confirm.require({
    message: `Eliminare ${player.name}?`,
    header: 'Conferma eliminazione',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: 'Annulla',
    acceptLabel: 'Elimina',
    acceptSeverity: 'danger',
    accept: async () => {
      try {
        await store.remove(player.id)
        toast.add({ severity: 'success', summary: 'Eliminato', detail: `${player.name} rimosso`, life: 3000 })
      } catch (e) {
        toast.add({ severity: 'error', summary: 'Errore', detail: (e as Error).message, life: 4000 })
      }
    },
  })
}

async function addAsPlayer(profile: Profile): Promise<void> {
  if (auth.isGuest) return
  addingUserId.value = profile.id
  try {
    await store.create({
      name: profile.name ?? 'Nuovo giocatore',
      ranking: 0,
      birth_date: null,
      photo_url: null,
      club: null,
      phone: null,
      user_id: profile.id,
    })
    unlinkedProfiles.value = unlinkedProfiles.value.filter((p) => p.id !== profile.id)
    toast.add({ severity: 'success', summary: 'Aggiunto', detail: `${profile.name ?? 'Utente'} aggiunto come giocatore`, life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (e as Error).message, life: 4000 })
  } finally {
    addingUserId.value = null
  }
}

onMounted(async () => {
  await store.fetchAll()
  unlinkedProfiles.value = await profilesService.getUnlinkedProfiles()
})
</script>

<template>
  <div class="flex flex-col gap-5">
    <div class="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h2 class="m-0 text-2xl">Giocatori</h2>
        <p class="mt-1 mb-0 text-sm text-muted-color">{{ store.players.length }} giocatori registrati</p>
      </div>
      <Button v-if="canViewAdmin" label="Aggiungi" icon="pi pi-plus" :disabled="auth.isGuest" @click="openCreate" />
    </div>

    <DataTable
      :value="store.players"
      :loading="store.loading"
      sort-field="ranking"
      :sort-order="1"
      striped-rows
      show-gridlines
      :rows="20"
      paginator
      paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
    >
      <template #empty>
        <div class="flex flex-col items-center gap-3 py-10 px-4 text-muted-color text-center">
          <i class="pi pi-users text-[2rem] text-muted-color" />
          <p class="m-0 leading-relaxed">Nessun giocatore trovato.<br>Clicca <strong>Aggiungi</strong> per iniziare.</p>
        </div>
      </template>

      <Column header="" style="width: 4rem; text-align: center">
        <template #body="{ data }">
          <Avatar :label="getPlayerInitials(data)" :image="data.photo_url ?? undefined" shape="circle" class="mx-auto" />
        </template>
      </Column>

      <Column field="ranking" header="#" sortable style="width: 4rem; text-align: center">
        <template #body="{ data }">
          <Tag v-if="data.ranking" :value="String(data.ranking)" severity="secondary" />
          <span v-else class="text-muted-color">—</span>
        </template>
      </Column>

      <Column field="name" header="Nome" sortable />

      <Column header="Età" style="width: 8rem">
        <template #body="{ data }">
          <span>{{ formatAge(data.birth_date) }}</span>
        </template>
      </Column>

      <Column field="club" header="Club">
        <template #body="{ data }">
          <span v-if="data.club">{{ data.club }}</span>
          <span v-else class="text-muted-color">—</span>
        </template>
      </Column>

      <Column field="phone" header="Contatto">
        <template #body="{ data }">
          <span v-if="data.phone">{{ data.phone }}</span>
          <span v-else class="text-muted-color">—</span>
        </template>
      </Column>

      <Column header="Profilo" style="width: 8rem">
        <template #body="{ data }">
          <RouterLink
            :to="{ name: 'player-detail', params: { id: data.id } }"
            class="inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-primary-600 transition-colors hover:bg-primary-50 hover:text-primary-700"
          >
            Apri
          </RouterLink>
        </template>
      </Column>

      <Column header="Azioni" style="width: 7rem">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button
              v-if="canViewAdmin"
              icon="pi pi-pencil"
              text
              rounded
              size="small"
              aria-label="Modifica"
              :disabled="auth.isGuest"
              @click="openEdit(data)"
            />
            <Button
              v-if="canViewAdmin"
              icon="pi pi-trash"
              text
              rounded
              size="small"
              severity="danger"
              aria-label="Elimina"
              :disabled="auth.isGuest"
              @click="confirmDelete(data)"
            />
          </div>
        </template>
      </Column>
    </DataTable>

    <div v-if="canViewAdmin && unlinkedProfiles.length > 0" class="mt-6">
      <h3 class="m-0 mb-3 text-lg font-semibold">Utenti registrati</h3>
      <p class="mt-0 mb-3 text-sm text-muted-color">Questi utenti hanno un account ma non sono ancora nella lista giocatori.</p>
      <div class="flex flex-col gap-2">
        <div
          v-for="profile in unlinkedProfiles"
          :key="profile.id"
          class="flex items-center justify-between gap-3 p-3 rounded-lg bg-surface-50 border border-surface-200"
        >
          <div class="flex items-center gap-2">
            <i class="pi pi-user text-muted-color" />
            <span class="font-medium">{{ profile.name ?? '(nessun nome)' }}</span>
          </div>
          <Button
            label="Aggiungi come giocatore"
            icon="pi pi-user-plus"
            size="small"
            :loading="addingUserId === profile.id"
            :disabled="auth.isGuest"
            @click="addAsPlayer(profile)"
          />
        </div>
      </div>
    </div>
  </div>
</template>
