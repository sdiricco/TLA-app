import type { NextFunction, Response } from 'express'
import { getOrCreateProfile } from '../lib/profileRepo'
import type { AuthenticatedRequest } from './requireAuth'

export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.authUser) {
    res.status(401).json({ message: 'Not authenticated' })
    return
  }

  if (req.authUser.id === 'guest') {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  try {
    const profile = await getOrCreateProfile(req.authUser)
    if (profile.role !== 'admin') {
      res.status(403).json({ message: 'Forbidden' })
      return
    }

    next()
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Unable to resolve permissions',
    })
  }
}
