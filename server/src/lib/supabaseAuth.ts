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

export async function signUpWithPassword(email: string, password: string, name?: string, redirectTo?: string) {
  const signupUrl = new URL(`${env.supabaseUrl}/auth/v1/signup`)
  if (redirectTo) signupUrl.searchParams.set('redirect_to', redirectTo)
  const normalizedName = name?.trim()

  const response = await fetch(signupUrl, {
    method: 'POST',
    headers: {
      apikey: env.supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: email.trim(),
      password,
      // This is a direct GoTrue REST request. Unlike supabase-js, the REST
      // endpoint expects metadata in `data`, without the `options` wrapper.
      data: { ...(normalizedName ? { name: normalizedName } : {}) },
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

export async function resendSignupConfirmation(email: string, redirectTo?: string): Promise<void> {
  const resendUrl = new URL(`${env.supabaseUrl}/auth/v1/resend`)
  if (redirectTo) resendUrl.searchParams.set('redirect_to', redirectTo)

  const response = await fetch(resendUrl, {
    method: 'POST',
    headers: {
      apikey: env.supabaseAnonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type: 'signup', email }),
  })

  if (!response.ok) {
    const data = (await response.json().catch(() => ({}))) as SupabaseErrorResponse
    throw new Error(extractSupabaseError(data))
  }
}
