import { supabase } from '../lib/supabase'
import { http } from './http'
import type { Match, MatchResultInput, MatchesService } from '../types'
import { buildDrawMatches, getWalkoverWinnerId, sortMatches } from '../utils/matches'

type SupabaseResult<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>

async function sbQuery<T>(query: SupabaseResult<T>): Promise<T> {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as T
}

async function getMatchByRoundPosition(
  tournamentId: string,
  round: number,
  position: number,
): Promise<Match | null> {
  const { data, error } = await supabase!
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('round', round)
    .eq('position', position)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as Match | null
}

const mock: MatchesService = {
  getByTournament: (id) => http.get<Match[]>(`/tournaments/${id}/matches`),
  generateDraw: (id, playerIds) => http.post<Match[]>(`/tournaments/${id}/draw`, { playerIds }),
  enterResult: (matchId, data) => http.put<Match>(`/matches/${matchId}`, data),
  advanceWinner: async () => {},
  reset: (tournamentId) => http.delete<null>(`/tournaments/${tournamentId}/matches`),
}

const sb: MatchesService = {
  getByTournament: async (id) =>
    sortMatches(
      await sbQuery<Match[]>(
        supabase!.from('matches').select('*').eq('tournament_id', id).order('round').order('position'),
      ),
    ),

  generateDraw: async (tournamentId, seededPlayerIds) => {
    const { error: deleteError } = await supabase!.from('matches').delete().eq('tournament_id', tournamentId)
    if (deleteError) throw new Error(deleteError.message)

    const matchesToInsert = buildDrawMatches(tournamentId, seededPlayerIds, () => crypto.randomUUID())
    if (matchesToInsert.length === 0) return []

    const inserted = await sbQuery<Match[]>(supabase!.from('matches').insert(matchesToInsert).select())
    return sortMatches(inserted)
  },

  enterResult: async (matchId, { sets, winner_id }) => {
    const updated = await sbQuery<Match>(
      supabase!
        .from('matches')
        .update({ sets, winner_id, status: 'completed' })
        .eq('id', matchId)
        .select()
        .single(),
    )

    await sb.advanceWinner(updated.tournament_id, updated.round, updated.position, winner_id)
    return updated
  },

  advanceWinner: async (tournamentId, round, position, winnerId) => {
    const nextRound = round + 1
    const nextPosition = Math.floor(position / 2)
    const nextMatch = await getMatchByRoundPosition(tournamentId, nextRound, nextPosition)
    if (!nextMatch) return

    const payload = position % 2 === 0 ? { player1_id: winnerId } : { player2_id: winnerId }
    const updatedNextMatch = await sbQuery<Match>(
      supabase!.from('matches').update(payload).eq('id', nextMatch.id).select().single(),
    )

    const walkoverWinnerId = getWalkoverWinnerId(updatedNextMatch)
    if (!walkoverWinnerId || updatedNextMatch.winner_id) return

    await sbQuery<Match>(
      supabase!
        .from('matches')
        .update({ winner_id: walkoverWinnerId, status: 'completed', sets: [] })
        .eq('id', updatedNextMatch.id)
        .select()
        .single(),
    )

    await sb.advanceWinner(tournamentId, updatedNextMatch.round, updatedNextMatch.position, walkoverWinnerId)
  },

  reset: async (tournamentId) => {
    const { error } = await supabase!.from('matches').delete().eq('tournament_id', tournamentId)
    if (error) throw new Error(error.message)
  },
}

export const matchesService: MatchesService = supabase ? sb : mock
