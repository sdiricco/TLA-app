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

async function readBody(res: Response): Promise<unknown> {
  const text = await res.text()
  if (!text) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

async function fetchProfile(path: string): Promise<Profile> {
  const token = localStorage.getItem('tla_token')
  const res = await fetch(`${backendApi.authPath(path)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Profile unavailable')
  return (await readBody(res)) as Profile
}

async function fetchProfiles(path: string): Promise<Profile[]> {
  const token = localStorage.getItem('tla_token')
  const res = await fetch(`${backendApi.authPath(path)}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) throw new Error('Profiles unavailable')
  return (await readBody(res)) as Profile[]
}

export const profilesService: ProfilesService = backendApi.baseUrl ? backend : mock
