import type {
  Match,
  MatchesService,
  TournamentMatchesResponse,
  TournamentWithPlayers,
} from '../types';
import { apiClient } from './apiClient';
import { apiRequest } from './request';

export const matchesService: MatchesService = {
  getByTournament: (id, phaseId) =>
    apiRequest<TournamentMatchesResponse>(apiClient, {
      url: `/tournaments/${id}/matches`,
      method: 'GET',
      params: phaseId ? { phaseId } : undefined,
    }),
  downloadDrawPdf: (id, phaseId) =>
    apiRequest<Blob>(apiClient, {
      url: `/tournaments/${id}/draw.pdf`,
      method: 'GET',
      params: phaseId ? { phaseId } : undefined,
      responseType: 'blob',
    }),
  createEmptyBracket: (id, numPlayers, phaseId) =>
    apiRequest<Match[]>(apiClient, {
      url: `/tournaments/${id}/bracket`,
      method: 'POST',
      data: { numPlayers, phaseId },
    }),
  completePhase: (id, phaseId) =>
    apiRequest<TournamentWithPlayers>(apiClient, {
      url: `/tournaments/${id}/phases/${phaseId}/complete`,
      method: 'POST',
    }),
  assignPlayer: (matchId, data) =>
    apiRequest<Match>(apiClient, { url: `/matches/${matchId}/assign`, method: 'PATCH', data }),
  enterResult: (matchId, data) =>
    apiRequest<Match>(apiClient, { url: `/matches/${matchId}`, method: 'PUT', data }),
  reset: async (tournamentId, phaseId) => {
    await apiRequest<null>(apiClient, {
      url: `/tournaments/${tournamentId}/matches`,
      method: 'DELETE',
      params: phaseId ? { phaseId } : undefined,
    });
  },
};
