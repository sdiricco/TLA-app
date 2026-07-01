import type { Match, MatchesService } from '../types';
import { apiClient } from './apiClient';
import { apiRequest } from './request';

export const matchesService: MatchesService = {
  getByTournament: (id) =>
    apiRequest<Match[]>(apiClient, { url: `/tournaments/${id}/matches`, method: 'GET' }),
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
