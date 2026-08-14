<script setup lang="ts">
import { computed } from 'vue'
import moment from 'moment'
import 'moment/locale/it.js'
import Button from 'primevue/button'
import type { TournamentWithPlayers } from '@/types'

const props = defineProps<{
  tournament: TournamentWithPlayers
  enrolledPlayersCount: number
  isEnrolled: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  enroll: []
  withdraw: []
}>()

interface EnrollmentPresentation {
  title: string
  description: string
  icon: string
  tone: 'primary' | 'success' | 'muted'
  action: 'enroll' | 'withdraw' | null
}

const isFull = computed(() => Boolean(
  props.tournament.participant_limit
  && props.enrolledPlayersCount >= props.tournament.participant_limit,
))

const presentation = computed<EnrollmentPresentation>(() => {
  if (props.isEnrolled) {
    if (props.tournament.status !== 'upcoming') {
      return {
        title: 'Partecipi al torneo',
        description: 'La tua iscrizione è confermata e il torneo è già iniziato.',
        icon: 'pi pi-check-circle',
        tone: 'success',
        action: null,
      }
    }
    return {
      title: 'Sei iscritto',
      description: 'Il tuo posto è confermato. Puoi ritirarti finché il torneo non inizia.',
      icon: 'pi pi-check-circle',
      tone: 'success',
      action: 'withdraw',
    }
  }

  if (!props.tournament.published) {
    return {
      title: 'Iscrizioni non disponibili',
      description: 'Il torneo deve essere pubblicato prima di accettare iscrizioni.',
      icon: 'pi pi-eye-slash',
      tone: 'muted',
      action: null,
    }
  }

  if (props.tournament.status !== 'upcoming') {
    return {
      title: 'Iscrizioni chiuse',
      description: 'Il torneo è già iniziato o si è concluso.',
      icon: 'pi pi-lock',
      tone: 'muted',
      action: null,
    }
  }

  const today = moment()
  const registrationStart = props.tournament.registration_start_date
    ? moment(props.tournament.registration_start_date)
    : null
  const registrationEnd = props.tournament.registration_end_date
    ? moment(props.tournament.registration_end_date)
    : null

  if (registrationStart?.isValid() && today.isBefore(registrationStart, 'day')) {
    return {
      title: 'Iscrizioni non ancora aperte',
      description: `Potrai iscriverti dal ${registrationStart.locale('it').format('D MMM YYYY')}.`,
      icon: 'pi pi-calendar-clock',
      tone: 'muted',
      action: null,
    }
  }

  if (registrationEnd?.isValid() && today.isAfter(registrationEnd, 'day')) {
    return {
      title: 'Iscrizioni chiuse',
      description: `Il termine era il ${registrationEnd.locale('it').format('D MMM YYYY')}.`,
      icon: 'pi pi-lock',
      tone: 'muted',
      action: null,
    }
  }

  if (isFull.value) {
    return {
      title: 'Torneo al completo',
      description: `Sono già occupati tutti i ${props.tournament.participant_limit} posti disponibili.`,
      icon: 'pi pi-users',
      tone: 'muted',
      action: null,
    }
  }

  return {
    title: 'Iscrizioni aperte',
    description: registrationEnd?.isValid()
      ? `Conferma la partecipazione entro il ${registrationEnd.locale('it').format('D MMM YYYY')}.`
      : 'Conferma ora la tua partecipazione al torneo.',
    icon: 'pi pi-user-plus',
    tone: 'primary',
    action: 'enroll',
  }
})

const iconClasses = computed(() => ({
  'bg-primary-50 text-primary': presentation.value.tone === 'primary',
  'bg-emerald-50 text-emerald-700': presentation.value.tone === 'success',
  'bg-surface-100 text-muted-color': presentation.value.tone === 'muted',
}))
</script>

<template>
  <!------------------------------>
  <!-- Section: Personal tournament enrolment -->
  <!------------------------------>
  <section
    class="hidden gap-4 rounded-lg border border-(--color-border) bg-(--color-surface-card) p-5 md:flex md:items-center md:justify-between"
    aria-labelledby="tournament-enrollment-title"
  >
    <div class="flex min-w-0 items-start gap-3">
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-lg"
        :class="iconClasses"
        aria-hidden="true"
      >
        <i :class="presentation.icon" />
      </span>
      <div class="min-w-0">
        <h2 id="tournament-enrollment-title" class="font-bold text-color">{{ presentation.title }}</h2>
        <p class="mt-1 text-sm leading-relaxed text-muted-color">{{ presentation.description }}</p>
      </div>
    </div>

    <Button
      v-if="presentation.action === 'enroll'"
      class="shrink-0"
      label="Iscriviti al torneo"
      icon="pi pi-user-plus"
      :loading="loading"
      @click="emit('enroll')"
    />
    <Button
      v-else-if="presentation.action === 'withdraw'"
      class="shrink-0"
      label="Ritira iscrizione"
      icon="pi pi-user-minus"
      severity="danger"
      outlined
      :loading="loading"
      @click="emit('withdraw')"
    />
  </section>

  <div
    v-if="presentation.action"
    class="fixed inset-x-0 bottom-[calc(4.35rem+env(safe-area-inset-bottom))] z-30 border-t border-(--color-border) bg-(--color-surface-card) p-3 shadow-[0_-8px_24px_rgb(15_23_42/0.08)] md:hidden"
    aria-label="Azioni iscrizione torneo"
  >
    <Button
      v-if="presentation.action === 'enroll'"
      class="w-full"
      label="Iscriviti"
      icon="pi pi-user-plus"
      :loading="loading"
      @click="emit('enroll')"
    />
    <Button
      v-else
      class="w-full"
      label="Ritira iscrizione"
      icon="pi pi-user-minus"
      severity="danger"
      outlined
      :loading="loading"
      @click="emit('withdraw')"
    />
  </div>

  <section
    v-else
    class="flex items-start gap-3 rounded-lg border border-(--color-border) bg-(--color-surface-card) p-4 md:hidden"
    aria-label="Stato iscrizione"
  >
    <span
      class="flex size-10 shrink-0 items-center justify-center rounded-lg"
      :class="iconClasses"
      aria-hidden="true"
    >
      <i :class="presentation.icon" />
    </span>
    <div class="min-w-0">
      <h2 class="font-bold text-color">{{ presentation.title }}</h2>
      <p class="mt-1 text-sm leading-relaxed text-muted-color">{{ presentation.description }}</p>
    </div>
  </section>
</template>
