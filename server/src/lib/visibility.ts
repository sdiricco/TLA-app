import type { Prisma } from '@prisma/client'
import { prisma } from '../db/prisma'
import { getOrCreateProfile } from './profileRepo'
import type { OrganizationRequest } from '../middleware/requireOrganization'

export type VisibilityFilter = 'mine' | 'global' | string
export type ExplicitOrganizationScope =
  | { organizationId: string | null }
  | { id: { in: string[] } }

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

export function explicitOrganizationScope(
  filter: VisibilityFilter,
  organizationIds: string[],
): ExplicitOrganizationScope | null {
  if (filter === 'mine') return null
  if (filter === 'global') return { organizationId: null }
  if (organizationIds.includes(filter)) return { organizationId: filter }
  return { id: { in: [] } }
}

export async function visibleTournamentWhere(req: OrganizationRequest): Promise<Prisma.TournamentWhereInput> {
  const filter = requestedFilter(req)
  if (filter === 'global') return explicitOrganizationScope(filter, [])!
  if (!req.authUser || req.authUser.id === 'guest') return { organizationId: null }

  const organizationIds = await membershipOrganizationIds(req)
  const explicitScope = explicitOrganizationScope(filter, organizationIds)
  if (explicitScope) return explicitScope
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
  if (filter === 'global') return explicitOrganizationScope(filter, [])!
  if (!req.authUser || req.authUser.id === 'guest') return { organizationId: null }

  const organizationIds = await membershipOrganizationIds(req)
  // Platform admins manage every club's tournaments, so they can also list
  // the players of a club they are not a member of.
  if (filter !== 'mine' && !organizationIds.includes(filter)) {
    const profile = await getOrCreateProfile(req.authUser)
    if (profile.role === 'admin') organizationIds.push(filter)
  }
  const explicitScope = explicitOrganizationScope(filter, organizationIds)
  if (explicitScope) return explicitScope
  return {
    OR: [
      { organizationId: null },
      ...(organizationIds.length ? [{ organizationId: { in: organizationIds } }] : []),
      { userId: req.authUser.id },
    ],
  }
}
