import type { Match, MatchSet } from '../types'

function cloneMatch(match: Match): Match {
  return {
    ...match,
    sets: match.sets.map((set) => ({ ...set })),
  }
}

export function bracketOrder(n: number): number[] {
  if (n === 2) return [1, 2]
  const prev = bracketOrder(n / 2)
  const result: number[] = []
  for (const p of prev) result.push(p, n + 1 - p)
  return result
}

export function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => a.round - b.round || a.position - b.position)
}

export function getWalkoverWinnerId(match: Pick<Match, 'player1_id' | 'player2_id' | 'winner_id'>): string | null {
  if (match.winner_id) return match.winner_id
  if (match.player1_id && !match.player2_id) return match.player1_id
  if (match.player2_id && !match.player1_id) return match.player2_id
  return null
}

function autoAdvanceWalkoversInPlace(matches: Match[]): void {
  let changed = true

  while (changed) {
    changed = false

    for (const match of sortMatches(matches)) {
      if (match.winner_id) continue

      const winnerId = getWalkoverWinnerId(match)
      if (!winnerId) continue

      match.winner_id = winnerId
      match.status = 'completed'
      match.sets = []

      const nextRound = match.round + 1
      const nextPosition = Math.floor(match.position / 2)
      const nextMatch = matches.find(
        (candidate) =>
          candidate.tournament_id === match.tournament_id &&
          candidate.round === nextRound &&
          candidate.position === nextPosition,
      )

      if (nextMatch) {
        if (match.position % 2 === 0) nextMatch.player1_id = winnerId
        else nextMatch.player2_id = winnerId
      }

      changed = true
    }
  }
}

export function buildDrawMatches(
  tournamentId: string,
  seededPlayerIds: string[],
  createId: () => string,
): Match[] {
  if (seededPlayerIds.length < 2) return []

  const numRounds = Math.ceil(Math.log2(seededPlayerIds.length))
  const bracketSize = Math.pow(2, numRounds)
  const paddedPlayerIds = [
    ...seededPlayerIds,
    ...Array.from<string | null>({ length: bracketSize - seededPlayerIds.length }).fill(null),
  ]
  const order = bracketOrder(bracketSize)
  const matches: Match[] = []

  for (let position = 0; position < bracketSize / 2; position += 1) {
    const player1Id = paddedPlayerIds[order[position * 2]! - 1] ?? null
    const player2Id = paddedPlayerIds[order[position * 2 + 1]! - 1] ?? null
    const winnerId = getWalkoverWinnerId({ player1_id: player1Id, player2_id: player2Id, winner_id: null })

    matches.push({
      id: createId(),
      tournament_id: tournamentId,
      round: 1,
      position,
      player1_id: player1Id,
      player2_id: player2Id,
      sets: [],
      winner_id: winnerId,
      status: winnerId ? 'completed' : 'pending',
    })
  }

  for (let round = 2; round <= numRounds; round += 1) {
    const matchesInRound = bracketSize / Math.pow(2, round)
    for (let position = 0; position < matchesInRound; position += 1) {
      matches.push({
        id: createId(),
        tournament_id: tournamentId,
        round,
        position,
        player1_id: null,
        player2_id: null,
        sets: [],
        winner_id: null,
        status: 'pending',
      })
    }
  }

  autoAdvanceWalkoversInPlace(matches)
  return sortMatches(matches)
}

export function advanceWinnerInMemory(
  matches: Match[],
  tournamentId: string,
  round: number,
  position: number,
  winnerId: string,
): Match[] {
  const nextMatches = matches.map(cloneMatch)
  const nextRound = round + 1
  const nextPosition = Math.floor(position / 2)
  const nextMatch = nextMatches.find(
    (candidate) =>
      candidate.tournament_id === tournamentId &&
      candidate.round === nextRound &&
      candidate.position === nextPosition,
  )

  if (nextMatch) {
    if (position % 2 === 0) nextMatch.player1_id = winnerId
    else nextMatch.player2_id = winnerId
  }

  autoAdvanceWalkoversInPlace(nextMatches)
  return sortMatches(nextMatches)
}

export function countSetsWon(sets: MatchSet[]): { p1: number; p2: number } {
  return sets.reduce(
    (total, set) => ({
      p1: total.p1 + (set.p1 > set.p2 ? 1 : 0),
      p2: total.p2 + (set.p2 > set.p1 ? 1 : 0),
    }),
    { p1: 0, p2: 0 },
  )
}

export function formatMatchScore(sets: MatchSet[]): string {
  return sets.map((set) => `${set.p1}-${set.p2}`).join(' ')
}
