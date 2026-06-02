import { supabase } from '../lib/supabase'
import { http } from './http'
import type { Profile, ProfilesService } from '../types'

const mock: ProfilesService = {
  getMyProfile: () => http.get<Profile>('/auth/profile'),
  getUnlinkedProfiles: () => http.get<Profile[]>('/auth/profiles/unlinked'),
}

const sb: ProfilesService = {
  getMyProfile: async () => {
    const { data: { user } } = await supabase!.auth.getUser()
    if (!user) throw new Error('Non autenticato')

    const { data, error } = await supabase!
      .from('profiles')
      .select('id, name, role')
      .eq('id', user.id)
      .maybeSingle()

    if (error) throw new Error(error.message)

    // Profile missing (user existed before migration) — create with default role
    if (!data) {
      const { data: created, error: insertError } = await supabase!
        .from('profiles')
        .insert({ id: user.id, name: user.user_metadata?.name ?? null, role: 'player' })
        .select('id, name, role')
        .single()
      if (insertError) throw new Error(insertError.message)
      return created as Profile
    }

    return data as Profile
  },

  getUnlinkedProfiles: async () => {
    // Fetch linked user_ids from players, then filter profiles client-side
    const { data: players, error: pErr } = await supabase!
      .from('players')
      .select('user_id')
      .not('user_id', 'is', null)
    if (pErr) throw new Error(pErr.message)

    const linkedIds = (players ?? []).map((p: { user_id: string }) => p.user_id)

    const query = supabase!.from('profiles').select('id, name, role').eq('role', 'player')
    const { data, error } = linkedIds.length
      ? await query.not('id', 'in', `(${linkedIds.join(',')})`)
      : await query
    if (error) throw new Error(error.message)
    return (data ?? []) as Profile[]
  },
}

export const profilesService: ProfilesService = supabase ? sb : mock
