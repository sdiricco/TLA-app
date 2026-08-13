import { http, HttpResponse } from 'msw'
import { mockTournaments } from '../data/tournaments'
import type { MockTournament, TournamentPhaseInput } from '../../types'

const tournaments: MockTournament[] = mockTournaments
const regulations = new Map<string, Blob>()

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

function syncFirstPhasePlayers(tournament: MockTournament): void {
  const firstPhase = tournament.phases?.slice().sort((left, right) => left.position - right.position)[0]
  if (!firstPhase) return
  firstPhase.players = tournament.playerIds.map((playerId, index) => ({
    player_id: playerId,
    seed: index + 1,
    qualified: false,
  }))
}

function createMockPhases(
  tournamentId: string,
  phaseInputs: TournamentPhaseInput[],
): NonNullable<MockTournament['phases']> {
  return phaseInputs.map((phase, index) => {
    const phaseId = `${tournamentId}-phase-${index + 1}`
    return {
      id: phaseId,
      tournament_id: tournamentId,
      position: index + 1,
      name: phase.name,
      description: phase.description?.trim() || (
        phase.format === 'round_robin'
          ? 'Calendario, risultati e classifica della fase.'
          : 'Tabellone e incontri a eliminazione diretta della fase.'
      ),
      format: phase.format,
      status: index === 0 ? 'active' as const : 'pending' as const,
      group_count: phase.group_count,
      output_count: phase.output_count,
      qualifiers_per_group: phase.qualifiers_per_group,
      groups: phase.format === 'round_robin'
        ? Array.from({ length: phase.group_count }, (_, groupIndex) => ({
            id: `${phaseId}-group-${groupIndex + 1}`,
            phase_id: phaseId,
            position: groupIndex + 1,
            name: phase.group_count === 1
              ? 'Girone unico'
              : `Girone ${String.fromCharCode(65 + groupIndex)}`,
          }))
        : [],
      players: [],
    }
  })
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
    const body = (await request.json()) as Omit<Partial<MockTournament>, 'phases'> & {
      phases?: TournamentPhaseInput[]
    }
    const tournamentId = `t-${Date.now()}`
    const { phases: phaseInputs, ...tournamentBody } = body
    const newTournament: MockTournament = {
      id: tournamentId,
      status: 'upcoming',
      playerIds: [],
      format: 'single_elimination',
      category: 'maschile',
      name: '',
      participant_limit: 32,
      ...tournamentBody,
      phases: createMockPhases(tournamentId, phaseInputs ?? [{
        name: body.format === 'round_robin' ? 'Girone unico' : 'Tabellone',
        description: body.format === 'round_robin'
          ? 'Calendario, risultati e classifica della fase.'
          : 'Tabellone e incontri a eliminazione diretta della fase.',
        format: body.format === 'round_robin' ? 'round_robin' : 'single_elimination',
        group_count: 1,
        output_count: 1,
        qualifiers_per_group: null,
      }]),
    }
    tournaments.push(newTournament)
    return HttpResponse.json(newTournament, { status: 201 })
  }),
  http.put('/api/tournaments/:id', async ({ params, request }) => {
    const index = tournaments.findIndex((t) => t.id === params['id'])
    if (index === -1) return HttpResponse.json({ message: 'Torneo non trovato' }, { status: 404 })
    const body = (await request.json()) as Omit<Partial<MockTournament>, 'phases'> & {
      phases?: TournamentPhaseInput[]
    }
    const { phases, ...tournamentBody } = body
    tournaments[index] = {
      ...tournaments[index]!,
      ...tournamentBody,
      ...(phases ? { phases: createMockPhases(tournaments[index]!.id, phases) } : {}),
    }
    syncFirstPhasePlayers(tournaments[index]!)
    return HttpResponse.json(tournaments[index])
  }),
  http.post('/api/tournaments/:id/regulation', async ({ params, request }) => {
    const tournament = tournaments.find((item) => item.id === params['id'])
    if (!tournament) return HttpResponse.json({ message: 'Torneo non trovato' }, { status: 404 })
    const file = await request.blob()
    if (file.size === 0) return HttpResponse.json({ message: 'Seleziona un file da caricare' }, { status: 400 })
    if (file.size > 6 * 1024 * 1024) {
      return HttpResponse.json({ message: 'Il regolamento non può superare 6 MB' }, { status: 400 })
    }
    const encodedName = request.headers.get('x-file-name') ?? ''
    tournament.regulation_name = decodeURIComponent(encodedName)
    tournament.regulation_content_type = request.headers.get('x-file-type') || 'application/octet-stream'
    tournament.regulation_size = file.size
    regulations.set(tournament.id, file)
    return HttpResponse.json(tournament, { status: 201 })
  }),
  http.get('/api/tournaments/:id/regulation', ({ params }) => {
    const tournament = tournaments.find((item) => item.id === params['id'])
    const file = tournament ? regulations.get(tournament.id) : undefined
    if (!tournament || !file) {
      return HttpResponse.json({ message: 'Regolamento non disponibile' }, { status: 404 })
    }
    return new HttpResponse(file, {
      headers: {
        'Content-Type': tournament.regulation_content_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${tournament.regulation_name ?? 'regolamento'}"`,
      },
    })
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
      syncFirstPhasePlayers(tournament)
    }
    return HttpResponse.json(tournament)
  }),
  http.delete('/api/tournaments/:id/players/:playerId', ({ params }) => {
    const tournament = tournaments.find((t) => t.id === params['id'])
    if (!tournament) return HttpResponse.json({ message: 'Torneo non trovato' }, { status: 404 })
    tournament.playerIds = tournament.playerIds.filter((id) => id !== params['playerId'])
    syncFirstPhasePlayers(tournament)
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
    if (!tournament.playerIds.includes(playerId)) {
      tournament.playerIds.push(playerId)
      syncFirstPhasePlayers(tournament)
    }
    return new HttpResponse(null, { status: 204 })
  }),
  http.delete('/api/tournaments/:id/enroll', async ({ params, request }) => {
    const { playerId } = (await request.json()) as { playerId: string }
    const tournament = tournaments.find((t) => t.id === params['id'])
    if (!tournament) return HttpResponse.json({ message: 'Non trovato' }, { status: 404 })
    tournament.playerIds = tournament.playerIds.filter((id) => id !== playerId)
    syncFirstPhasePlayers(tournament)
    return new HttpResponse(null, { status: 204 })
  }),
]
