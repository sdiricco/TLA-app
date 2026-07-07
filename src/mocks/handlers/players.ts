import { http, HttpResponse } from 'msw'
import { mockPlayers } from '../data/players'
import type { PaginatedResponse, Player, PlayerMatchHistory, PlayerSortField, SortOrder } from '../../types'

const players: Player[] = [...mockPlayers]
const GUEST_TOKEN = 'tla_guest_token'
const completedMatches = [
  { id: 'm-1', tournamentId: 't-1', tournamentName: 'Torneo Primaverile 2025', player1Id: 'p-1', player2Id: 'p-2', winnerId: 'p-1', result: '6-4 6-3', playedAt: '2025-05-18T16:00:00.000Z' },
  { id: 'm-2', tournamentId: 't-2', tournamentName: 'Open Estivo 2025', player1Id: 'p-3', player2Id: 'p-1', winnerId: 'p-3', result: '7-5 4-6 10-7', playedAt: '2025-07-12T18:00:00.000Z' },
  { id: 'm-3', tournamentId: 't-2', tournamentName: 'Open Estivo 2025', player1Id: 'p-1', player2Id: 'p-5', winnerId: 'p-1', result: '6-2 6-4', playedAt: '2025-07-10T17:00:00.000Z' },
  { id: 'm-4', tournamentId: 't-1', tournamentName: 'Torneo Primaverile 2025', player1Id: 'p-4', player2Id: 'p-2', winnerId: 'p-2', result: '3-6 6-3 8-10', playedAt: '2025-05-16T15:30:00.000Z' },
  { id: 'm-5', tournamentId: 't-1', tournamentName: 'Torneo Primaverile 2025', player1Id: 'p-3', player2Id: 'p-5', winnerId: 'p-5', result: '4-6 5-7', playedAt: '2025-05-14T14:00:00.000Z' },
]

function matchesFilter(value: string | null | undefined, filter: string | null): boolean {
  if (!filter) return true
  return (value ?? '').toLowerCase().includes(filter.toLowerCase())
}

function toPaginatedResponse(list: Player[], page: number, perPage: number): PaginatedResponse<Player> {
  const start = page * perPage
  return {
    page,
    perPage,
    total: list.length,
    values: list.slice(start, start + perPage),
  }
}

function compareNullableText(left: string | null | undefined, right: string | null | undefined, order: SortOrder): number {
  const leftValue = left?.trim() ?? ''
  const rightValue = right?.trim() ?? ''
  return order === 'asc' ? leftValue.localeCompare(rightValue) : rightValue.localeCompare(leftValue)
}

function compareNumbers(left: number, right: number, order: SortOrder): number {
  return order === 'asc' ? left - right : right - left
}

function sortPlayers(list: Player[], sortBy: PlayerSortField, sortOrder: SortOrder): Player[] {
  return [...list].sort((left, right) => {
    switch (sortBy) {
      case 'name':
        return compareNullableText(left.name, right.name, sortOrder) || compareNumbers(left.ranking, right.ranking, 'asc')
      case 'club':
        return compareNullableText(left.club, right.club, sortOrder) || compareNullableText(left.name, right.name, 'asc')
      case 'created_at':
        return compareNullableText(left.created_at, right.created_at, sortOrder) || compareNullableText(left.name, right.name, 'asc')
      case 'ranking':
      default:
        return compareNumbers(left.ranking, right.ranking, sortOrder) || compareNullableText(left.name, right.name, 'asc')
    }
  })
}

export const playerHandlers = [
  http.get('/api/players', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '0')
    const perPage = Number(url.searchParams.get('perPage') ?? '20')
    const name = url.searchParams.get('name')
    const club = url.searchParams.get('club')
    const sortBy = (url.searchParams.get('sortBy') as PlayerSortField | null) ?? 'ranking'
    const sortOrder = (url.searchParams.get('sortOrder') as SortOrder | null) ?? 'asc'
    const filtered = players
      .filter((player) => matchesFilter(player.name, name))
      .filter((player) => matchesFilter(player.club, club))
    const sorted = sortPlayers(filtered, sortBy, sortOrder)
    return HttpResponse.json(toPaginatedResponse(sorted, page, perPage))
  }),
  http.get('/api/players/me', ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (auth === `Bearer ${GUEST_TOKEN}`) {
      return HttpResponse.json(null)
    }
    if (!auth?.startsWith('Bearer mock-jwt-token-')) {
      return HttpResponse.json({ message: 'Non autorizzato' }, { status: 401 })
    }
    const userId = auth.replace('Bearer mock-jwt-token-', '')
    const playerMap: Record<string, string> = { 'user-2': 'p-1' }
    const playerId = playerMap[userId]
    if (!playerId) return HttpResponse.json(null)
    const player = players.find((p) => p.id === playerId)
    return player ? HttpResponse.json(player) : HttpResponse.json(null)
  }),
  http.get('/api/players/:id/matches', ({ params }) => {
    const playerId = String(params['id'])
    if (!players.some((player) => player.id === playerId)) {
      return HttpResponse.json({ message: 'Giocatore non trovato' }, { status: 404 })
    }
    const matches = completedMatches
      .filter((match) => match.player1Id === playerId || match.player2Id === playerId)
      .sort((left, right) => right.playedAt.localeCompare(left.playedAt))
      .slice(0, 5)
    const wins = matches.filter((match) => match.winnerId === playerId).length
    const response: PlayerMatchHistory = {
      stats: { played: matches.length, wins, losses: matches.length - wins, win_rate: matches.length ? Math.round((wins / matches.length) * 100) : 0 },
      recent_form: matches.map((match) => match.winnerId === playerId ? 'win' : 'loss'),
      recent_matches: matches.map((match) => {
        const opponentId = match.player1Id === playerId ? match.player2Id : match.player1Id
        const opponent = players.find((player) => player.id === opponentId)!
        return {
          id: match.id,
          tournament_id: match.tournamentId,
          tournament_name: match.tournamentName,
          opponent_id: opponent.id,
          opponent_name: opponent.name,
          opponent_photo_url: opponent.photo_url,
          result: match.result,
          outcome: match.winnerId === playerId ? 'win' : 'loss',
          played_at: match.playedAt,
        }
      }),
    }
    return HttpResponse.json(response)
  }),
  http.get('/api/players/:id', ({ params }) => {
    const player = players.find((p) => p.id === params['id'])
    if (!player) return HttpResponse.json({ message: 'Giocatore non trovato' }, { status: 404 })
    return HttpResponse.json(player)
  }),
  http.post('/api/players', async ({ request }) => {
    const body = (await request.json()) as Omit<Player, 'id'>
    const now = new Date().toISOString()
    const newPlayer: Player = { id: `p-${Date.now()}`, created_at: now, updated_at: now, ...body }
    players.push(newPlayer)
    return HttpResponse.json(newPlayer, { status: 201 })
  }),
  http.put('/api/players/:id', async ({ params, request }) => {
    const index = players.findIndex((p) => p.id === params['id'])
    if (index === -1) return HttpResponse.json({ message: 'Giocatore non trovato' }, { status: 404 })
    const body = (await request.json()) as Partial<Player>
    players[index] = { ...players[index]!, ...body, updated_at: new Date().toISOString() }
    return HttpResponse.json(players[index])
  }),
  http.delete('/api/players/:id', ({ params }) => {
    const index = players.findIndex((p) => p.id === params['id'])
    if (index === -1) return HttpResponse.json({ message: 'Giocatore non trovato' }, { status: 404 })
    players.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
