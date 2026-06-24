import type { AuthService, User } from '../types'
import { backendApi } from './backendApi'

const TOKEN_KEY = 'tla_token'
const GUEST_TOKEN = 'tla_guest_token'

const guestUser: User = {
  id: 'guest',
  email: 'ospite@local',
  name: 'Ospite',
  role: 'admin',
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
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

async function mockLogin(email: string, password: string): Promise<User> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = (await readBody(res)) as { message?: string; user?: User; token?: string }
  if (!res.ok) throw new Error(data.message ?? 'Login failed')
  saveToken(data.token ?? '')
  return data.user as User
}

async function mockLogout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' })
  clearToken()
}

async function mockGetCurrentUser(): Promise<User | null> {
  const token = getToken()
  if (token === GUEST_TOKEN) return guestUser
  if (!token) return null
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    clearToken()
    return null
  }
  return ((await readBody(res)) as { user: User }).user
}

async function mockRegister(email: string, password: string, name?: string): Promise<User> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  const data = (await readBody(res)) as { message?: string; user?: User; token?: string }
  if (!res.ok) throw new Error(data.message ?? 'Registration failed')
  saveToken(data.token ?? '')
  return data.user as User
}

async function backendLogin(email: string, password: string): Promise<User> {
  const res = await fetch(backendApi.authPath('/login'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const data = (await readBody(res)) as { message?: string; user?: User; token?: string }
  if (!res.ok) throw new Error(data.message ?? 'Login failed')
  saveToken(data.token ?? '')
  return data.user as User
}

async function backendLogout(): Promise<void> {
  const token = getToken()
  await fetch(backendApi.authPath('/logout'), {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  clearToken()
}

async function backendGetCurrentUser(): Promise<User | null> {
  const token = getToken()
  if (token === GUEST_TOKEN) return guestUser
  if (!token) return null
  const res = await fetch(backendApi.authPath('/me'), {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    clearToken()
    return null
  }
  return ((await readBody(res)) as { user: User }).user
}

async function backendRegister(email: string, password: string, name?: string): Promise<User> {
  const res = await fetch(backendApi.authPath('/register'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })

  const data = (await readBody(res)) as { message?: string; user?: User; token?: string }
  if (!res.ok) throw new Error(data.message ?? 'Registration failed')
  saveToken(data.token ?? '')
  return data.user as User
}

async function loginAsGuest(): Promise<User> {
  saveToken(GUEST_TOKEN)
  return guestUser
}

const useBackend = !!backendApi.baseUrl

export const authService: AuthService = {
  login: useBackend ? backendLogin : mockLogin,
  register: useBackend ? backendRegister : mockRegister,
  loginAsGuest,
  logout: useBackend ? backendLogout : mockLogout,
  getCurrentUser: useBackend ? backendGetCurrentUser : mockGetCurrentUser,
}
