import { env } from '../config/env'

export interface SupabaseAuthUser {
  id: string
  email?: string | null
  user_metadata?: Record<string, unknown>
}

export interface SupabaseSessionUser extends SupabaseAuthUser {
  access_token: string
}

interface SupabaseErrorResponse {
  message?: string
  msg?: string
  error_description?: string
  error_code?: string
  code?: number
}

function extractSupabaseError(data: SupabaseErrorResponse): string {
  return data.message ?? data.msg ?? data.error_description ?? data.error_code ?? 'Authentication failed'
}

export async function verifySupabaseAccessToken(token: string): Promise<SupabaseAuthUser | null> {
  const response = await fetch(`${env.supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
  })

  if (!response.ok) {
    return null
  }

  const user = (await response.json()) as SupabaseAuthUser
  return user
}

export async function signInWithPassword(email: string, password: string) {
  const response = await fetch(`${env.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: env.supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as SupabaseErrorResponse
    throw new Error(extractSupabaseError(data))
  }

  return (await response.json()) as {
    access_token: string
    token_type: string
    expires_in: number
    refresh_token: string
    user: SupabaseAuthUser
  }
}

export async function signUpWithPassword(email: string, password: string, name?: string) {
  const response = await fetch(`${env.supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: env.supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      options: { data: { ...(name ? { name } : {}) } },
    }),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as SupabaseErrorResponse
    throw new Error(extractSupabaseError(data))
  }

  return (await response.json()) as {
    access_token?: string
    token_type?: string
    expires_in?: number
    refresh_token?: string
    user: SupabaseAuthUser
  }
}
