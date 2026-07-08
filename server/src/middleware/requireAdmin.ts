import type { NextFunction, Response } from 'express'
import type { OrganizationRequest } from './requireOrganization'

export async function requireAdmin(req: OrganizationRequest, res: Response, next: NextFunction): Promise<void> {
  if (!req.authUser) {
    res.status(401).json({ message: 'Not authenticated' })
    return
  }

  if (req.authUser.id === 'guest') {
    res.status(403).json({ message: 'Forbidden' })
    return
  }

  if (!req.organization || !['owner', 'admin'].includes(req.organization.role)) {
    res.status(403).json({ message: 'Forbidden' })
    return
  }
  next()
}
