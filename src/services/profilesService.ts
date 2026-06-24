import { http } from './http'
import type { Profile, ProfilesService } from '../types'
import { backendApi } from './backendApi'

const mock: ProfilesService = {
  getMyProfile: () => http.get<Profile>('/auth/profile'),
  getUnlinkedProfiles: () => http.get<Profile[]>('/auth/profiles/unlinked'),
}

const backend: ProfilesService = {
  getMyProfile: () => fetchProfile('/profile'),
  getUnlinkedProfiles: () => fetchProfiles('/profiles/unlinked'),
}

async function fetchProfile(path: string): Promise<Profile> {
  const token = localStorage.getItem('tla_token')
  const res = await fetch(`${backendApi.authPath(path)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Profile unavailable')
  return (await res.json()) as Profile
}

async function fetchProfiles(path: string): Promise<Profile[]> {
  const token = localStorage.getItem('tla_token')
  const res = await fetch(`${backendApi.authPath(path)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Profiles unavailable')
  return (await res.json()) as Profile[]
}

export const profilesService: ProfilesService = backendApi.baseUrl ? backend : mock
