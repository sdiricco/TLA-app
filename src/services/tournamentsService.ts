import { supabase } from '../lib/supabase'
import { http } from './http'
import type { Tournament, TournamentCreate, TournamentsService, TournamentUpdate, TournamentWithPlayers } from '../types'

type SupabaseResult<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>

const mock: TournamentsService = {
  getAll: () => http.get<Tournament[]>('/tournaments'),
  getById: (id) => http.get<Tournament>(`/tournaments/${id}`),
  create: (data) => http.post<Tournament>('/tournaments', data),
  update: (id, data) => http.put<Tournament>(`/tournaments/${id}`, data),
  remove: (id) => http.delete<null>(`/tournaments/${id}`),
  addPlayer: (tournamentId, playerId) => http.post<null>(`/tournaments/${tournamentId}/players`, { playerId }),
  removePlayer: (tournamentId, playerId) => http.delete<null>(`/tournaments/${tournamentId}/players/${playerId}`),
  updateSeeds: (tournamentId, seededPlayerIds) => http.put<void>(`/tournaments/${tournamentId}`, { playerIds: seededPlayerIds }),
}

async function sbQuery<T>(query: SupabaseResult<T>): Promise<T> {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as T
}

async function getNextSeed(tournamentId: string): Promise<number> {
  const { data, error } = await supabase!.from('tournament_players').select('seed').eq('tournament_id', tournamentId)
  if (error) throw new Error(error.message)

  return (data ?? []).reduce((max, row) => Math.max(max, row.seed ?? 0), 0) + 1
}

const sb: TournamentsService = {
  getAll: () =>
    sbQuery<Tournament[]>(supabase!.from('tournaments').select('*').order('start_date', { ascending: false })),
  getById: (id) =>
    sbQuery<TournamentWithPlayers>(
      supabase!.from('tournaments').select('*, tournament_players(player_id, seed)').eq('id', id).single(),
    ),
  create: (data: TournamentCreate) => sbQuery<Tournament>(supabase!.from('tournaments').insert(data).select().single()),
  update: (id: string, data: TournamentUpdate) =>
    sbQuery<Tournament>(supabase!.from('tournaments').update(data).eq('id', id).select().single()),
  remove: async (id: string) => {
    const { error } = await supabase!.from('tournaments').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return null
  },
  addPlayer: async (tournamentId: string, playerId: string) => {
    const seed = await getNextSeed(tournamentId)
    const { error } = await supabase!
      .from('tournament_players')
      .insert({ tournament_id: tournamentId, player_id: playerId, seed })
    if (error) throw new Error(error.message)
    return null
  },
  removePlayer: async (tournamentId: string, playerId: string) => {
    const { error } = await supabase!
      .from('tournament_players')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('player_id', playerId)
    if (error) throw new Error(error.message)
    return null
  },
  updateSeeds: async (tournamentId: string, seededPlayerIds: string[]) => {
    await Promise.all(
      seededPlayerIds.map((playerId, index) =>
        sbQuery(
          supabase!
            .from('tournament_players')
            .update({ seed: index + 1 })
            .eq('tournament_id', tournamentId)
            .eq('player_id', playerId),
        ),
      ),
    )
  },
}

export const tournamentsService: TournamentsService = supabase ? sb : mock
