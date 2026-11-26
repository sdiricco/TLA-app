import assert from 'node:assert/strict'
import { test } from 'node:test'
import { buildBracketMatches, buildRoundRobinMatches } from './bracket'

// @req-covered CMP-003 CMP-004 CMP-005

function sequentialIds(prefix: string): () => string {
  let index = 0
  return () => `${prefix}-${index += 1}`
}

test('round robin creates every pair exactly once, including an odd-player bye', () => {
  const players = ['p1', 'p2', 'p3', 'p4', 'p5']
  const matches = buildRoundRobinMatches('tournament-1', players, sequentialIds('rr'))
  const pairs = matches.map(match => [match.player1_id, match.player2_id].sort().join(':'))

  assert.equal(matches.length, 10)
  assert.equal(new Set(pairs).size, 10)
  assert.equal(matches.every(match => match.tournament_id === 'tournament-1'), true)
  assert.equal(matches.every(match => match.status === 'ready'), true)
})

test('single elimination creates a power-of-two draw and separates top seeds', () => {
  const matches = buildBracketMatches(
    'tournament-1',
    ['seed-1', 'seed-2', 'p3', 'p4', 'p5'],
    sequentialIds('ko'),
  )
  const firstRound = matches.filter(match => match.round_index === 0)
  const seedOneMatch = firstRound.find(match => [match.player1_id, match.player2_id].includes('seed-1'))
  const seedTwoMatch = firstRound.find(match => [match.player1_id, match.player2_id].includes('seed-2'))

  assert.equal(matches.length, 7)
  assert.equal(firstRound.length, 4)
  assert.notEqual(seedOneMatch?.id, seedTwoMatch?.id)
  assert.equal(firstRound.some(match => match.player1_id === null || match.player2_id === null), true)
})
