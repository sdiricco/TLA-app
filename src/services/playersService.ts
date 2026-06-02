import { supabase } from '../lib/supabase'
import { http } from './http'
import type { Player, PlayerCreate, PlayerUpdate, PlayersService } from '../types'

type SupabaseResult<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>

const mock: PlayersService = {
  getAll: () => http.get<Player[]>('/players'),
  getById: (id) => http.get<Player>(`/players/${id}`),
  create: (data) => http.post<Player>('/players', data),
  update: (id, data) => http.put<Player>(`/players/${id}`, data),
  remove: (id) => http.delete<null>(`/players/${id}`),
}

async function sbQuery<T>(query: SupabaseResult<T>): Promise<T> {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as T
}

const sb: PlayersService = {
  getAll: () =>
    sbQuery<Player[]>(supabase!.from('players').select('*').order('ranking', { ascending: true })),
  getById: (id) => sbQuery<Player>(supabase!.from('players').select('*').eq('id', id).single()),
  create: (data: PlayerCreate) => sbQuery<Player>(supabase!.from('players').insert(data).select().single()),
  update: (id: string, data: PlayerUpdate) =>
    sbQuery<Player>(supabase!.from('players').update(data).eq('id', id).select().single()),
  remove: async (id: string) => {
    const { error } = await supabase!.from('players').delete().eq('id', id)
    if (error) throw new Error(error.message)
    return null
  },
}

export const playersService: PlayersService = supabase ? sb : mock
