import { http, HttpResponse } from 'msw'
import { mockMatches } from '../data/matches'
import type { Match, MatchResultInput } from '../../types'
import { advanceWinnerInMemory, buildDrawMatches, sortMatches } from '../../utils/matches'

let matches: Match[] = mockMatches.map((match) => ({
  ...match,
  sets: match.sets.map((set) => ({ ...set })),
}))

export const matchHandlers = [
  http.get('/api/tournaments/:id/matches', ({ params }) => {
    const tournamentMatches = sortMatches(matches.filter((match) => match.tournament_id === params['id']))
    return HttpResponse.json(tournamentMatches)
  }),

  http.post('/api/tournaments/:id/draw', async ({ params, request }) => {
    const { playerIds } = (await request.json()) as { playerIds: string[] }
    const tournamentId = params['id'] as string

    matches = matches.filter((match) => match.tournament_id !== tournamentId)
    const generatedMatches = buildDrawMatches(tournamentId, playerIds, () => crypto.randomUUID())
    matches = sortMatches([...matches, ...generatedMatches])

    return HttpResponse.json(generatedMatches)
  }),

  http.put('/api/matches/:id', async ({ params, request }) => {
    const index = matches.findIndex((match) => match.id === params['id'])
    if (index === -1) return HttpResponse.json({ message: 'Match non trovato' }, { status: 404 })

    const body = (await request.json()) as MatchResultInput
    const currentMatch = matches[index]!
    const updatedMatch: Match = {
      ...currentMatch,
      sets: body.sets,
      winner_id: body.winner_id,
      status: 'completed',
    }

    matches[index] = updatedMatch
    matches = advanceWinnerInMemory(matches, updatedMatch.tournament_id, updatedMatch.round, updatedMatch.position, body.winner_id)

    return HttpResponse.json(matches.find((match) => match.id === updatedMatch.id))
  }),

  http.delete('/api/tournaments/:id/matches', ({ params }) => {
    matches = matches.filter((match) => match.tournament_id !== params['id'])
    return new HttpResponse(null, { status: 204 })
  }),
]
