import { http, HttpResponse } from 'msw'
import { mockMatches } from '../data/matches'
import { mockPlayers } from '../data/players'
import { mockTournaments } from '../data/tournaments'
import type { Match, MatchAssignInput, MatchResultInput } from '../../types'
import { buildBracketMatches, buildRoundRobinMatches, buildTournamentMatchesResponse, sortMatches } from '../../utils/matches'

let matches: Match[] = [...mockMatches]
const rankingByPlayerId = new Map(mockPlayers.map((player) => [player.id, player.ranking]))

function getImplicitWinnerId(match: Match): string | null {
  if (match.winner_id) return match.winner_id
  if (match.player1_id && !match.player2_id) return match.player1_id
  if (match.player2_id && !match.player1_id) return match.player2_id
  return null
}

function propagateWinner(matchId: string, winnerId: string): void {
  const currentMatch = matches.find((entry) => entry.id === matchId)
  if (!currentMatch) return

  const nextRound = currentMatch.round_index + 1
  const nextPosition = Math.floor(currentMatch.position / 2)
  const nextMatch = matches.find(
    (entry) =>
      entry.tournament_id === currentMatch.tournament_id &&
      entry.round_index === nextRound &&
      entry.position === nextPosition,
  )

  if (!nextMatch) return

  if (currentMatch.position % 2 === 0) nextMatch.player1_id = winnerId
  else nextMatch.player2_id = winnerId
  nextMatch.status = nextMatch.player1_id && nextMatch.player2_id ? 'ready' : 'waiting'
}

function autoAdvanceByeMatches(tournamentId: string): void {
  const tournamentMatches = sortMatches(
    matches.filter((entry) => entry.tournament_id === tournamentId && entry.round_index === 0),
  )
  for (const match of tournamentMatches) {
    const implicitWinnerId = getImplicitWinnerId(match)
    if (!implicitWinnerId || match.winner_id) continue
    match.winner_id = implicitWinnerId
    match.result = 'BYE'
    match.status = 'completed'
    propagateWinner(match.id, implicitWinnerId)
  }
}

export const matchHandlers = [
  http.get('/api/tournaments/:id/matches', ({ params }) => {
    const tournament = mockTournaments.find((entry) => entry.id === params['id'])
    if (!tournament) return HttpResponse.json({ message: 'Torneo non trovato' }, { status: 404 })
    const tournamentMatches = sortMatches(matches.filter((m) => m.tournament_id === params['id']))
    return HttpResponse.json(buildTournamentMatchesResponse({
      id: tournament.id,
      name: tournament.name,
      format: tournament.format,
      category: tournament.category,
      status: tournament.status,
    }, tournament.playerIds.length, tournamentMatches))
  }),

  http.post('/api/tournaments/:id/bracket', async ({ params, request }) => {
    const { numPlayers } = (await request.json()) as { numPlayers: number }
    const tournamentId = params['id'] as string
    matches = matches.filter((m) => m.tournament_id !== tournamentId)
    const tournament = mockTournaments.find((entry) => entry.id === tournamentId)
    const playerIds = (tournament?.playerIds ?? [])
      .sort(
        (a, b) =>
          (rankingByPlayerId.get(a) ?? Number.MAX_SAFE_INTEGER) -
          (rankingByPlayerId.get(b) ?? Number.MAX_SAFE_INTEGER),
      )
      .slice(0, numPlayers)
    const newMatches = tournament?.format === 'round_robin'
      ? buildRoundRobinMatches(tournamentId, playerIds, () => crypto.randomUUID())
      : buildBracketMatches(tournamentId, playerIds, () => crypto.randomUUID())
    matches = sortMatches([...matches, ...newMatches])
    if (tournament?.format !== 'round_robin') autoAdvanceByeMatches(tournamentId)
    return HttpResponse.json(sortMatches(matches.filter((entry) => entry.tournament_id === tournamentId)))
  }),

  http.patch('/api/matches/:id/assign', async ({ params, request }) => {
    const body = (await request.json()) as MatchAssignInput
    const index = matches.findIndex((m) => m.id === params['id'])
    if (index === -1) return HttpResponse.json({ message: 'Non trovato' }, { status: 404 })
    const match = { ...matches[index]! }
    if (body.slot === 'player1_id') match.player1_id = body.player_id
    else match.player2_id = body.player_id
    // If clearing a player, also clear winner/result
    if (body.player_id === null) {
      match.winner_id = null
      match.result = null
    }
    match.status = match.player1_id && match.player2_id ? 'ready' : 'waiting'
    matches[index] = match
    return HttpResponse.json(match)
  }),

  http.put('/api/matches/:id', async ({ params, request }) => {
    const body = (await request.json()) as MatchResultInput
    const index = matches.findIndex((m) => m.id === params['id'])
    if (index === -1) return HttpResponse.json({ message: 'Non trovato' }, { status: 404 })
    matches[index] = { ...matches[index]!, result: body.result, winner_id: body.winner_id, status: 'completed' }
    const tournament = mockTournaments.find((entry) => entry.id === matches[index]!.tournament_id)
    if (tournament?.format !== 'round_robin') propagateWinner(matches[index]!.id, body.winner_id)
    return HttpResponse.json(matches[index])
  }),

  http.delete('/api/tournaments/:id/matches', ({ params }) => {
    matches = matches.filter((m) => m.tournament_id !== params['id'])
    return new HttpResponse(null, { status: 204 })
  }),
]
