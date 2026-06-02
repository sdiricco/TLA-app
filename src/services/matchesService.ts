import { supabase } from '../lib/supabase'
import { http } from './http'
import type { Match, MatchAssignInput, MatchResultInput, MatchesService } from '../types'
import { buildEmptyBracket, sortMatches } from '../utils/matches'

type SupabaseResult<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>

async function sbQuery<T>(query: SupabaseResult<T>): Promise<T> {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as T
}

const mock: MatchesService = {
  getByTournament: (id) => http.get<Match[]>(`/tournaments/${id}/matches`),
  createEmptyBracket: (id, numPlayers) =>
    http.post<Match[]>(`/tournaments/${id}/bracket`, { numPlayers }),
  assignPlayer: (matchId, data) =>
    http.patch<Match>(`/matches/${matchId}/assign`, data),
  enterResult: (matchId, data) => http.put<Match>(`/matches/${matchId}`, data),
  reset: (tournamentId) => http.delete<null>(`/tournaments/${tournamentId}/matches`),
}

const sb: MatchesService = {
  getByTournament: async (id) =>
    sortMatches(
      await sbQuery<Match[]>(
        supabase!
          .from('matches')
          .select('*')
          .eq('tournament_id', id)
          .order('round')
          .order('position'),
      ),
    ),

  createEmptyBracket: async (tournamentId, numPlayers) => {
    await supabase!.from('matches').delete().eq('tournament_id', tournamentId)
    const toInsert = buildEmptyBracket(tournamentId, numPlayers, () => crypto.randomUUID())
    if (toInsert.length === 0) return []
    return sortMatches(
      await sbQuery<Match[]>(supabase!.from('matches').insert(toInsert).select()),
    )
  },

  assignPlayer: async (matchId, { slot, player_id }) => {
    return sbQuery<Match>(
      supabase!
        .from('matches')
        .update(
          player_id === null
            ? { [slot]: null, winner_id: null, result: null, status: 'pending' }
            : { [slot]: player_id },
        )
        .eq('id', matchId)
        .select()
        .single(),
    )
  },

  enterResult: async (matchId, { result, winner_id }) =>
    sbQuery<Match>(
      supabase!
        .from('matches')
        .update({ result, winner_id, status: 'completed' })
        .eq('id', matchId)
        .select()
        .single(),
    ),

  reset: async (tournamentId) => {
    const { error } = await supabase!.from('matches').delete().eq('tournament_id', tournamentId)
    if (error) throw new Error(error.message)
  },
}

export const matchesService: MatchesService = supabase ? sb : mock
