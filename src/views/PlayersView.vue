<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Button from 'primevue/button'
import Column from 'primevue/column'
import DataTable from 'primevue/datatable'
import Dialog from 'primevue/dialog'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Tag from 'primevue/tag'
import { useConfirm } from 'primevue/useconfirm'
import { useToast } from 'primevue/usetoast'
import { useAuthStore } from '../stores/auth'
import { usePlayersStore } from '../stores/players'
import { profilesService } from '../services/profilesService'
import type { Player, PlayerCreate, Profile } from '../types'

interface PlayerForm {
  name: string
  ranking: number | null
  club: string
  phone: string
}

const store = usePlayersStore()
const auth = useAuthStore()
const confirm = useConfirm()
const toast = useToast()
const canViewAdmin = computed(() => auth.isAdmin || auth.isGuest)

const dialogVisible = ref(false)
const saving = ref(false)
const editingId = ref<string | null>(null)
const form = ref<PlayerForm>({ name: '', ranking: null, club: '', phone: '' })

function emptyForm(): PlayerForm {
  return { name: '', ranking: null, club: '', phone: '' }
}

function openCreate(): void {
  if (auth.isGuest) return
  editingId.value = null
  form.value = emptyForm()
  dialogVisible.value = true
}

function openEdit(player: Player): void {
  if (auth.isGuest) return
  editingId.value = player.id
  form.value = {
    name: player.name,
    ranking: player.ranking,
    club: player.club ?? '',
    phone: player.phone ?? '',
  }
  dialogVisible.value = true
}

function toPlayerPayload(data: PlayerForm): PlayerCreate {
  return {
    name: data.name,
    ranking: data.ranking ?? 0,
    club: data.club || null,
    phone: data.phone || null,
  }
}

async function savePlayer(): Promise<void> {
  if (auth.isGuest) return
  saving.value = true
  try {
    const payload = toPlayerPayload(form.value)
    if (editingId.value) {
      await store.update(editingId.value, payload)
      toast.add({ severity: 'success', summary: 'Salvato', detail: 'Giocatore aggiornato', life: 3000 })
    } else {
      await store.create(payload)
      toast.add({ severity: 'success', summary: 'Creato', detail: 'Giocatore aggiunto', life: 3000 })
    }
    dialogVisible.value = false
  } catch (e) {
    toast.add({ severity: 'error', summary: 'Errore', detail: (e as Error).message, life: 4000 })
  } finally {
    saving.value = false
  }
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

onMounted(async () => {
  await store.fetchAll()
  unlinkedProfiles.value = await profilesService.getUnlinkedProfiles()
})

const unlinkedProfiles = ref<Profile[]>([])
const addingUserId = ref<string | null>(null)

async function addAsPlayer(profile: Profile): Promise<void> {
  if (auth.isGuest) return
  addingUserId.value = profile.id
  try {
    await store.create({
      name: profile.name ?? 'Nuovo giocatore',
      ranking: 0,
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

      <Column field="ranking" header="#" sortable style="width: 4rem; text-align: center">
        <template #body="{ data }">
          <Tag v-if="data.ranking" :value="String(data.ranking)" severity="secondary" />
          <span v-else class="text-muted-color">—</span>
        </template>
      </Column>

      <Column field="name" header="Nome" sortable />

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

      <Column header="Azioni" style="width: 7rem">
        <template #body="{ data }">
          <div class="flex gap-1">
            <Button v-if="canViewAdmin" icon="pi pi-pencil" text rounded size="small" aria-label="Modifica" :disabled="auth.isGuest" @click="openEdit(data)" />
            <Button v-if="canViewAdmin" icon="pi pi-trash" text rounded size="small" severity="danger" aria-label="Elimina" :disabled="auth.isGuest" @click="confirmDelete(data)" />
          </div>
        </template>
      </Column>
    </DataTable>

    <!-- Utenti registrati non ancora giocatori -->
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

  <Dialog
    v-model:visible="dialogVisible"
    :header="editingId ? 'Modifica giocatore' : 'Nuovo giocatore'"
    :style="{ width: '400px' }"
    modal
  >
    <form class="flex flex-col gap-4 pt-2" @submit.prevent="savePlayer">
      <div class="flex flex-col gap-[0.375rem]">
        <label for="p-name" class="text-sm font-medium">Nome *</label>
        <InputText id="p-name" v-model="form.name" placeholder="Mario Rossi" fluid required autofocus />
      </div>

      <div class="flex flex-col gap-[0.375rem]">
        <label for="p-ranking" class="text-sm font-medium">Ranking</label>
        <InputNumber id="p-ranking" v-model="form.ranking" placeholder="1" :min="1" :max="9999" fluid />
      </div>

      <div class="flex flex-col gap-[0.375rem]">
        <label for="p-club" class="text-sm font-medium">Club</label>
        <InputText id="p-club" v-model="form.club" placeholder="TC Milano" fluid />
      </div>

      <div class="flex flex-col gap-[0.375rem]">
        <label for="p-phone" class="text-sm font-medium">Contatto</label>
        <InputText id="p-phone" v-model="form.phone" placeholder="333-0000000" fluid />
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <Button type="button" label="Annulla" severity="secondary" outlined @click="dialogVisible = false" />
        <Button type="submit" :label="editingId ? 'Salva' : 'Crea'" :loading="saving" />
      </div>
    </form>
  </Dialog>
</template>
