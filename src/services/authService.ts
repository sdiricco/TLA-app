import { supabase } from '../lib/supabase'
import type { AuthService, User } from '../types'

const TOKEN_KEY = 'tla_token'

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

async function mockLogin(email: string, password: string): Promise<User> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const data = (await res.json()) as { message?: string; user?: User; token?: string }
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
  if (!token) return null
  const res = await fetch('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    clearToken()
    return null
  }
  return ((await res.json()) as { user: User }).user
}

async function mockRegister(email: string, password: string, name?: string): Promise<User> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name }),
  })
  const data = (await res.json()) as { message?: string; user?: User; token?: string }
  if (!res.ok) throw new Error(data.message ?? 'Registration failed')
  saveToken(data.token ?? '')
  return data.user as User
}

async function supabaseLogin(email: string, password: string): Promise<User> {
  const { data, error } = await supabase!.auth.signInWithPassword({ email, password })
  if (error) throw new Error(error.message)
  return {
    id: data.user.id,
    email: data.user.email ?? email,
    name: (data.user.user_metadata?.['name'] as string | undefined) ?? undefined,
    role: (data.user.role as string | undefined) ?? undefined,
  }
}

async function supabaseLogout(): Promise<void> {
  await supabase!.auth.signOut()
}

async function supabaseGetCurrentUser(): Promise<User | null> {
  const { data } = await supabase!.auth.getUser()
  const user = data?.user
  if (!user) return null
  return {
    id: user.id,
    email: user.email ?? '',
    name: (user.user_metadata?.['name'] as string | undefined) ?? undefined,
    role: (user.role as string | undefined) ?? undefined,
  }
}

async function supabaseRegister(email: string, password: string, name?: string): Promise<User> {
  const { data, error } = await supabase!.auth.signUp({
    email,
    password,
    options: { data: { ...(name ? { name } : {}) } },
  })
  if (error) throw new Error(error.message)
  if (!data.user) throw new Error('Registrazione non riuscita.')
  if (!data.session) throw new Error('Controlla la tua email per confermare la registrazione.')
  return {
    id: data.user.id,
    email: data.user.email ?? email,
    name,
    role: (data.user.role as string | undefined) ?? undefined,
  }
}

const isMock = !supabase

export const authService: AuthService = {
  login: isMock ? mockLogin : supabaseLogin,
  register: isMock ? mockRegister : (email, password, name) => supabaseRegister(email, password, name),
  logout: isMock ? mockLogout : supabaseLogout,
  getCurrentUser: isMock ? mockGetCurrentUser : supabaseGetCurrentUser,
}
