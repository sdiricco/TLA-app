import { supabase } from '../lib/supabase'
import { http } from './http'
import type { Profile, ProfilesService } from '../types'

const mock: ProfilesService = {
  getMyProfile: () => http.get<Profile>('/auth/profile'),
}

const sb: ProfilesService = {
  getMyProfile: async () => {
    const { data, error } = await supabase!
      .from('profiles')
      .select('id, name, role')
      .single()
    if (error) throw new Error(error.message)
    return data as Profile
  },
}

export const profilesService: ProfilesService = supabase ? sb : mock
