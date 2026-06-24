import type { Match } from '../types'

export function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => a.round - b.round || a.position - b.position)
}

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(Math.max(2, value)))
}

function buildSeedSlotOrder(size: number): number[] {
  let order = [0, 1]
  while (order.length < size) {
    const next: number[] = []
    const roundSize = order.length * 2
    for (const slot of order) {
      next.push(slot)
      next.push(roundSize - 1 - slot)
    }
    order = next
  }
  return order
}

function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

export function buildBracketMatches(
  tournamentId: string,
  playerIds: string[],
  createId: () => string,
  random: () => number = Math.random,
): Match[] {
  if (playerIds.length < 2) return []

  const bracketSize = nextPowerOfTwo(playerIds.length)
  const numRounds = Math.log2(bracketSize)
  const seedSlots = buildSeedSlotOrder(bracketSize)
  const seededCount = bracketSize <= 4 ? Math.min(playerIds.length, 2) : Math.min(playerIds.length, Math.floor(bracketSize / 4))
  const slots: Array<string | null> = Array.from({ length: bracketSize }, () => null)
  const seededPlayers = playerIds.slice(0, seededCount)
  const drawnPlayers = shuffle(playerIds.slice(seededCount), random)

  seededPlayers.forEach((playerId, index) => {
    const slotIndex = seedSlots[index]
    if (slotIndex !== undefined) {
      slots[slotIndex] = playerId
    }
  })

  let drawIndex = 0
  for (const slotIndex of seedSlots.slice(seededCount)) {
    const playerId = drawnPlayers[drawIndex]
    if (playerId === undefined) break
    slots[slotIndex] = playerId
    drawIndex += 1
  }

  const matches: Match[] = []

  for (let position = 0; position < bracketSize / 2; position += 1) {
    const player1 = slots[position * 2] ?? null
    const player2 = slots[position * 2 + 1] ?? null
    matches.push({
      id: createId(),
      tournament_id: tournamentId,
      round: 1,
      position,
      player1_id: player1,
      player2_id: player2,
      result: null,
      winner_id: null,
      status: 'pending',
    })
  }

  for (let round = 2; round <= numRounds; round += 1) {
    const matchesInRound = 2 ** (numRounds - round)
    for (let position = 0; position < matchesInRound; position += 1) {
      matches.push({
        id: createId(),
        tournament_id: tournamentId,
        round,
        position,
        player1_id: null,
        player2_id: null,
        result: null,
        winner_id: null,
        status: 'pending',
      })
    }
  }

  return matches
}
