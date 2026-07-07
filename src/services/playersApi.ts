import type {
  PaginatedResponse,
  Player,
  PlayerCreate,
  PlayerListQuery,
  PlayerMatchHistory,
  PlayerUpdate,
  PlayersService,
} from '../types'
import { apiClient } from './apiClient'
import { apiRequest } from './request'

export const playersService: PlayersService = {
  getAll: (query?: PlayerListQuery) =>
    apiRequest<PaginatedResponse<Player>>(apiClient, {
      url: '/players',
      method: 'GET',
      params: query,
    }),
  getById: (id) => apiRequest<Player>(apiClient, { url: `/players/${id}`, method: 'GET' }),
  getMatchHistory: (id) => apiRequest<PlayerMatchHistory>(apiClient, { url: `/players/${id}/matches`, method: 'GET' }),
  create: (data: PlayerCreate) => apiRequest<Player>(apiClient, { url: '/players', method: 'POST', data }),
  update: (id: string, data: PlayerUpdate) =>
    apiRequest<Player>(apiClient, { url: `/players/${id}`, method: 'PUT', data }),
  remove: (id: string) => apiRequest<null>(apiClient, { url: `/players/${id}`, method: 'DELETE' }),
  getMyPlayer: () => apiRequest<Player | null>(apiClient, { url: '/players/me', method: 'GET' }),
}
