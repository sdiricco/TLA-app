import { http } from './http'
import type { Match, MatchAssignInput, MatchResultInput, MatchesService } from '../types'

export const matchesService: MatchesService = {
  getByTournament: (id) => http.get<Match[]>(`/tournaments/${id}/matches`),
  createEmptyBracket: (id, numPlayers) => http.post<Match[]>(`/tournaments/${id}/bracket`, { numPlayers }),
  assignPlayer: (matchId, data) => http.patch<Match>(`/matches/${matchId}/assign`, data),
  enterResult: (matchId, data) => http.put<Match>(`/matches/${matchId}`, data),
  reset: (tournamentId) => http.delete<null>(`/tournaments/${tournamentId}/matches`),
}
