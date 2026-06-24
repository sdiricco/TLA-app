import { http, HttpResponse } from 'msw'
import { mockPlayers } from '../data/players'
import type { Player } from '../../types'

const players: Player[] = [...mockPlayers]
const GUEST_TOKEN = 'tla_guest_token'

export const playerHandlers = [
  http.get('/api/players', () => HttpResponse.json(players)),
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
  http.get('/api/players/:id', ({ params }) => {
    const player = players.find((p) => p.id === params['id'])
    if (!player) return HttpResponse.json({ message: 'Giocatore non trovato' }, { status: 404 })
    return HttpResponse.json(player)
  }),
  http.post('/api/players', async ({ request }) => {
    const body = (await request.json()) as Omit<Player, 'id'>
    const newPlayer: Player = { id: `p-${Date.now()}`, ...body }
    players.push(newPlayer)
    return HttpResponse.json(newPlayer, { status: 201 })
  }),
  http.put('/api/players/:id', async ({ params, request }) => {
    const index = players.findIndex((p) => p.id === params['id'])
    if (index === -1) return HttpResponse.json({ message: 'Giocatore non trovato' }, { status: 404 })
    const body = (await request.json()) as Partial<Player>
    players[index] = { ...players[index]!, ...body }
    return HttpResponse.json(players[index])
  }),
  http.delete('/api/players/:id', ({ params }) => {
    const index = players.findIndex((p) => p.id === params['id'])
    if (index === -1) return HttpResponse.json({ message: 'Giocatore non trovato' }, { status: 404 })
    players.splice(index, 1)
    return new HttpResponse(null, { status: 204 })
  }),
]
