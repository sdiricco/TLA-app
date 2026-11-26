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


// Platform-admin "login as": the id of the impersonated user travels as a
// header on every request. Session storage keeps it from outliving the tab.
const IMPERSONATION_KEY = 'tla_impersonate_user_id'
export const IMPERSONATION_HEADER = 'X-Impersonate-User-Id'

export function getImpersonatedUserId(): string | null {
  return sessionStorage.getItem(IMPERSONATION_KEY)
}

export function setImpersonatedUserId(userId: string): void {
  sessionStorage.setItem(IMPERSONATION_KEY, userId)
}

export function clearImpersonatedUserId(): void {
  sessionStorage.removeItem(IMPERSONATION_KEY)
}
