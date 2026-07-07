import { http, HttpResponse } from 'msw'
import { mockTournaments } from '../data/tournaments'
import type { MockTournament } from '../../types'

const tournaments: MockTournament[] = [...mockTournaments]

function matchesFilter(value: string | null | undefined, filter: string | null): boolean {
  if (!filter) return true
  return (value ?? '').toLowerCase().includes(filter.toLowerCase())
}

function toPaginatedResponse(list: MockTournament[], page: number, perPage: number) {
  const start = page * perPage
  return {
    page,
    perPage,
    total: list.length,
    values: list.slice(start, start + perPage),
  }
}

function parseQueryInt(value: string | null, fallback: number, min: number): number {
  const parsed = value === null ? fallback : Number(value)
  if (!Number.isInteger(parsed) || parsed < min) return fallback
  return parsed
}

export const tournamentHandlers = [
  http.get('/api/tournaments', ({ request }) => {
    const url = new URL(request.url)
    const page = parseQueryInt(url.searchParams.get('page'), 0, 0)
    const perPage = parseQueryInt(url.searchParams.get('perPage'), 12, 1)
    const name = url.searchParams.get('name')
    const category = url.searchParams.get('category')
    const status = url.searchParams.get('status')
    const dateFrom = url.searchParams.get('dateFrom')
    const dateTo = url.searchParams.get('dateTo')
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null
    const filtered = tournaments
      .filter((tournament) => matchesFilter(tournament.name, name))
      .filter((tournament) => (category ? tournament.category === category : true))
      .filter((tournament) => (status ? tournament.status === status : true))
      .filter((tournament) => {
        if (fromTime === null && toTime === null) return true
        const startTime = tournament.start_date ? new Date(tournament.start_date).getTime() : null
        if (startTime === null) return false
        const endTime = tournament.end_date ? new Date(tournament.end_date).getTime() : startTime
        return (fromTime === null || endTime >= fromTime) && (toTime === null || startTime <= toTime)
      })
      .sort((a, b) => new Date(b.start_date ?? 0).getTime() - new Date(a.start_date ?? 0).getTime())
    return HttpResponse.json(toPaginatedResponse(filtered, page, perPage))
  }),
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
      category: 'maschile',
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
