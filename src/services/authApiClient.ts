import axios, { AxiosError, AxiosHeaders } from 'axios'
import { clearAuthToken, getAuthToken, getGuestToken } from './token'

/**
 * Constants
 */
const authBaseUrl = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'

/**
 * Public auth routes that must not send the bearer token
 */
const publicAuthRoutes = ['/auth/login', '/auth/register', '/auth/resend-confirmation']

/**
 * Axios client for authentication-related APIs
 */
export const authApiClient = axios.create({
  baseURL: authBaseUrl,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Function: Detect public auth routes
 */
function isPublicAuthRoute(url?: string): boolean {
  if (!url) return false
  return publicAuthRoutes.some((path) => url.startsWith(path))
}

/**
 * Middleware: Inject the bearer token only on protected auth routes
 */
authApiClient.interceptors.request.use((config) => {
  if (isPublicAuthRoute(config.url)) return config

  const token = getAuthToken()
  const guestToken = getGuestToken()
  if (!token && !guestToken) return config

  config.headers = AxiosHeaders.from(config.headers)
  config.headers.set('Authorization', `Bearer ${guestToken ? 'tla_guest_token' : token}`)
  const organizationId = localStorage.getItem('tla_organization_id')
  if (organizationId) config.headers.set('X-Organization-Id', organizationId)
  return config
})

/**
 * Middleware: Clear invalid tokens when the backend answers with 401
 */
authApiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string }>) => {
    if (error.response?.status === 401 && getAuthToken()) {
      clearAuthToken()
    }
    return Promise.reject(error)
  },
)
