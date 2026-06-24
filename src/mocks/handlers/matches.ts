import { http, HttpResponse } from 'msw'
import { mockMatches } from '../data/matches'
import { mockPlayers } from '../data/players'
import type { Match, MatchAssignInput, MatchResultInput } from '../../types'
import { buildBracketMatches, sortMatches } from '../../utils/matches'

let matches: Match[] = [...mockMatches]
const rankingByPlayerId = new Map(mockPlayers.map((player) => [player.id, player.ranking]))

export const matchHandlers = [
  http.get('/api/tournaments/:id/matches', ({ params }) => {
    const tournamentMatches = sortMatches(matches.filter((m) => m.tournament_id === params['id']))
    return HttpResponse.json(tournamentMatches)
  }),

  http.post('/api/tournaments/:id/bracket', async ({ params, request }) => {
    const { numPlayers } = (await request.json()) as { numPlayers: number }
    const tournamentId = params['id'] as string
    matches = matches.filter((m) => m.tournament_id !== tournamentId)
    const playerIds = mockPlayers
      .map((player) => player.id)
      .sort(
        (a, b) =>
          (rankingByPlayerId.get(a) ?? Number.MAX_SAFE_INTEGER) -
          (rankingByPlayerId.get(b) ?? Number.MAX_SAFE_INTEGER),
      )
      .slice(0, numPlayers)
    const newMatches = buildBracketMatches(tournamentId, playerIds, () => crypto.randomUUID())
    matches = sortMatches([...matches, ...newMatches])
    return HttpResponse.json(newMatches)
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
      match.status = 'pending'
    }
    matches[index] = match
    return HttpResponse.json(match)
  }),

  http.put('/api/matches/:id', async ({ params, request }) => {
    const body = (await request.json()) as MatchResultInput
    const index = matches.findIndex((m) => m.id === params['id'])
    if (index === -1) return HttpResponse.json({ message: 'Non trovato' }, { status: 404 })
    matches[index] = { ...matches[index]!, result: body.result, winner_id: body.winner_id, status: 'completed' }
    return HttpResponse.json(matches[index])
  }),

  http.delete('/api/tournaments/:id/matches', ({ params }) => {
    matches = matches.filter((m) => m.tournament_id !== params['id'])
    return new HttpResponse(null, { status: 204 })
  }),
]
