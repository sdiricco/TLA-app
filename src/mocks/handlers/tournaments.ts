import { http, HttpResponse } from 'msw'
import { mockTournaments } from '../data/tournaments'
import type { MockTournament } from '../../types'

const tournaments: MockTournament[] = [...mockTournaments]

export const tournamentHandlers = [
  http.get('/api/tournaments', () => HttpResponse.json(tournaments)),
  http.get('/api/tournaments/:id', ({ params }) => {
    const tournament = tournaments.find((t) => t.id === params['id'])
    if (!tournament) return HttpResponse.json({ message: 'Torneo non trovato' }, { status: 404 })
    return HttpResponse.json(tournament)
  }),
  http.post('/api/tournaments', async ({ request }) => {
    const body = (await request.json()) as Partial<MockTournament>
    const newTournament: MockTournament = {
      id: `t-${Date.now()}`,
      status: 'upcoming',
      playerIds: [],
      format: 'single_elimination',
      category: 'singles',
      name: '',
      participant_limit: 32,
      ...body,
    }
    tournaments.push(newTournament)
    return HttpResponse.json(newTournament, { status: 201 })
  }),
  http.put('/api/tournaments/:id', async ({ params, request }) => {
    const index = tournaments.findIndex((t) => t.id === params['id'])
    if (index === -1) return HttpResponse.json({ message: 'Torneo non trovato' }, { status: 404 })
    const body = (await request.json()) as Partial<MockTournament>
    tournaments[index] = { ...tournaments[index]!, ...body }
    return HttpResponse.json(tournaments[index])
  }),
  http.delete('/api/tournaments/:id', ({ params }) => {
    const index = tournaments.findIndex((t) => t.id === params['id'])
    if (index === -1) return HttpResponse.json({ message: 'Torneo non trovato' }, { status: 404 })
    tournaments.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
  http.post('/api/tournaments/:id/players', async ({ params, request }) => {
    const tournament = tournaments.find((t) => t.id === params['id'])
    if (!tournament) return HttpResponse.json({ message: 'Torneo non trovato' }, { status: 404 })
    const { playerId } = (await request.json()) as { playerId: string }
    if (tournament.participant_limit && !tournament.playerIds.includes(playerId) && tournament.playerIds.length >= tournament.participant_limit) {
      return HttpResponse.json({ message: 'Torneo al completo' }, { status: 400 })
    }
    if (!tournament.playerIds.includes(playerId)) {
      tournament.playerIds.push(playerId)
    }
    return HttpResponse.json(tournament)
  }),
  http.delete('/api/tournaments/:id/players/:playerId', ({ params }) => {
    const tournament = tournaments.find((t) => t.id === params['id'])
    if (!tournament) return HttpResponse.json({ message: 'Torneo non trovato' }, { status: 404 })
    tournament.playerIds = tournament.playerIds.filter((id) => id !== params['playerId'])
    return HttpResponse.json(tournament)
  }),
  http.patch('/api/tournaments/:id/publish', async ({ params, request }) => {
    const { published } = (await request.json()) as { published: boolean }
    const tournament = tournaments.find((t) => t.id === params['id'])
    if (!tournament) return HttpResponse.json({ message: 'Non trovato' }, { status: 404 })
    tournament.published = published
    return HttpResponse.json({ ...tournament })
  }),
  http.post('/api/tournaments/:id/enroll', async ({ params, request }) => {
    const { playerId } = (await request.json()) as { playerId: string }
    const tournament = tournaments.find((t) => t.id === params['id'])
    if (!tournament) return HttpResponse.json({ message: 'Non trovato' }, { status: 404 })
    if (tournament.participant_limit && !tournament.playerIds.includes(playerId) && tournament.playerIds.length >= tournament.participant_limit) {
      return HttpResponse.json({ message: 'Torneo al completo' }, { status: 400 })
    }
    if (!tournament.playerIds.includes(playerId)) tournament.playerIds.push(playerId)
    return new HttpResponse(null, { status: 204 })
  }),
  http.delete('/api/tournaments/:id/enroll', async ({ params, request }) => {
    const { playerId } = (await request.json()) as { playerId: string }
    const tournament = tournaments.find((t) => t.id === params['id'])
    if (!tournament) return HttpResponse.json({ message: 'Non trovato' }, { status: 404 })
    tournament.playerIds = tournament.playerIds.filter((id) => id !== playerId)
    return new HttpResponse(null, { status: 204 })
  }),
]
