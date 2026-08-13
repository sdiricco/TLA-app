<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import Select from 'primevue/select'
import Textarea from 'primevue/textarea'
import type { TournamentPhaseFormat, TournamentPhaseInput } from '@/types'

const props = defineProps<{
  participantLimit: number
}>()

const phases = defineModel<TournamentPhaseInput[]>({ required: true })

const phaseFormatOptions: Array<{ label: string; value: TournamentPhaseFormat }> = [
  { label: "Girone all'italiana", value: 'round_robin' },
  { label: 'Eliminazione diretta', value: 'single_elimination' },
]

const phaseFlow = computed(() => {
  let inputCount = props.participantLimit
  return phases.value.map((phase, index) => {
    const item = { phase, index, inputCount, outputCount: phase.output_count }
    inputCount = phase.output_count
    return item
  })
})

function phaseInputCount(index: number): number {
  return index === 0
    ? props.participantLimit
    : phases.value[index - 1]?.output_count ?? 0
}

function normalizePhase(phase: TournamentPhaseInput, index: number): void {
  const inputCount = phaseInputCount(index)
  phase.group_count = phase.format === 'round_robin'
    ? Math.min(Math.max(1, phase.group_count), Math.max(1, inputCount))
    : 1
  phase.output_count = Math.min(
    Math.max(index < phases.value.length - 1 ? 2 : 1, phase.output_count),
    Math.max(1, inputCount),
  )
  phase.qualifiers_per_group =
    phase.format === 'round_robin' && phase.output_count % phase.group_count === 0
      ? phase.output_count / phase.group_count
      : null
}

function addPhase(): void {
  const previousIndex = phases.value.length - 1
  const previous = phases.value[previousIndex]
  if (previous && previous.output_count < 2) {
    previous.output_count = Math.min(2, Math.max(1, phaseInputCount(previousIndex)))
  }
  phases.value.push({
    name: '',
    description: '',
    format: 'single_elimination',
    group_count: 1,
    output_count: 1,
    qualifiers_per_group: null,
  })
}

function removePhase(index: number): void {
  if (phases.value.length <= 1) return
  phases.value.splice(index, 1)
  phases.value.forEach(normalizePhase)
}

function movePhase(index: number, offset: -1 | 1): void {
  const target = index + offset
  if (target < 0 || target >= phases.value.length) return
  const [phase] = phases.value.splice(index, 1)
  if (!phase) return
  phases.value.splice(target, 0, phase)
  phases.value.forEach(normalizePhase)
}

function updatePhaseFormat(phase: TournamentPhaseInput, index: number): void {
  normalizePhase(phase, index)
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h2 class="font-bold">Lista delle fasi</h2>
        <p class="mt-1 text-sm text-muted-color">
          L’uscita di ogni fase diventa automaticamente l’ingresso della successiva.
        </p>
      </div>
      <Button
        type="button"
        label="Aggiungi fase"
        icon="pi pi-plus"
        severity="secondary"
        size="small"
        @click="addPhase"
      />
    </div>

    <div class="flex flex-col gap-3">
      <article
        v-for="item in phaseFlow"
        :key="item.index"
        class="rounded-lg border border-(--color-border) bg-(--color-surface-card) p-4"
      >
        <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div class="flex items-center gap-3">
            <span class="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary">
              <i
                :class="item.phase.format === 'round_robin' ? 'pi pi-list' : 'pi pi-sitemap'"
                aria-hidden="true"
              />
            </span>
            <div>
              <small class="text-xs font-extrabold uppercase tracking-wider text-primary">
                Fase {{ item.index + 1 }}
              </small>
              <p class="font-bold">
                {{ item.inputCount || '—' }}
                <i class="pi pi-arrow-right mx-1 text-xs text-muted-color" aria-hidden="true" />
                {{ item.outputCount || '—' }} giocatori
              </p>
            </div>
          </div>

          <div class="flex items-center gap-1">
            <Button
              type="button"
              icon="pi pi-arrow-up"
              severity="secondary"
              text
              rounded
              aria-label="Sposta fase in alto"
              :disabled="item.index === 0"
              @click="movePhase(item.index, -1)"
            />
            <Button
              type="button"
              icon="pi pi-arrow-down"
              severity="secondary"
              text
              rounded
              aria-label="Sposta fase in basso"
              :disabled="item.index === phaseFlow.length - 1"
              @click="movePhase(item.index, 1)"
            />
            <Button
              type="button"
              icon="pi pi-trash"
              severity="danger"
              text
              rounded
              aria-label="Rimuovi fase"
              :disabled="phaseFlow.length === 1"
              @click="removePhase(item.index)"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div class="flex flex-col gap-1.5 lg:col-span-2">
            <label :for="`phase-name-${item.index}`" class="text-sm font-medium">Nome fase *</label>
            <IconField>
              <InputIcon class="pi pi-flag" />
              <InputText
                :id="`phase-name-${item.index}`"
                v-model="item.phase.name"
                placeholder="Es. Qualificazioni"
                fluid
              />
            </IconField>
          </div>

          <div class="flex flex-col gap-1.5 md:col-span-2 lg:col-span-2">
            <div class="flex items-baseline justify-between gap-3">
              <label :for="`phase-description-${item.index}`" class="text-sm font-medium">
                Descrizione fase *
              </label>
              <small class="text-xs text-muted-color">Mostrata nella pagina del torneo</small>
            </div>
            <Textarea
              :id="`phase-description-${item.index}`"
              v-model="item.phase.description"
              rows="3"
              maxlength="240"
              placeholder="Es. I primi due classificati di ogni girone accedono alla fase finale."
              fluid
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label :for="`phase-format-${item.index}`" class="text-sm font-medium">Formula *</label>
            <Select
              :input-id="`phase-format-${item.index}`"
              v-model="item.phase.format"
              :options="phaseFormatOptions"
              option-label="label"
              option-value="value"
              fluid
              @update:model-value="updatePhaseFormat(item.phase, item.index)"
            />
          </div>

          <div class="flex flex-col gap-1.5">
            <label :for="`phase-output-${item.index}`" class="text-sm font-medium">
              Giocatori in uscita *
            </label>
            <IconField>
              <InputIcon class="pi pi-sign-out" />
              <InputNumber
                :input-id="`phase-output-${item.index}`"
                v-model="item.phase.output_count"
                :min="item.index < phaseFlow.length - 1 ? 2 : 1"
                :max="item.inputCount"
                :use-grouping="false"
                fluid
              />
            </IconField>
          </div>

          <div v-if="item.phase.format === 'round_robin'" class="flex flex-col gap-1.5">
            <label :for="`phase-groups-${item.index}`" class="text-sm font-medium">
              Numero gironi *
            </label>
            <IconField>
              <InputIcon class="pi pi-th-large" />
              <InputNumber
                :input-id="`phase-groups-${item.index}`"
                v-model="item.phase.group_count"
                :min="1"
                :max="Math.min(26, item.inputCount)"
                :use-grouping="false"
                fluid
              />
            </IconField>
          </div>
        </div>

        <div class="mt-4 rounded-lg bg-surface-50 px-3 py-2 text-sm text-muted-color">
          <template v-if="item.phase.format === 'round_robin'">
            I migliori {{ item.outputCount || '—' }} avanzano in base a vittorie,
            differenza set, differenza game, scontri diretti e ranking.
          </template>
          <template v-else>
            Avanzano i migliori {{ item.outputCount || '—' }} in base al piazzamento
            raggiunto nel tabellone.
          </template>
        </div>
      </article>
    </div>

    <div class="rounded-lg border border-(--color-border) bg-surface-50 p-3">
      <p class="text-sm text-muted-color">
        Vincolo del percorso:
        <strong class="text-color">
          ogni fase deve produrre un numero di giocatori minore o uguale a quelli ricevuti.
        </strong>
      </p>
    </div>
  </div>
</template>
