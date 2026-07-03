import type { Match, MatchesService, TournamentMatchesResponse } from '../types';
import { apiClient } from './apiClient';
import { apiRequest } from './request';

export const matchesService: MatchesService = {
  getByTournament: (id) =>
    apiRequest<TournamentMatchesResponse>(apiClient, { url: `/tournaments/${id}/matches`, method: 'GET' }),
  downloadDrawPdf: (id) =>
    apiRequest<Blob>(apiClient, { url: `/tournaments/${id}/draw.pdf`, method: 'GET', responseType: 'blob' }),
  createEmptyBracket: (id, numPlayers) =>
    apiRequest<Match[]>(apiClient, {
      url: `/tournaments/${id}/bracket`,
      method: 'POST',
      data: { numPlayers },
    }),
  assignPlayer: (matchId, data) =>
    apiRequest<Match>(apiClient, { url: `/matches/${matchId}/assign`, method: 'PATCH', data }),
  enterResult: (matchId, data) =>
    apiRequest<Match>(apiClient, { url: `/matches/${matchId}`, method: 'PUT', data }),
  reset: async (tournamentId) => {
    await apiRequest<null>(apiClient, {
      url: `/tournaments/${tournamentId}/matches`,
      method: 'DELETE',
    });
  },
};
