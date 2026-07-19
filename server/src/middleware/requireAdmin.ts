import type { NextFunction, Response } from 'express'
import type { OrganizationRequest } from './requireOrganization'
import { prisma } from '../db/prisma'

export async function requireAdmin(req: OrganizationRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.authUser) {
    res.status(401).json({ message: 'Not authenticated' })
    return
  }

  if (req.authUser.id === 'guest') {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  const profile = await prisma.profile.findUnique({ where: { id: req.authUser.id }, select: { role: true } })
  if (profile?.role === 'admin') {
    next()
    return
  }
  if (req.organization && ['owner', 'admin'].includes(req.organization.role)) {
    next()
    return
  }
  {
    res.status(403).json({ message: 'Forbidden' })
    return
  }
}
