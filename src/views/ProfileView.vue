<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import moment from 'moment'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import Skeleton from 'primevue/skeleton'
import PlayerPhotoPicker from '@/components/player/PlayerPhotoPicker.vue'
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
const infoOpen = ref(false)
const createPlayerOpen = ref(false)
const deleteAccountOpen = ref(false)
const editName = ref('')
const editBirthDate = ref<Date | null>(null)
const editClub = ref('')
const editPhone = ref('')
const editPhotoUrl = ref('')
const playerName = ref('')
const playerBirthDate = ref<Date | null>(null)
const playerClub = ref('')
const playerPhone = ref('')
const saving = ref(false)
const creatingPlayer = ref(false)
const loggingOut = ref(false)
const deletingAccount = ref(false)
const deleteConfirmation = ref('')
const deleteAccountError = ref<string | null>(null)
const error = ref<string | null>(null)
const playerError = ref<string | null>(null)
const today = new Date()

const displayName = computed(() => auth.user?.name?.trim() || player.value?.name.trim() || 'Completa il tuo nome')
const email = computed(() => auth.user?.email ?? '—')
const avatarLabel = computed(() => initials(auth.user?.name?.trim() || player.value?.name.trim() || 'TLA'))
const accessLabel = computed(() => auth.user?.role === 'admin' ? 'Amministratore piattaforma' : 'Account standard')
const activityLabel = computed(() => {
  if (auth.isGuest) return 'Ospite'
  const capabilities = []
  if (player.value) capabilities.push('Giocatore')
  if (organizations.organizations.some((organization) => ['owner', 'admin'].includes(organization.role))) capabilities.push('Organizzatore')
  return capabilities.join(' · ') || 'Esploratore'
})
const organizationCount = computed(() => organizations.organizations.length)
const canDeleteAccount = computed(() => deleteConfirmation.value.trim().toLowerCase() === email.value.toLowerCase())

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? '').join('')
}

function openEdit(): void {
  editName.value = auth.user?.name?.trim() || player.value?.name.trim() || ''
  const birthDate = player.value?.birth_date ? moment(player.value.birth_date) : null
  editBirthDate.value = birthDate?.isValid() ? birthDate.toDate() : null
  editClub.value = player.value?.club ?? ''
  editPhone.value = player.value?.phone ?? ''
  editPhotoUrl.value = player.value?.photo_url ?? ''
  error.value = null
  editOpen.value = true
}

function openPlayerCreation(): void {
  playerName.value = auth.user?.name?.trim() ?? ''
  playerBirthDate.value = null
  playerClub.value = ''
  playerPhone.value = ''
  playerError.value = null
  createPlayerOpen.value = true
}

async function createPlayerProfile(): Promise<void> {
  if (playerName.value.trim().length < 2) {
    playerError.value = 'Inserisci nome e cognome.'
    return
  }

  creatingPlayer.value = true
  playerError.value = null
  const completed = await auth.completeOnboarding('player', {
    name: playerName.value.trim(),
    birth_date: playerBirthDate.value ? moment(playerBirthDate.value).format('YYYY-MM-DD') : null,
    club: playerClub.value.trim() || null,
    phone: playerPhone.value.trim() || null,
  })
  if (completed) {
    createPlayerOpen.value = false
    await loadPlayerCard()
  } else {
    playerError.value = auth.error
  }
  creatingPlayer.value = false
}

async function saveProfile(): Promise<void> {
  if (editName.value.trim().length < 2) {
    error.value = 'Inserisci un nome di almeno 2 caratteri.'
    return
  }
  saving.value = true
  error.value = null
  try {
    const name = editName.value.trim()
    if (player.value) {
      player.value = await playersService.updateMyPlayer({
        name,
        birth_date: editBirthDate.value ? moment(editBirthDate.value).format('YYYY-MM-DD') : null,
        club: editClub.value.trim() || null,
        phone: editPhone.value.trim() || null,
        photo_url: editPhotoUrl.value || null,
      })
    } else {
      await profilesService.updateMyProfile(name)
    }
    if (auth.user) auth.user.name = name
    editOpen.value = false
  } catch (requestError) {
    error.value = (requestError as Error).message
  } finally {
    saving.value = false
  }
}

async function logout(): Promise<void> {
  loggingOut.value = true
  try {
    await auth.logout()
    await router.replace({ name: 'login' })
  } finally {
    loggingOut.value = false
  }
}

function openDeleteAccount(): void {
  deleteConfirmation.value = ''
  deleteAccountError.value = null
  deleteAccountOpen.value = true
}

async function deleteAccount(): Promise<void> {
  if (!canDeleteAccount.value || deletingAccount.value) return

  deletingAccount.value = true
  deleteAccountError.value = null
  try {
    await auth.deleteAccount()
    deleteAccountOpen.value = false
    await router.replace({ name: 'login' })
  } catch (requestError) {
    deleteAccountError.value = (requestError as Error).message
  } finally {
    deletingAccount.value = false
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
  <main class="mx-auto grid w-full max-w-5xl gap-5 text-(--color-text)">
    <!------------------------------>
    <!-- Section: Account hero -->
    <!------------------------------>
    <header class="rounded-xl border border-(--color-border) bg-(--color-surface-card) p-4 sm:p-6">
      <div class="flex min-w-0 items-center gap-3 sm:gap-4">
        <Avatar :label="avatarLabel" shape="circle" class="size-14! shrink-0 sm:size-18!" />
        <div class="min-w-0 flex-1">
          <p class="mb-1 text-[0.65rem] font-extrabold tracking-[0.14em] text-primary">IL TUO ACCOUNT</p>
          <h1 class="break-words text-xl font-bold leading-tight tracking-tight sm:text-3xl">{{ displayName }}</h1>
          <p class="mt-1 break-all text-sm text-(--color-text-muted) sm:text-base">{{ email }}</p>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-2 gap-2 border-t border-(--color-border) pt-4 sm:flex sm:flex-wrap">
        <Button label="Modifica profilo" icon="pi pi-pencil" class="w-full sm:w-auto" :disabled="loadingPlayer" @click="openEdit" />
        <Button label="Esci" icon="pi pi-sign-out" severity="secondary" text class="w-full sm:ml-auto sm:w-auto" :loading="loggingOut" @click="logout" />
      </div>
    </header>

    <!------------------------------>
    <!-- Section: Account overview -->
    <!------------------------------>
    <section class="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-card)" aria-labelledby="account-overview-title">
      <header class="flex items-center gap-3 border-b border-(--color-border) px-4 py-3.5 sm:px-5">
        <span class="grid size-9 place-items-center rounded-lg bg-primary-50 text-primary"><i class="pi pi-id-card" /></span>
        <div>
          <h2 id="account-overview-title" class="font-bold">Account e accesso</h2>
          <p class="text-xs text-(--color-text-muted)">Accesso, attività e contesto attualmente selezionato.</p>
        </div>
      </header>
      <div class="grid sm:grid-cols-3">
        <article
          v-for="item in [
            { icon: 'pi pi-shield', label: 'ACCESSO', value: accessLabel },
            { icon: 'pi pi-bolt', label: 'ATTIVITÀ', value: activityLabel },
            { icon: 'pi pi-building', label: 'ORGANIZZAZIONI', value: `${organizationCount} ${organizationCount === 1 ? 'organizzazione' : 'organizzazioni'}` },
          ]"
          :key="item.label"
          class="flex min-w-0 items-center gap-3 border-b border-(--color-border) px-4 py-3.5 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 sm:px-5"
        >
          <i :class="item.icon" class="shrink-0 text-base text-primary" />
          <div class="min-w-0">
            <small class="block text-[0.6rem] font-extrabold tracking-wider text-(--color-text-subtle)">{{ item.label }}</small>
            <strong class="mt-1 block truncate text-sm">{{ item.value }}</strong>
          </div>
        </article>
      </div>
    </section>

    <!------------------------------>
    <!-- Section: Profile navigation -->
    <!------------------------------>
    <section class="grid gap-4 md:grid-cols-2" aria-label="Sezioni profilo">
      <article class="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-card)">
        <header class="border-b border-(--color-border) px-4 py-3.5 sm:px-5">
          <h2 class="font-bold">Preferenze e gestione</h2>
          <p class="mt-0.5 text-xs text-(--color-text-muted)">Personalizza l’esperienza e gestisci il tuo spazio.</p>
        </header>
        <nav aria-label="Preferenze e gestione">
          <RouterLink
            :to="{ name: 'settings', hash: '#personalizzazione' }"
            class="profile-menu-item"
          >
            <span class="profile-menu-icon"><i class="pi pi-palette" /></span>
            <span class="profile-menu-copy"><strong>Personalizzazione</strong><small>Aspetto e preferenze dell’app</small></span>
            <i class="pi pi-chevron-right profile-menu-arrow" />
          </RouterLink>
          <RouterLink
            :to="{ name: 'settings', hash: '#configurazione' }"
            class="profile-menu-item"
          >
            <span class="profile-menu-icon"><i class="pi pi-cog" /></span>
            <span class="profile-menu-copy"><strong>Impostazioni</strong><small>Contesto e configurazione dei tornei</small></span>
            <i class="pi pi-chevron-right profile-menu-arrow" />
          </RouterLink>
          <RouterLink :to="{ name: 'organizations' }" class="profile-menu-item">
            <span class="profile-menu-icon"><i class="pi pi-building" /></span>
            <span class="profile-menu-copy"><strong>Le mie organizzazioni</strong><small>Gestisci spazi e organizzazioni</small></span>
            <i class="pi pi-chevron-right profile-menu-arrow" />
          </RouterLink>
        </nav>
      </article>

      <article class="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-card)">
        <header class="border-b border-(--color-border) px-4 py-3.5 sm:px-5">
          <h2 class="font-bold">Informazioni e supporto</h2>
          <p class="mt-0.5 text-xs text-(--color-text-muted)">Consulta le novità o chiedi assistenza.</p>
        </header>
        <nav aria-label="Informazioni e supporto">
          <RouterLink :to="{ name: 'changelog' }" class="profile-menu-item">
            <span class="profile-menu-icon"><i class="pi pi-history" /></span>
            <span class="profile-menu-copy"><strong>Changelog</strong><small>Novità, miglioramenti e correzioni</small></span>
            <i class="pi pi-chevron-right profile-menu-arrow" />
          </RouterLink>
          <RouterLink :to="{ name: 'requests' }" class="profile-menu-item">
            <span class="profile-menu-icon"><i class="pi pi-lightbulb" /></span>
            <span class="profile-menu-copy"><strong>Richieste e supporto</strong><small>Segnala problemi o proponi miglioramenti</small></span>
            <i class="pi pi-chevron-right profile-menu-arrow" />
          </RouterLink>
          <button type="button" class="profile-menu-item w-full text-left" @click="infoOpen = true">
            <span class="profile-menu-icon"><i class="pi pi-info-circle" /></span>
            <span class="profile-menu-copy"><strong>Informazioni</strong><small>Scopri TLA League Admin</small></span>
            <i class="pi pi-chevron-right profile-menu-arrow" />
          </button>
        </nav>
      </article>
    </section>

    <!------------------------------>
    <!-- Section: Player card heading -->
    <!------------------------------>
    <section class="mt-1">
      <p class="mb-1 text-xs font-extrabold tracking-[0.14em] text-primary">ATTIVITÀ SPORTIVA</p>
      <h2 class="text-xl font-bold tracking-tight sm:text-2xl">La mia scheda giocatore</h2>
      <p class="mt-1 max-w-2xl text-sm text-(--color-text-muted) sm:text-base">Risultati e statistiche personali. La scheda può convivere con la gestione di uno o più club.</p>
    </section>

    <section v-if="loadingPlayer" class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 rounded-xl border border-(--color-border) bg-(--color-surface-card) p-4 sm:p-5"><Skeleton shape="circle" size="4rem" /><div class="grid gap-2"><Skeleton width="10rem" height="1.5rem" /><Skeleton class="max-w-full" width="16rem" height="1rem" /></div></section>

    <!------------------------------>
    <!-- Section: Linked player -->
    <!------------------------------>
    <section v-else-if="player" class="grid gap-5 rounded-xl border border-(--color-border) bg-(--color-surface-card) p-4 sm:p-6">
      <div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-4">
        <Avatar :label="initials(player.name)" :image="player.photo_url ?? undefined" shape="circle" class="size-16! shrink-0 sm:size-20!" />
        <div class="min-w-0">
          <p class="mb-1 text-[0.65rem] font-extrabold tracking-[0.14em] text-primary">GIOCATORE COLLEGATO</p>
          <h3 class="truncate text-lg font-bold tracking-tight sm:text-xl">{{ player.name }}</h3>
          <p class="mt-1 truncate text-sm text-(--color-text-muted)">{{ player.club ?? 'Club non specificato' }} · Ranking #{{ player.ranking || '—' }}</p>
        </div>
        <Button label="Apri scheda" icon="pi pi-arrow-right" icon-pos="right" text class="col-span-2 w-full sm:col-span-1 sm:w-auto" @click="router.push({ name: 'player-detail', params: { id: player.id } })" />
      </div>
      <div class="grid grid-cols-2 gap-2 border-t border-(--color-border) pt-4 sm:grid-cols-4">
        <div v-for="stat in [{ label: 'GIOCATE', value: history.stats.played }, { label: 'VITTORIE', value: history.stats.wins }, { label: 'SCONFITTE', value: history.stats.losses }, { label: 'VITTORIE %', value: `${history.stats.win_rate}%` }]" :key="stat.label" class="rounded-lg bg-(--color-surface-soft) p-3"><small class="block text-[0.6rem] font-extrabold tracking-wider text-(--color-text-subtle)">{{ stat.label }}</small><strong class="mt-1 block text-xl tracking-tight sm:text-2xl">{{ stat.value }}</strong></div>
      </div>
    </section>

    <section v-else class="grid justify-items-start gap-4 rounded-xl border border-(--color-border) bg-(--color-surface-card) p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5">
      <span class="grid size-11 shrink-0 place-items-center rounded-lg bg-(--color-surface-soft) text-primary"><i class="pi pi-user-plus" /></span>
      <div class="min-w-0">
        <h3 class="text-lg font-bold sm:text-xl">Scheda giocatore non collegata</h3>
        <p class="mt-1 text-sm text-(--color-text-muted) sm:text-base">Crea la tua identità sportiva per iscriverti ai tornei e seguire partite, vittorie e andamento.</p>
      </div>
      <Button label="Crea profilo giocatore" icon="pi pi-user-plus" class="w-full sm:w-auto" @click="openPlayerCreation" />
    </section>

    <!------------------------------>
    <!-- Section: Account deletion -->
    <!------------------------------>
    <section class="grid gap-4 rounded-xl border border-red-200 bg-(--color-surface-card) p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-5">
      <div class="min-w-0">
        <p class="mb-1 text-[0.65rem] font-extrabold tracking-[0.14em] text-red-700">GESTIONE ACCOUNT</p>
        <h2 class="font-bold">Elimina il tuo account</h2>
        <p class="mt-1 text-sm leading-relaxed text-(--color-text-muted)">Rimuove definitivamente accesso e dati personali. Questa operazione non può essere annullata.</p>
      </div>
      <Button label="Elimina account" icon="pi pi-trash" severity="danger" outlined class="w-full sm:w-auto" @click="openDeleteAccount" />
    </section>

    <!------------------------------>
    <!-- Section: Edit dialog -->
    <!------------------------------>
    <Dialog v-model:visible="editOpen" modal header="Modifica profilo" class="mx-3 w-full max-w-2xl">
      <form class="grid gap-5" @submit.prevent="saveProfile">
        <section class="grid gap-4" aria-labelledby="account-data-title">
          <div>
            <h2 id="account-data-title" class="font-bold">Dati account</h2>
            <p class="mt-1 text-sm text-(--color-text-muted)">Il nome è condiviso con la tua eventuale scheda giocatore.</p>
          </div>
          <label for="profile-name" class="grid gap-2 text-sm font-bold">
            Nome e cognome
            <InputText id="profile-name" v-model="editName" minlength="2" maxlength="80" autocomplete="name" autofocus fluid required />
          </label>
          <label for="profile-email" class="grid gap-2 text-sm font-bold">
            Email
            <InputText id="profile-email" :model-value="email" disabled fluid />
            <small class="font-normal text-(--color-text-muted)">L’email usata per l’accesso non può essere modificata da qui.</small>
          </label>
        </section>

        <section v-if="player" class="grid gap-4 border-t border-(--color-border) pt-5" aria-labelledby="player-data-title">
          <div>
            <h2 id="player-data-title" class="font-bold">Dati giocatore</h2>
            <p class="mt-1 text-sm text-(--color-text-muted)">Informazioni personali mostrate nella tua scheda sportiva.</p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label for="profile-birth-date" class="grid content-start gap-2 text-sm font-bold">
              Data di nascita
              <DatePicker input-id="profile-birth-date" v-model="editBirthDate" date-format="dd/mm/yy" placeholder="gg/mm/aaaa" :max-date="today" fluid show-button-bar show-icon icon-display="input" />
            </label>
            <label for="profile-phone" class="grid content-start gap-2 text-sm font-bold">
              Telefono
              <InputText id="profile-phone" v-model="editPhone" type="tel" maxlength="40" autocomplete="tel" placeholder="Es. 333 0000000" fluid />
            </label>
            <label for="profile-club" class="grid content-start gap-2 text-sm font-bold sm:col-span-2">
              Club di appartenenza
              <InputText id="profile-club" v-model="editClub" maxlength="120" placeholder="Es. TC Milano" fluid />
            </label>
          </div>
          <div class="grid gap-2 text-sm font-bold">
            Foto profilo
            <PlayerPhotoPicker v-model="editPhotoUrl" />
          </div>
        </section>

        <p v-else class="rounded-lg bg-(--color-surface-soft) p-3 text-sm text-(--color-text-muted)">
          Crea una scheda giocatore per aggiungere data di nascita, club, telefono e foto sportiva.
        </p>
        <p v-if="error" class="text-sm text-red-700">{{ error }}</p>
        <div class="grid grid-cols-2 gap-2 border-t border-(--color-border) pt-4 sm:flex sm:justify-end"><Button type="button" label="Annulla" severity="secondary" text @click="editOpen = false" /><Button type="submit" label="Salva modifiche" icon="pi pi-check" :loading="saving" /></div>
      </form>
    </Dialog>

    <!------------------------------>
    <!-- Section: Player creation dialog -->
    <!------------------------------>
    <Dialog v-model:visible="createPlayerOpen" modal header="Crea profilo giocatore" class="mx-3 w-full max-w-lg">
      <form class="grid gap-4" @submit.prevent="createPlayerProfile">
        <p class="text-sm leading-relaxed text-(--color-text-muted)">Questa scheda aggiunge l’attività sportiva al tuo account. Non modifica i permessi che hai nelle organizzazioni.</p>
        <label for="profile-player-name" class="grid gap-2 text-sm font-bold">Nome e cognome<InputText id="profile-player-name" v-model="playerName" minlength="2" maxlength="80" autocomplete="name" fluid required /></label>
        <div class="grid gap-4 sm:grid-cols-2">
          <label for="profile-player-birth-date" class="grid gap-2 text-sm font-bold">Data di nascita <small class="font-normal text-(--color-text-muted)">Facoltativa</small><DatePicker input-id="profile-player-birth-date" v-model="playerBirthDate" date-format="dd/mm/yy" placeholder="gg/mm/aaaa" :max-date="today" fluid show-button-bar show-icon icon-display="input" /></label>
          <label for="profile-player-phone" class="grid gap-2 text-sm font-bold">Telefono <small class="font-normal text-(--color-text-muted)">Facoltativo</small><InputText id="profile-player-phone" v-model="playerPhone" type="tel" autocomplete="tel" fluid /></label>
        </div>
        <label for="profile-player-club" class="grid gap-2 text-sm font-bold">Club di appartenenza <small class="font-normal text-(--color-text-muted)">Facoltativo</small><InputText id="profile-player-club" v-model="playerClub" fluid /></label>
        <p v-if="playerError" class="text-sm text-red-700">{{ playerError }}</p>
        <div class="grid grid-cols-2 gap-2 sm:flex sm:justify-end"><Button type="button" label="Annulla" severity="secondary" text @click="createPlayerOpen = false" /><Button type="submit" label="Crea profilo" icon="pi pi-check" :loading="creatingPlayer" /></div>
      </form>
    </Dialog>

    <Dialog v-model:visible="infoOpen" modal header="Informazioni su TLA" class="mx-3 w-full max-w-md">
      <div class="grid gap-4">
        <span class="grid size-12 place-items-center rounded-full bg-(--color-accent) text-xl text-primary-900">🎾</span>
        <div>
          <h2 class="text-lg font-bold">TLA League Admin</h2>
          <p class="mt-2 text-sm leading-relaxed text-(--color-text-muted)">La piattaforma per organizzare tornei, gestire giocatori e seguire risultati e classifiche della tua community.</p>
        </div>
        <Button label="Vedi le novità" icon="pi pi-history" severity="secondary" outlined @click="infoOpen = false; router.push({ name: 'changelog' })" />
      </div>
    </Dialog>

    <!------------------------------>
    <!-- Section: Account deletion dialog -->
    <!------------------------------>
    <Dialog v-model:visible="deleteAccountOpen" modal header="Elimina definitivamente l’account" :closable="!deletingAccount" class="mx-3 w-full max-w-lg">
      <form class="grid gap-5" @submit.prevent="deleteAccount">
        <div class="rounded-lg bg-red-50 p-4 text-sm leading-relaxed text-red-900">
          <strong class="block">Questa azione è permanente.</strong>
          <ul class="mt-2 list-disc space-y-1 pl-5">
            <li>l’accesso e i dati personali verranno rimossi;</li>
            <li>i tornei globali creati soltanto da te verranno eliminati;</li>
            <li>partite e risultati dei club resteranno, con il giocatore anonimizzato;</li>
            <li>eventuali organizzazioni con altri membri devono avere un altro proprietario.</li>
          </ul>
        </div>
        <label for="delete-account-confirmation" class="grid gap-2 text-sm font-bold">
          Per confermare, digita {{ email }}
          <InputText id="delete-account-confirmation" v-model="deleteConfirmation" type="email" autocomplete="off" fluid :disabled="deletingAccount" />
        </label>
        <p v-if="deleteAccountError" role="alert" class="text-sm text-red-700">{{ deleteAccountError }}</p>
        <div class="grid grid-cols-2 gap-2 border-t border-(--color-border) pt-4 sm:flex sm:justify-end">
          <Button type="button" label="Annulla" severity="secondary" text :disabled="deletingAccount" @click="deleteAccountOpen = false" />
          <Button type="submit" label="Elimina definitivamente" icon="pi pi-trash" severity="danger" :disabled="!canDeleteAccount" :loading="deletingAccount" />
        </div>
      </form>
    </Dialog>
  </main>
</template>

<style scoped>
.profile-menu-item { display: grid; min-height: 4rem; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: .75rem; padding: .7rem 1rem; border: 0; border-bottom: 1px solid var(--color-border); background: transparent; color: var(--color-text); cursor: pointer; font: inherit; text-decoration: none; transition: background 160ms ease; }
.profile-menu-item:last-child { border-bottom: 0; }
.profile-menu-item:hover { background: var(--color-surface-soft); }
.profile-menu-item:focus-visible { position: relative; outline: 2px solid rgb(var(--color-primary-500-rgb) / 35%); outline-offset: -2px; }
.profile-menu-icon { display: grid; width: 2.25rem; height: 2.25rem; place-items: center; border-radius: .5rem; background: var(--color-surface-soft); color: var(--color-primary); }
.profile-menu-copy { display: grid; min-width: 0; gap: .12rem; }
.profile-menu-copy strong { font-size: .875rem; }
.profile-menu-copy small { overflow: hidden; color: var(--color-text-muted); font-size: .75rem; text-overflow: ellipsis; white-space: nowrap; }
.profile-menu-arrow { color: var(--color-text-subtle); font-size: .75rem; }
</style>
