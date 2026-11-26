import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Prisma } from '@prisma/client'
import { autoAdvanceByeMatches, propagateMatchWinner } from './matchProgression'

// @req-covered CMP-005
// @req-partial CMP-007 NFR-006

function progressionTransaction() {
  const updates: Array<{ where: { id: string }; data: Record<string, unknown> }> = []
  const matches = new Map([
    ['semi-1', {
      id: 'semi-1', tournamentId: 't1', phaseId: 'phase-1', round: 1, position: 0,
      player1Id: 'p1', player2Id: 'p2', winnerId: 'p1', result: '6-4 6-3', status: 'completed',
    }],
    ['semi-bye', {
      id: 'semi-bye', tournamentId: 't1', phaseId: 'phase-1', round: 1, position: 1,
      player1Id: 'p3', player2Id: null, winnerId: null, result: null, status: 'waiting',
    }],
    ['final', {
      id: 'final', tournamentId: 't1', phaseId: 'phase-1', round: 2, position: 0,
      player1Id: null, player2Id: null, winnerId: null, result: null, status: 'waiting',
    }],
  ])
  const tx = {
    match: {
      findUnique: async ({ where }: { where: { id: string } }) => matches.get(where.id) ?? null,
      findFirst: async ({ where }: { where: { round: number; position: number } }) =>
        [...matches.values()].find(match => match.round === where.round && match.position === where.position) ?? null,
      findMany: async () => [...matches.values()].filter(match => match.round === 1),
      update: async (input: { where: { id: string }; data: Record<string, unknown> }) => {
        updates.push(input)
        const current = matches.get(input.where.id)
        const updated = { ...current, ...input.data }
        matches.set(input.where.id, updated as NonNullable<typeof current>)
        return updated
      },
    },
  } as unknown as Prisma.TransactionClient
  return { matches, tx, updates }
}

test('propagates a semifinal winner to the expected final slot', async () => {
  const { matches, tx } = progressionTransaction()

  await propagateMatchWinner(tx, 'semi-1', 'p1')

  assert.equal(matches.get('final')?.player1Id, 'p1')
  assert.equal(matches.get('final')?.player2Id, null)
})

test('records a bye and advances its only player once', async () => {
  const { matches, tx, updates } = progressionTransaction()

  await autoAdvanceByeMatches(tx, 't1', 'phase-1')

  assert.deepEqual(matches.get('semi-bye'), {
    id: 'semi-bye', tournamentId: 't1', phaseId: 'phase-1', round: 1, position: 1,
    player1Id: 'p3', player2Id: null, winnerId: 'p3', result: 'BYE', status: 'completed',
  })
  assert.equal(matches.get('final')?.player2Id, 'p3')
  assert.equal(updates.filter(update => update.where.id === 'final').length, 1)
})
