import type { Match, TournamentMatchesResponse } from '../types'

export function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => a.round_index - b.round_index || a.position - b.position)
}

const FINAL_ROUND_LABELS: Record<number, { name: string; short_name: string }> = {
  1: { name: 'Finale', short_name: 'F' },
  2: { name: 'Semifinali', short_name: 'SF' },
  3: { name: 'Quarti di finale', short_name: 'QF' },
  4: { name: 'Ottavi di finale', short_name: 'R16' },
}

export function getRoundMetadata(index: number, roundsCount: number): { name: string; short_name: string } {
  const remainingRounds = roundsCount - index
  const finalLabel = FINAL_ROUND_LABELS[remainingRounds]
  if (finalLabel) return finalLabel

  const drawSize = 2 ** remainingRounds
  return { name: `Turno dei ${drawSize}`, short_name: `R${drawSize}` }
}

export function buildTournamentMatchesResponse(
  tournament: TournamentMatchesResponse['tournament'],
  participantsCount: number,
  matches: Match[],
): TournamentMatchesResponse {
  const sortedMatches = sortMatches(matches)
  const roundsCount = sortedMatches.length === 0
    ? 0
    : Math.max(...sortedMatches.map((match) => match.round_index)) + 1
  const drawSize = sortedMatches.filter((match) => match.round_index === 0).length * 2
  const rounds = Array.from({ length: roundsCount }, (_, index) => {
    const roundMatches = sortedMatches.filter((match) => match.round_index === index)
    const metadata = tournament.format === 'round_robin'
      ? { name: `Giornata ${index + 1}`, short_name: `G${index + 1}` }
      : getRoundMetadata(index, roundsCount)
    return {
      index,
      ...metadata,
      matches_count: roundMatches.length,
      completed_matches_count: roundMatches.filter((match) => match.status === 'completed').length,
    }
  })

  return {
    tournament,
    draw: { draw_size: drawSize, participants_count: participantsCount, rounds_count: roundsCount },
    rounds,
    matches: sortedMatches,
  }
}

export function buildRoundRobinMatches(
  tournamentId: string,
  playerIds: string[],
  createId: () => string,
): Match[] {
  if (playerIds.length < 2) return []

  const bye = '__bye__'
  const rotation = playerIds.length % 2 === 0 ? [...playerIds] : [...playerIds, bye]
  const roundsCount = rotation.length - 1
  const matches: Match[] = []

  for (let roundIndex = 0; roundIndex < roundsCount; roundIndex += 1) {
    let position = 0
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const first = rotation[index]!
      const second = rotation[rotation.length - 1 - index]!
      if (first === bye || second === bye) continue

      // Alternating the home/away order avoids always placing the fixed player first.
      const reverse = (roundIndex + index) % 2 === 1
      matches.push({
        id: createId(),
        tournament_id: tournamentId,
        round_index: roundIndex,
        position,
        player1_id: reverse ? second : first,
        player2_id: reverse ? first : second,
        result: null,
        winner_id: null,
        status: 'ready',
      })
      position += 1
    }

    rotation.splice(1, 0, rotation.pop()!)
  }

  return matches
}

function nextPowerOfTwo(value: number): number {
  return 2 ** Math.ceil(Math.log2(Math.max(2, value)))
}

export function getSeededPlayersCount(participantsCount: number): number {
  if (participantsCount < 2) return 0
  const bracketSize = nextPowerOfTwo(participantsCount)
  return bracketSize <= 4
    ? Math.min(participantsCount, 2)
    : Math.min(participantsCount, bracketSize / 4)
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
  const seededCount = getSeededPlayersCount(playerIds.length)
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
      round_index: 0,
      position,
      player1_id: player1,
      player2_id: player2,
      result: null,
      winner_id: null,
      status: player1 && player2 ? 'ready' : 'waiting',
    })
  }

  for (let roundIndex = 1; roundIndex < numRounds; roundIndex += 1) {
    const matchesInRound = 2 ** (numRounds - roundIndex - 1)
    for (let position = 0; position < matchesInRound; position += 1) {
      matches.push({
        id: createId(),
        tournament_id: tournamentId,
        round_index: roundIndex,
        position,
        player1_id: null,
        player2_id: null,
        result: null,
        winner_id: null,
        status: 'waiting',
      })
    }
  }

  return matches
}
