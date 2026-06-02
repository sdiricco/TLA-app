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
    // Profiles with role='player' that have no linked player record
    const { data, error } = await supabase!
      .from('profiles')
      .select('id, name, role')
      .eq('role', 'player')
      .not('id', 'in', `(select user_id from players where user_id is not null)`)
    if (error) throw new Error(error.message)
    return (data ?? []) as Profile[]
  },
}

export const profilesService: ProfilesService = supabase ? sb : mock
