import type { Match } from '../../../src/types'

export function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => a.round - b.round || a.position - b.position)
}

export function buildEmptyBracket(
  tournamentId: string,
  numPlayers: number,
  createId: () => string,
): Match[] {
  if (numPlayers < 2) return []
  const numRounds = Math.ceil(Math.log2(numPlayers))
  const matches: Match[] = []
  for (let round = 1; round <= numRounds; round++) {
    const matchesInRound = Math.pow(2, numRounds - round)
    for (let position = 0; position < matchesInRound; position++) {
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
