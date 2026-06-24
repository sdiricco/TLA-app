import type { Match } from '../../../src/types'
import { buildBracketMatches as buildBracketMatchesShared, sortMatches } from '../../../src/utils/matches'

export { sortMatches }

export function buildBracketMatches(
  tournamentId: string,
  playerIds: string[],
  createId: () => string,
): Match[] {
  return buildBracketMatchesShared(tournamentId, playerIds, createId)
}
