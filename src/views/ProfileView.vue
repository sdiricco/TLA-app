<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Skeleton from 'primevue/skeleton'
import { playersService } from '@/services/playersApi'
import { profilesService } from '@/services/profilesApi'
import { useAuthStore } from '@/stores/auth'
import { useOrganizationsStore } from '@/stores/organizations'
import type { Player, PlayerMatchHistory } from '@/types'

// Shared account state and player-card data.
const router = useRouter()
const auth = useAuthStore()
const organizations = useOrganizationsStore()
const player = ref<Player | null>(null)
const history = ref<PlayerMatchHistory>({ stats: { played: 0, wins: 0, losses: 0, win_rate: 0 }, recent_form: [], recent_matches: [] })
const loadingPlayer = ref(true)
const editOpen = ref(false)
const editName = ref('')
const saving = ref(false)
const error = ref<string | null>(null)

const displayName = computed(() => auth.user?.name || auth.user?.email || 'Il tuo profilo')
const email = computed(() => auth.user?.email ?? '—')
const roleLabel = computed(() => auth.isAdmin ? 'Amministratore' : 'Giocatore')
const organizationCount = computed(() => organizations.organizations.length)

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
}

function openEdit(): void {
  editName.value = displayName.value
  error.value = null
  editOpen.value = true
}

async function saveProfile(): Promise<void> {
  if (editName.value.trim().length < 2) {
    error.value = 'Inserisci un nome di almeno 2 caratteri.'
    return
  }
  saving.value = true
  error.value = null
  try {
    const updated = await profilesService.updateMyProfile(editName.value.trim())
    if (auth.user) auth.user.name = updated.name ?? editName.value.trim()
    editOpen.value = false
  } catch (requestError) {
    error.value = (requestError as Error).message
  } finally {
    saving.value = false
  }
}

// The player card is optional because not every account is linked to a player.
async function loadPlayerCard(): Promise<void> {
  loadingPlayer.value = true
  try {
    const loadedPlayer = await playersService.getMyPlayer()
    player.value = loadedPlayer
    if (loadedPlayer) history.value = await playersService.getMatchHistory(loadedPlayer.id)
  } finally {
    loadingPlayer.value = false
  }
}

onMounted(loadPlayerCard)
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <main class="mx-auto grid w-full max-w-270 gap-4 text-(--color-text)">
    <!-- Section: Account hero -->
    <header class="flex flex-col items-start justify-between gap-4 border border-(--color-border) bg-(--color-surface-card) p-4 shadow-sm md:flex-row md:items-center sm:p-6">
      <div class="flex items-center gap-4">
        <Avatar :label="initials(displayName)" shape="circle" class="size-18! shrink-0 bg-primary-700! text-xl! font-extrabold! text-white!" />
        <div class="min-w-0">
          <p class="mb-1 text-xs font-extrabold tracking-[0.14em] text-primary-700">IL TUO ACCOUNT</p>
          <h1 class="truncate text-3xl font-bold tracking-tight sm:text-4xl">{{ displayName }}</h1>
          <p class="mt-1 text-(--color-text-muted)">{{ email }}</p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button label="Le mie organizzazioni" icon="pi pi-building" severity="secondary" outlined @click="router.push({ name: 'organizations' })" />
        <Button label="Modifica profilo" icon="pi pi-pencil" @click="openEdit" />
      </div>
    </header>

    <!-- Section: Account overview -->
    <section class="grid gap-3 md:grid-cols-3" aria-label="Riepilogo account">
      <article v-for="item in [{ icon: 'pi pi-shield', label: 'RUOLO', value: roleLabel }, { icon: 'pi pi-building', label: 'LE MIE ORGANIZZAZIONI', value: `${organizationCount} ${organizationCount === 1 ? 'organizzazione' : 'organizzazioni'}` }, { icon: 'pi pi-calendar', label: 'ACCESSO', value: 'Account attivo' }]" :key="item.label" class="flex min-w-0 items-center gap-3 border border-(--color-border) bg-(--color-surface-card) p-4">
        <i :class="item.icon" class="text-lg text-primary-700" />
        <div><small class="block text-[0.6rem] font-extrabold tracking-wider text-(--color-text-subtle)">{{ item.label }}</small><strong class="mt-1 block text-sm">{{ item.value }}</strong></div>
      </article>
    </section>

    <!-- Section: Player card heading -->
    <section class="mt-2">
      <p class="mb-1 text-xs font-extrabold tracking-[0.14em] text-primary-700">ATTIVITÀ SPORTIVA</p>
      <h2 class="text-2xl font-bold tracking-tight">La mia scheda giocatore</h2>
      <p class="mt-2 max-w-2xl text-(--color-text-muted)">Risultati e statistiche personali collegati all’organizzazione selezionata.</p>
    </section>

    <section v-if="loadingPlayer" class="grid grid-cols-[auto_1fr] items-center gap-4 border border-(--color-border) bg-(--color-surface-card) p-5"><Skeleton shape="circle" size="5rem" /><div class="grid gap-2"><Skeleton width="10rem" height="1.5rem" /><Skeleton width="16rem" height="1rem" /></div></section>

    <!------------------------------>
    <!-- Section: Linked player -->
    <!------------------------------>
    <section v-else-if="player" class="grid gap-5 border border-(--color-border) bg-(--color-surface-card) p-4 shadow-sm sm:p-6">
      <div class="flex flex-wrap items-start gap-4">
        <Avatar :label="initials(player.name)" :image="player.photo_url ?? undefined" shape="circle" class="size-20! shrink-0 bg-(--color-surface-soft)! text-xl! font-extrabold! text-primary-700!" />
        <div class="min-w-0 flex-1"><p class="mb-1 text-xs font-extrabold tracking-[0.14em] text-primary-700">GIOCATORE COLLEGATO</p><h3 class="text-xl font-bold tracking-tight">{{ player.name }}</h3><p class="mt-1 text-(--color-text-muted)">{{ player.club ?? 'Club non specificato' }} · Ranking #{{ player.ranking || '—' }}</p></div>
        <Button class="w-full sm:w-auto" label="Apri scheda" icon="pi pi-arrow-right" icon-pos="right" text @click="router.push({ name: 'player-detail', params: { id: player.id } })" />
      </div>
      <div class="grid grid-cols-2 border-t border-(--color-border) md:grid-cols-4">
        <div v-for="stat in [{ label: 'PARTITE GIOCATE', value: history.stats.played }, { label: 'VITTORIE', value: history.stats.wins }, { label: 'SCONFITTE', value: history.stats.losses }, { label: 'VITTORIE %', value: `${history.stats.win_rate}%` }]" :key="stat.label" class="py-4 md:pr-4"><small class="block text-[0.6rem] font-extrabold tracking-wider text-(--color-text-subtle)">{{ stat.label }}</small><strong class="mt-1 block text-2xl tracking-tight">{{ stat.value }}</strong></div>
      </div>
    </section>

    <section v-else class="flex flex-col items-start gap-4 border border-(--color-border) bg-(--color-surface-card) p-5 shadow-sm md:flex-row md:items-center">
      <span class="grid size-11 shrink-0 place-items-center bg-(--color-surface-soft) text-primary-700"><i class="pi pi-user-plus" /></span>
      <div class="flex-1"><h3 class="text-xl font-bold">La tua scheda giocatore non è ancora collegata</h3><p class="mt-2 text-(--color-text-muted)">Quando verrai associato a un giocatore, qui vedrai partite, vittorie e andamento.</p></div>
      <Button label="Vai ai giocatori" icon="pi pi-users" severity="secondary" outlined @click="router.push({ name: 'players' })" />
    </section>

    <!-- Section: Permissions -->
    <section class="flex items-start justify-between gap-4 border border-(--color-border) bg-(--color-surface-soft) p-5">
      <div><p class="mb-1 text-xs font-extrabold tracking-[0.14em] text-primary-700">ACCESSO</p><h2 class="text-xl font-bold">Permessi del tuo account</h2><p class="mt-2 text-(--color-text-muted)">{{ auth.isAdmin ? 'Puoi gestire tornei, giocatori e configurazioni della tua organizzazione.' : 'Puoi consultare tornei, richieste e la tua attività sportiva.' }}</p></div>
      <i :class="auth.isAdmin ? 'pi pi-verified' : 'pi pi-check-circle'" class="text-3xl text-primary-700" />
    </section>

    <!-- Section: Edit dialog -->
    <Dialog v-model:visible="editOpen" modal header="Modifica profilo" class="mx-4 w-full max-w-md">
      <form class="grid gap-3" @submit.prevent="saveProfile">
        <label for="profile-name" class="text-sm font-bold">Nome visualizzato</label>
        <InputText id="profile-name" v-model="editName" maxlength="80" autofocus fluid />
        <small class="text-(--color-text-muted)">L’email dell’account non può essere modificata da qui.</small>
        <p v-if="error" class="text-sm text-red-700">{{ error }}</p>
        <div class="mt-2 flex justify-end gap-2"><Button type="button" label="Annulla" severity="secondary" text @click="editOpen = false" /><Button type="submit" label="Salva modifiche" icon="pi pi-check" :loading="saving" /></div>
      </form>
    </Dialog>
  </main>
</template>
