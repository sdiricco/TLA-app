const AUTH_TOKEN_KEY = 'tla_token'
const GUEST_TOKEN_KEY = 'tla_guest_token'

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

export function setAuthToken(token: string): void {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken(): void {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export function getGuestToken(): string | null {
  return localStorage.getItem(GUEST_TOKEN_KEY)
}

export function setGuestToken(): void {
  localStorage.setItem(GUEST_TOKEN_KEY, 'true')
}

export function clearGuestToken(): void {
  localStorage.removeItem(GUEST_TOKEN_KEY)
}

