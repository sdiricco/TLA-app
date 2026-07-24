import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TournamentFormModel } from '@/components/tournaments/tournamentForm'

export interface ExistingTournamentRegulation {
  name: string
  contentType: string | null
  size: number | null
}

function cloneForm(form: TournamentFormModel): TournamentFormModel {
  return {
    ...form,
    phases: form.phases.map((phase) => ({ ...phase })),
  }
}

export const useTournamentFormDraftStore = defineStore('tournamentFormDraft', () => {
  const contextKey = ref<string | null>(null)
  const form = ref<TournamentFormModel | null>(null)
  const regulationFile = ref<File | null>(null)
  const existingRegulation = ref<ExistingTournamentRegulation | null>(null)

  function save(
    key: string,
    value: TournamentFormModel,
    file: File | null,
    regulation: ExistingTournamentRegulation | null,
  ): void {
    contextKey.value = key
    form.value = cloneForm(value)
    regulationFile.value = file
    existingRegulation.value = regulation ? { ...regulation } : null
  }

  function updatePhases(phases: TournamentFormModel['phases']): void {
    if (!form.value) return
    form.value.phases = phases.map((phase) => ({ ...phase }))
  }

  function restore(key: string): {
    form: TournamentFormModel
    regulationFile: File | null
    existingRegulation: ExistingTournamentRegulation | null
  } | null {
    if (contextKey.value !== key || !form.value) return null
    return {
      form: cloneForm(form.value),
      regulationFile: regulationFile.value,
      existingRegulation: existingRegulation.value ? { ...existingRegulation.value } : null,
    }
  }

  function clear(): void {
    contextKey.value = null
    form.value = null
    regulationFile.value = null
    existingRegulation.value = null
  }

  return {
    contextKey,
    form,
    regulationFile,
    existingRegulation,
    save,
    updatePhases,
    restore,
    clear,
  }
})
