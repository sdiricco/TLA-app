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
  getMyPlayer: () => http.get<Player | null>('/players/me'),
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
  getMyPlayer: async () => {
    const { data: { user } } = await supabase!.auth.getUser()
    if (!user) return null
    const { data } = await supabase!
      .from('players')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    return data as Player | null
  },
}

export const playersService: PlayersService = supabase ? sb : mock
