import { http } from './http'
import type { Player, PlayerCreate, PlayerUpdate, PlayersService } from '../types'

export const playersService: PlayersService = {
  getAll: () => http.get<Player[]>('/players'),
  getById: (id) => http.get<Player>(`/players/${id}`),
  create: (data: PlayerCreate) => http.post<Player>('/players', data),
  update: (id: string, data: PlayerUpdate) => http.put<Player>(`/players/${id}`, data),
  remove: (id: string) => http.delete<null>(`/players/${id}`),
  getMyPlayer: () => http.get<Player | null>('/players/me'),
}
