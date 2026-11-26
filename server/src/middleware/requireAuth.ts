import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../db/prisma'
import { verifySupabaseAccessToken, type SupabaseAuthUser } from '../lib/supabaseAuth'

export const IMPERSONATION_HEADER = 'x-impersonate-user-id'

export interface Impersonator {
  id: string
  email: string
  name: string | null
}

export interface AuthenticatedRequest extends Request {
  authUser?: Awaited<ReturnType<typeof verifySupabaseAccessToken>>
  authToken?: string
  // Set only while a platform admin acts as another user: `authUser` is then
  // the impersonated user and this field keeps the real caller.
  impersonator?: Impersonator
}

export type ImpersonationResult =
  | { ok: true; target: SupabaseAuthUser; impersonator: Impersonator }
  | { ok: false; message: string }

interface ProfileLookup {
  findUnique(args: {
    where: { id: string }
    select: { id: true; email: true; name: true; role: true }
  }): Promise<{ id: string; email: string; name: string | null; role: string } | null>
}

const GUEST_TOKEN = 'tla_guest_token'
const guestUser = {
  id: 'guest',
  email: 'ospite@local',
  user_metadata: { name: 'Ospite' },
}

// Only a platform admin (checked in the database on every request, never from a
// client flag) may act as another non-admin user.
export async function resolveImpersonation(
  realUserId: string,
  targetUserId: string,
  profiles: ProfileLookup = prisma.profile,
): Promise<ImpersonationResult> {
  if (realUserId === 'guest') return { ok: false, message: 'Gli ospiti non possono impersonare utenti' }
  if (realUserId === targetUserId) return { ok: false, message: 'Non puoi impersonare te stesso' }

  const select = { id: true, email: true, name: true, role: true } as const
  const [caller, target] = await Promise.all([
    profiles.findUnique({ where: { id: realUserId }, select }),
    profiles.findUnique({ where: { id: targetUserId }, select }),
  ])
  if (caller?.role !== 'admin') return { ok: false, message: 'Solo un amministratore può accedere come un altro utente' }
  if (!target) return { ok: false, message: 'Utente da impersonare non trovato' }
  if (target.role === 'admin') return { ok: false, message: 'Non puoi accedere come un altro amministratore' }

  return {
    ok: true,
    target: { id: target.id, email: target.email, user_metadata: { name: target.name ?? undefined } },
    impersonator: { id: caller.id, email: caller.email, name: caller.name },
  }
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.header('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null
  const impersonatedUserId = req.header(IMPERSONATION_HEADER)?.trim()

  if (!token) {
    res.status(401).json({ message: 'Missing bearer token' })
    return
  }

  if (token === GUEST_TOKEN) {
    if (impersonatedUserId) {
      res.status(403).json({ message: 'Gli ospiti non possono impersonare utenti', code: 'IMPERSONATION_DENIED' })
      return
    }
    req.authUser = guestUser
    req.authToken = token
    next()
    return
  }

  const user = await verifySupabaseAccessToken(token)

  if (!user) {
    res.status(401).json({ message: 'Invalid or expired session' })
    return
  }

  req.authToken = token
  if (!impersonatedUserId) {
    req.authUser = user
    next()
    return
  }

  const impersonation = await resolveImpersonation(user.id, impersonatedUserId)
  if (!impersonation.ok) {
    res.status(403).json({ message: impersonation.message, code: 'IMPERSONATION_DENIED' })
    return
  }
  req.authUser = impersonation.target
  req.impersonator = impersonation.impersonator
  next()
}
