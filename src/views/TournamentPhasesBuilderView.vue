<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import { useToast } from 'primevue/usetoast'
import PageHeader from '@/components/layout/PageHeader.vue'
import TournamentPhaseBuilder from '@/components/tournaments/TournamentPhaseBuilder.vue'
import { useTournamentFormDraftStore } from '@/stores/tournamentFormDraft'
import type { TournamentPhaseInput } from '@/types'

const router = useRouter()
const toast = useToast()
const draft = useTournamentFormDraftStore()

function createInitialPhase(inputCount: number): TournamentPhaseInput[] {
  const outputCount = Math.min(8, Math.max(1, Math.floor(inputCount / 2)))
  return [
    {
      name: 'Fase a gironi',
      description: `I migliori ${outputCount} giocatori accedono alla fase successiva.`,
      format: 'round_robin',
      group_count: 1,
      output_count: outputCount,
      qualifiers_per_group: outputCount,
    },
  ]
}

const draftPhases = draft.form?.phases ?? []
const phases = ref<TournamentPhaseInput[]>(
  draftPhases.length > 0
    ? draftPhases.map((phase) => ({ ...phase }))
    : createInitialPhase(draft.form?.participant_limit ?? 32),
)
const participantLimit = computed(() => draft.form?.participant_limit ?? 0)

function returnLocation() {
  const context = draft.contextKey
  if (context?.startsWith('edit:')) {
    return {
      name: 'tournament-edit',
      params: { id: context.slice('edit:'.length) },
    }
  }
  return { name: 'tournament-create' }
}

function validatePhases(): boolean {
  if (phases.value.length === 0) {
    toast.add({
      severity: 'warn',
      summary: 'Aggiungi una fase',
      detail: 'Il percorso deve contenere almeno una fase.',
      life: 4000,
    })
    return false
  }

  let inputCount = participantLimit.value
  for (const [index, phase] of phases.value.entries()) {
    if (!phase.name.trim()) {
      toast.add({
        severity: 'warn',
        summary: 'Nome mancante',
        detail: `Inserisci il nome della fase ${index + 1}.`,
        life: 4000,
      })
      return false
    }
    if (!phase.description?.trim()) {
      toast.add({
        severity: 'warn',
        summary: 'Descrizione mancante',
        detail: `Descrivi brevemente la fase ${index + 1}.`,
        life: 4000,
      })
      return false
    }
    if (
      !Number.isInteger(phase.output_count)
      || phase.output_count < 1
      || phase.output_count > inputCount
    ) {
      toast.add({
        severity: 'warn',
        summary: 'Flusso non valido',
        detail: `La fase ${index + 1} deve produrre da 1 a ${inputCount} giocatori.`,
        life: 4000,
      })
      return false
    }
    if (index < phases.value.length - 1 && phase.output_count < 2) {
      toast.add({
        severity: 'warn',
        summary: 'Flusso non valido',
        detail: `La fase ${index + 1} deve lasciare almeno due giocatori alla fase successiva.`,
        life: 4000,
      })
      return false
    }
    if (phase.format === 'round_robin' && phase.group_count > inputCount) {
      toast.add({
        severity: 'warn',
        summary: 'Troppi gironi',
        detail: `La fase ${index + 1} può contenere al massimo ${inputCount} gironi.`,
        life: 4000,
      })
      return false
    }
    inputCount = phase.output_count
  }
  return true
}

async function save(): Promise<void> {
  if (!validatePhases()) return
  draft.updatePhases(
    phases.value.map((phase) => ({
      ...phase,
      group_count: phase.format === 'round_robin' ? phase.group_count : 1,
      qualifiers_per_group:
        phase.format === 'round_robin' && phase.output_count % phase.group_count === 0
          ? phase.output_count / phase.group_count
          : null,
    })),
  )
  await router.push(returnLocation())
}

async function cancel(): Promise<void> {
  await router.push(returnLocation())
}

onMounted(async () => {
  if (!draft.form || !draft.contextKey) {
    await router.replace({ name: 'tournament-create' })
  }
})
</script>

<template>
  <div class="mx-auto flex max-w-5xl flex-col gap-4 text-(--color-text) sm:gap-5">
    <div>
      <Button
        type="button"
        label="Indietro"
        icon="pi pi-arrow-left"
        severity="secondary"
        text
        @click="cancel"
      />
      <PageHeader
        title="Configura il percorso"
        description="Costruisci la sequenza di fasi e definisci quanti giocatori avanzano."
      />
    </div>

    <Card v-if="draft.form">
      <template #content>
        <TournamentPhaseBuilder
          v-model="phases"
          :participant-limit="participantLimit"
        />

        <div class="mt-6 flex flex-col-reverse gap-2 border-t border-(--color-border) pt-5 sm:flex-row sm:justify-end">
          <Button
            type="button"
            label="Annulla"
            severity="secondary"
            outlined
            @click="cancel"
          />
          <Button
            type="button"
            label="Salva percorso"
            icon="pi pi-check"
            @click="save"
          />
        </div>
      </template>
    </Card>
  </div>
</template>
