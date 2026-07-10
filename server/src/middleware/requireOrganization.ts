import type { NextFunction, Response } from 'express'
import { prisma } from '../db/prisma'
import { getOrCreateProfile } from '../lib/profileRepo'
import type { AuthenticatedRequest } from './requireAuth'

export interface OrganizationRequest extends AuthenticatedRequest {
  organization?: {
    id: string
    role: 'owner' | 'admin' | 'member'
  }
}

type OrganizationRole = NonNullable<OrganizationRequest['organization']>['role']

export async function requireOrganization(req: OrganizationRequest, res: Response, next: NextFunction): Promise<void> {
  const organizationId = req.header('x-organization-id')
  if (!organizationId) {
    res.status(400).json({ message: 'Seleziona un’organizzazione' })
    return
  }
  if (!req.authUser || req.authUser.id === 'guest') {
    const organizationExists = await prisma.organization.count({ where: { id: organizationId } })
    if (!organizationExists) {
      res.status(404).json({ message: 'Organizzazione non trovata' })
      return
    }
    req.organization = { id: organizationId, role: 'member' }
    next()
    return
  }

  try {
    const profile = await getOrCreateProfile(req.authUser)
    const membership = await prisma.organizationMembership.findUnique({
      where: { organizationId_profileId: { organizationId, profileId: profile.id } },
      select: { role: true },
    })
    if (!membership) {
      res.status(403).json({ message: 'Non appartieni a questa organizzazione' })
      return
    }
    req.organization = { id: organizationId, role: membership.role as OrganizationRole }
    next()
  } catch (error) {
    res.status(500).json({ message: error instanceof Error ? error.message : 'Impossibile verificare l’organizzazione' })
  }
}
