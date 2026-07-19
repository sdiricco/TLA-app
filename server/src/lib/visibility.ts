import type { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma'
import { getOrCreateProfile } from './profileRepo'
import type { OrganizationRequest } from '../middleware/requireOrganization'

export type VisibilityFilter = 'mine' | 'global' | string

function requestedFilter(req: OrganizationRequest): VisibilityFilter {
  const value = req.query.organizationId
  return typeof value === 'string' && value.trim() ? value : 'mine'
}

async function membershipOrganizationIds(req: OrganizationRequest): Promise<string[]> {
  if (!req.authUser || req.authUser.id === 'guest') return []
  const profile = await getOrCreateProfile(req.authUser)
  const memberships = await prisma.organizationMembership.findMany({
    where: { profileId: profile.id },
    select: { organizationId: true },
  })
  return memberships.map(({ organizationId }) => organizationId)
}

export async function visibleTournamentWhere(req: OrganizationRequest): Promise<Prisma.TournamentWhereInput> {
  const filter = requestedFilter(req)
  if (filter === 'global') return { organizationId: null }
  if (!req.authUser || req.authUser.id === 'guest') return { organizationId: null }

  const organizationIds = await membershipOrganizationIds(req)
  if (filter !== 'mine') {
    return organizationIds.includes(filter) ? { OR: [{ organizationId: filter }, { organizationId: null }] } : { organizationId: null }
  }
  return {
    OR: [
      { organizationId: null },
      ...(organizationIds.length ? [{ organizationId: { in: organizationIds } }] : []),
      { players: { some: { player: { userId: req.authUser.id } } } },
    ],
  }
}

export async function visiblePlayerWhere(req: OrganizationRequest): Promise<Prisma.PlayerWhereInput> {
  const filter = requestedFilter(req)
  if (filter === 'global') return { organizationId: null }
  if (!req.authUser || req.authUser.id === 'guest') return { organizationId: null }

  const organizationIds = await membershipOrganizationIds(req)
  if (filter !== 'mine') {
    return organizationIds.includes(filter) ? { OR: [{ organizationId: filter }, { organizationId: null }] } : { organizationId: null }
  }
  return {
    OR: [
      { organizationId: null },
      ...(organizationIds.length ? [{ organizationId: { in: organizationIds } }] : []),
      { userId: req.authUser.id },
    ],
  }
}
