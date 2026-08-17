import { Router } from 'express'
import { prisma } from '../db/prisma'
import { serializeTournament } from '../lib/serializers'
import { visibleTournamentWhere } from '../lib/visibility'
import { requireAuth } from '../middleware/requireAuth'
import { requireOrganization, type OrganizationRequest } from '../middleware/requireOrganization'

export const organizersRouter = Router()

organizersRouter.use(requireAuth)
organizersRouter.use(requireOrganization)

organizersRouter.get('/', async (req, res) => {
  const tournamentWhere = await visibleTournamentWhere(req as OrganizationRequest)
  const groupedTournaments = await prisma.tournament.groupBy({
    by: ['organizerProfileId'],
    where: {
      ...tournamentWhere,
      organizerProfileId: { not: null },
    },
    _count: { _all: true },
  })
  const organizerIds = groupedTournaments.flatMap(({ organizerProfileId }) =>
    organizerProfileId ? [organizerProfileId] : [],
  )

  if (organizerIds.length === 0) {
    res.json([])
    return
  }

  const profiles = await prisma.profile.findMany({
    where: { id: { in: organizerIds }, name: { not: null } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
  const counts = new Map(
    groupedTournaments.flatMap(({ organizerProfileId, _count }) =>
      organizerProfileId ? [[organizerProfileId, _count._all] as const] : [],
    ),
  )

  res.json(profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    tournaments_count: counts.get(profile.id) ?? 0,
  })))
})

organizersRouter.get('/:id', async (req, res) => {
  const organizerId = String(req.params['id'])
  const tournamentWhere = await visibleTournamentWhere(req as OrganizationRequest)
  const [profile, player, tournaments] = await prisma.$transaction([
    prisma.profile.findUnique({
      where: { id: organizerId },
      select: { id: true, name: true },
    }),
    prisma.player.findFirst({
      where: { userId: organizerId, organizationId: null },
      select: { id: true, photoUrl: true },
    }),
    prisma.tournament.findMany({
      where: {
        ...tournamentWhere,
        organizerProfileId: organizerId,
      },
      include: { organizer: { select: { id: true, name: true } } },
      orderBy: [{ startDate: 'desc' }, { name: 'asc' }],
    }),
  ])

  if (!profile?.name || tournaments.length === 0) {
    res.status(404).json({ message: 'Organizzatore non trovato' })
    return
  }

  res.json({
    id: profile.id,
    name: profile.name,
    player_id: player?.id ?? null,
    photo_url: player?.photoUrl ?? null,
    tournaments_count: tournaments.length,
    tournaments: tournaments.map(serializeTournament),
  })
})
