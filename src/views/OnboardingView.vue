<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import moment from 'moment'
import Button from 'primevue/button'
import DatePicker from 'primevue/datepicker'
import InputText from 'primevue/inputtext'
import Message from 'primevue/message'
import { useAuthStore } from '@/stores/auth'

type OnboardingStep = 'choice' | 'player'

const router = useRouter()
const auth = useAuthStore()
const step = ref<OnboardingStep>('choice')
const playerName = ref(auth.user?.name?.trim() ?? '')
const birthDate = ref<Date | null>(null)
const today = new Date()
const club = ref('')
const phone = ref('')

async function createPlayerProfile(): Promise<void> {
  const completed = await auth.completeOnboarding('player', {
    name: playerName.value.trim(),
    birth_date: birthDate.value ? moment(birthDate.value).format('YYYY-MM-DD') : null,
    club: club.value.trim() || null,
    phone: phone.value.trim() || null,
  })
  if (completed) await router.replace({ name: 'dashboard' })
}

async function exploreForNow(): Promise<void> {
  const completed = await auth.completeOnboarding('explore')
  if (completed) await router.replace({ name: 'dashboard' })
}

function createOrganization(): void {
  void router.push({ name: 'onboarding-organization' })
}

async function logout(): Promise<void> {
  await auth.logout()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <!------------------------------>
  <!-- Page layout -->
  <!------------------------------>
  <main class="min-h-svh bg-(--color-surface-soft) px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] text-(--color-text) sm:px-6 sm:py-8">
    <div class="mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-5xl flex-col sm:min-h-[calc(100svh-4rem)]">
      <header class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-3 text-lg font-extrabold text-primary-900">
          <span class="grid size-9 place-items-center rounded-full bg-(--color-accent) shadow-sm"><i class="pi pi-circle-fill text-[0.42rem] text-primary-800" /></span>
          <span>TLA</span>
        </div>
        <Button label="Esci" icon="pi pi-sign-out" severity="secondary" text size="small" @click="logout" />
      </header>

      <!------------------------------>
      <!-- Section: Intent selection -->
      <!------------------------------>
      <section v-if="step === 'choice'" class="my-auto py-10 sm:py-14" aria-labelledby="onboarding-title">
        <header class="mx-auto mb-7 max-w-2xl text-center sm:mb-10">
          <p class="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-primary">Benvenuto in TLA</p>
          <h1 id="onboarding-title" class="text-3xl font-bold leading-tight tracking-tight sm:text-5xl">Da cosa vuoi iniziare?</h1>
          <p class="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-(--color-text-muted) sm:text-base">Non stai scegliendo un ruolo: con lo stesso account puoi giocare e gestire uno o più club. Configuriamo solo il tuo primo passo.</p>
        </header>

        <Message v-if="auth.error" severity="error" :closable="false" class="mx-auto mb-5 max-w-2xl">{{ auth.error }}</Message>

        <div class="grid gap-3 md:grid-cols-3 md:gap-4">
          <article class="group flex flex-col rounded-xl border border-(--color-border) bg-(--color-surface-card) p-5 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md sm:p-6">
            <span class="grid size-12 place-items-center rounded-xl bg-primary-50 text-xl text-primary"><i class="pi pi-trophy" /></span>
            <p class="mt-5 text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-primary">Giocatore</p>
            <h2 class="mt-1 text-xl font-bold">Voglio giocare</h2>
            <p class="mt-2 flex-1 text-sm leading-relaxed text-(--color-text-muted)">Crea la tua scheda sportiva, iscriviti ai tornei e segui risultati e statistiche. Potrai creare anche un club in seguito.</p>
            <Button class="mt-5 w-full" label="Crea profilo giocatore" icon="pi pi-arrow-right" icon-pos="right" @click="step = 'player'" />
          </article>

          <article class="group flex flex-col rounded-xl border border-(--color-border) bg-(--color-surface-card) p-5 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md sm:p-6">
            <span class="grid size-12 place-items-center rounded-xl bg-primary-50 text-xl text-primary"><i class="pi pi-building" /></span>
            <p class="mt-5 text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-primary">Organizzatore</p>
            <h2 class="mt-1 text-xl font-bold">Gestisco un club</h2>
            <p class="mt-2 flex-1 text-sm leading-relaxed text-(--color-text-muted)">Crea uno spazio, invita i membri e gestisci tornei e giocatori. Potrai aggiungere anche la tua scheda sportiva.</p>
            <Button class="mt-5 w-full" label="Crea organizzazione" icon="pi pi-arrow-right" icon-pos="right" severity="secondary" outlined @click="createOrganization" />
          </article>

          <article class="group flex flex-col rounded-xl border border-(--color-border) bg-(--color-surface-card) p-5 transition hover:-translate-y-0.5 hover:border-primary-300 hover:shadow-md sm:p-6">
            <span class="grid size-12 place-items-center rounded-xl bg-(--color-surface-soft) text-xl text-(--color-text-muted)"><i class="pi pi-compass" /></span>
            <p class="mt-5 text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-(--color-text-muted)">Esploratore</p>
            <h2 class="mt-1 text-xl font-bold">Esplora per ora</h2>
            <p class="mt-2 flex-1 text-sm leading-relaxed text-(--color-text-muted)">Entra senza creare una scheda sportiva. Potrai unirti a un club o iscriverti più avanti.</p>
            <Button class="mt-5 w-full" label="Esplora TLA" icon="pi pi-arrow-right" icon-pos="right" severity="secondary" text :loading="auth.loading" @click="exploreForNow" />
          </article>
        </div>
      </section>

      <!------------------------------>
      <!-- Section: Player profile -->
      <!------------------------------>
      <section v-else class="my-auto py-8 sm:py-12" aria-labelledby="player-onboarding-title">
        <div class="mx-auto max-w-xl">
          <Button label="Indietro" icon="pi pi-arrow-left" severity="secondary" text class="mb-4" @click="step = 'choice'" />
          <div class="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-surface-card)">
            <header class="border-b border-(--color-border) p-5 sm:p-7">
              <p class="mb-2 text-xs font-extrabold uppercase tracking-[0.16em] text-primary">La tua scheda</p>
              <h1 id="player-onboarding-title" class="text-3xl font-bold tracking-tight">Crea il profilo giocatore</h1>
              <p class="mt-2 text-sm leading-relaxed text-(--color-text-muted)">Il nome è già quello usato in registrazione. Gli altri dati sono facoltativi e potrai completarli in seguito.</p>
            </header>
            <form class="grid gap-4 p-5 sm:p-7" @submit.prevent="createPlayerProfile">
              <Message v-if="auth.error" severity="error" :closable="false">{{ auth.error }}</Message>
              <label for="onboarding-player-name" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Nome e cognome<InputText id="onboarding-player-name" v-model="playerName" minlength="2" maxlength="80" autocomplete="name" fluid required /></label>
              <div class="grid gap-4 sm:grid-cols-2">
                <label for="onboarding-birth-date" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Data di nascita <small class="font-normal">Facoltativa</small><DatePicker input-id="onboarding-birth-date" v-model="birthDate" date-format="dd/mm/yy" placeholder="gg/mm/aaaa" :max-date="today" fluid show-button-bar show-icon icon-display="input" /></label>
                <label for="onboarding-phone" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Telefono <small class="font-normal">Facoltativo</small><InputText id="onboarding-phone" v-model="phone" type="tel" autocomplete="tel" placeholder="+39 333 123 4567" fluid /></label>
              </div>
              <label for="onboarding-club" class="grid gap-2 text-sm font-bold text-(--color-text-muted)">Club di appartenenza <small class="font-normal">Facoltativo</small><InputText id="onboarding-club" v-model="club" placeholder="Es. Tennis Club Aurora" fluid /></label>
              <Button type="submit" label="Crea profilo e continua" icon="pi pi-check" icon-pos="right" :loading="auth.loading" fluid />
            </form>
          </div>
        </div>
      </section>
    </div>
  </main>
</template>
