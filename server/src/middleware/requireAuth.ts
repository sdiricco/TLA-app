import type { NextFunction, Request, Response } from 'express'
import { verifySupabaseAccessToken } from '../lib/supabaseAuth'

export interface AuthenticatedRequest extends Request {
  authUser?: Awaited<ReturnType<typeof verifySupabaseAccessToken>>
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.header('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length).trim() : null

  if (!token) {
    res.status(401).json({ message: 'Missing bearer token' })
    return
  }

  const user = await verifySupabaseAccessToken(token)

  if (!user) {
    res.status(401).json({ message: 'Invalid or expired session' })
    return
  }

  req.authUser = user
  next()
}
