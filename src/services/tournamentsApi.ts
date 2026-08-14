import type {
  PaginatedResponse,
  Tournament,
  TournamentCreate,
  TournamentEnrollment,
  TournamentListQuery,
  TournamentUpdate,
  TournamentWithPlayers,
  TournamentsService,
} from '../types'
import { apiClient } from './apiClient'
import { apiRequest } from './request'

export const tournamentsService: TournamentsService = {
  getAll: (query?: TournamentListQuery) =>
    apiRequest<PaginatedResponse<Tournament>>(apiClient, {
      url: '/tournaments',
      method: 'GET',
      params: query,
    }),
  getById: (id) => apiRequest<TournamentWithPlayers>(apiClient, { url: `/tournaments/${id}`, method: 'GET' }),
  create: (data: TournamentCreate) => apiRequest<Tournament>(apiClient, { url: '/tournaments', method: 'POST', data }),
  update: (id, data: TournamentUpdate) =>
    apiRequest<Tournament>(apiClient, { url: `/tournaments/${id}`, method: 'PUT', data }),
  uploadRegulation: (id, file) =>
    apiRequest<Tournament>(apiClient, {
      url: `/tournaments/${id}/regulation`,
      method: 'POST',
      data: file,
      headers: {
        'Content-Type': 'application/octet-stream',
        'X-File-Name': encodeURIComponent(file.name),
        'X-File-Type': file.type || 'application/octet-stream',
      },
    }),
  downloadRegulation: (id) =>
    apiRequest<Blob>(apiClient, {
      url: `/tournaments/${id}/regulation`,
      method: 'GET',
      responseType: 'blob',
    }),
  remove: (id) => apiRequest<null>(apiClient, { url: `/tournaments/${id}`, method: 'DELETE' }),
  addPlayer: (tournamentId, playerId) =>
    apiRequest<null>(apiClient, {
      url: `/tournaments/${tournamentId}/players`,
      method: 'POST',
      data: { playerId },
    }),
  removePlayer: (tournamentId, playerId) =>
    apiRequest<null>(apiClient, { url: `/tournaments/${tournamentId}/players/${playerId}`, method: 'DELETE' }),
  updateSeeds: (tournamentId, seededPlayerIds) =>
    apiRequest<void>(apiClient, {
      url: `/tournaments/${tournamentId}`,
      method: 'PUT',
      data: { playerIds: seededPlayerIds },
    }),
  setPublished: (id, published) =>
    apiRequest<Tournament>(apiClient, { url: `/tournaments/${id}/publish`, method: 'PATCH', data: { published } }),
  getEnrollment: (id) => apiRequest<TournamentEnrollment>(apiClient, { url: `/tournaments/${id}/enrollment`, method: 'GET' }),
  enroll: (id) => apiRequest<TournamentEnrollment>(apiClient, { url: `/tournaments/${id}/enroll`, method: 'POST' }),
  withdraw: (id) => apiRequest<TournamentEnrollment>(apiClient, { url: `/tournaments/${id}/enroll`, method: 'DELETE' }),
}
