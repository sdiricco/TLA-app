import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { TournamentPhaseInput } from '../../../src/types'
import { normalizeTournamentPhases, validateTournamentPhases } from './tournamentPhases'

// @req-covered CMP-001 CMP-002
// @req-partial CMP-008

test('normalizes a group-to-elimination pipeline with deterministic outputs', () => {
  const phases = normalizeTournamentPhases('round_robin_elimination', undefined, 4, 2)

  assert.deepEqual(phases.map(phase => ({
    name: phase.name,
    format: phase.format,
    output_count: phase.output_count,
  })), [
    { name: 'Fase a gironi', format: 'round_robin', output_count: 8 },
    { name: 'Fase finale', format: 'single_elimination', output_count: 1 },
  ])
  assert.doesNotThrow(() => validateTournamentPhases(phases, 16))
})

test('rejects a phase that produces more players than it receives', () => {
  const phases: TournamentPhaseInput[] = [{
    name: 'Fase impossibile',
    description: 'Configurazione non valida.',
    format: 'round_robin',
    group_count: 2,
    output_count: 9,
    qualifiers_per_group: 5,
  }]

  assert.throws(
    () => validateTournamentPhases(phases, 8),
    /non può produrre più di 8 giocatori/,
  )
})

test('rejects an intermediate phase that leaves fewer than two qualifiers', () => {
  const phases: TournamentPhaseInput[] = [
    {
      name: 'Gironi',
      description: 'Prima fase.',
      format: 'round_robin',
      group_count: 2,
      output_count: 1,
      qualifiers_per_group: 1,
    },
    {
      name: 'Finale',
      description: 'Seconda fase.',
      format: 'single_elimination',
      group_count: 1,
      output_count: 1,
      qualifiers_per_group: null,
    },
  ]

  assert.throws(
    () => validateTournamentPhases(phases, 8),
    /deve lasciare almeno due giocatori/,
  )
})
