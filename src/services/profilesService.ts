import { supabase } from '../lib/supabase'
import { http } from './http'
import type { Profile, ProfilesService } from '../types'

const mock: ProfilesService = {
  getMyProfile: () => http.get<Profile>('/auth/profile'),
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
}

export const profilesService: ProfilesService = supabase ? sb : mock
