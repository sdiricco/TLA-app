import type { Profile, ProfilesService } from '../types'
import { authApiClient } from './authApiClient'
import { apiRequest } from './request'

export const profilesService: ProfilesService = {
  getMyProfile: () => apiRequest<Profile>(authApiClient, { url: '/auth/profile', method: 'GET' }),
  updateMyProfile: (name: string) => apiRequest<Profile>(authApiClient, { url: '/auth/profile', method: 'PATCH', data: { name } }),
  getUnlinkedProfiles: () => apiRequest<Profile[]>(authApiClient, { url: '/auth/profiles/unlinked', method: 'GET' }),
}
