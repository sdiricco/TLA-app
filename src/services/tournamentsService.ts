import { http } from './http'
import type { Tournament, TournamentCreate, TournamentsService, TournamentUpdate, TournamentWithPlayers } from '../types'

export const tournamentsService: TournamentsService = {
  getAll: () => http.get<Tournament[]>('/tournaments'),
  getById: (id) => http.get<TournamentWithPlayers>(`/tournaments/${id}`),
  create: (data: TournamentCreate) => http.post<Tournament>('/tournaments', data),
  update: (id, data: TournamentUpdate) => http.put<Tournament>(`/tournaments/${id}`, data),
  remove: (id) => http.delete<null>(`/tournaments/${id}`),
  addPlayer: (tournamentId, playerId) => http.post<null>(`/tournaments/${tournamentId}/players`, { playerId }),
  removePlayer: (tournamentId, playerId) =>
    http.delete<null>(`/tournaments/${tournamentId}/players/${playerId}`),
  updateSeeds: (tournamentId, seededPlayerIds) =>
    http.put<void>(`/tournaments/${tournamentId}`, { playerIds: seededPlayerIds }),
  setPublished: (id, published) => http.patch<Tournament>(`/tournaments/${id}/publish`, { published }),
  enroll: (id) => http.post<null>(`/tournaments/${id}/enroll`),
  withdraw: (id) => http.delete<null>(`/tournaments/${id}/enroll`),
}
