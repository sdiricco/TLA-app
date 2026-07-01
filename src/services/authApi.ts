import type { AuthService, User } from '../types'
import { authApiClient } from './authApiClient'
import { apiRequest } from './request'
import {
  clearAuthToken,
  clearGuestToken,
  getAuthToken,
  getGuestToken,
  setAuthToken,
  setGuestToken,
} from './token'

/**
 * Constants
 */
const guestUser: User = {
  id: 'guest',
  email: 'ospite@local',
  name: 'Ospite',
  role: 'admin',
}

/**
 * Function: Normalize auth response payloads
 */
async function authenticate(
  path: '/auth/login' | '/auth/register',
  payload: { email: string; password: string; name?: string },
): Promise<User> {
  const data = await apiRequest<{ message?: string; user: User; token?: string }>(authApiClient, {
    url: path,
    method: 'POST',
    data: payload,
  })

  if (!data?.token) throw new Error(data?.message ?? 'Authentication failed')
  clearGuestToken()
  setAuthToken(data.token)
  return data.user
}

/**
 * Auth service
 */
export const authService: AuthService = {
  login: (email, password) => authenticate('/auth/login', { email, password }),
  register: (email, password, name) => authenticate('/auth/register', { email, password, name }),
  loginAsGuest: async () => {
    clearAuthToken()
    setGuestToken()
    return guestUser
  },
  logout: async () => {
    try {
      await apiRequest(authApiClient, { url: '/auth/logout', method: 'POST' })
    } finally {
      clearGuestToken()
      clearAuthToken()
    }
  },
  getCurrentUser: async () => {
    if (getGuestToken()) return guestUser
    if (!getAuthToken()) return null

    try {
      const data = await apiRequest<{ user: User }>(authApiClient, { url: '/auth/me', method: 'GET' })
      return data?.user ?? null
    } catch {
      clearAuthToken()
      return null
    }
  },
}
