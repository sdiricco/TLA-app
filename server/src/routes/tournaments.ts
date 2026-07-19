import { Router } from 'express'
import { Prisma } from '@prisma/client'
import type { TournamentCreate, TournamentUpdate } from '../../../src/types'
import { prisma } from '../db/prisma'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth'
import { requireAdmin } from '../middleware/requireAdmin'
import { requireOrganization, type OrganizationRequest } from '../middleware/requireOrganization'
import { buildBracketMatches, buildRoundRobinMatches, sortMatches } from '../lib/bracket'
import { autoAdvanceByeMatches, reconcileMatchProgression } from '../lib/matchProgression'
import { buildTournamentMatchesResponse } from '../../../src/utils/matches'
import { generateDrawPdf, getDrawPdfFilename } from '../lib/drawPdf'
import { visibleTournamentWhere as getVisibleTournamentWhere } from '../lib/visibility'
import {
  serializeMatch,
  serializeTournament,
  serializeTournamentWithPlayers,
} from '../lib/serializers'

export const tournamentsRouter = Router()

tournamentsRouter.use(requireAuth)
tournamentsRouter.use(requireOrganization)

function contextOrganizationId(req: OrganizationRequest): string | null {
  return req.organization?.id ?? null
}

function visibleTournamentWhere(organizationId: string | null): Prisma.TournamentWhereInput {
  return organizationId
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : { organizationId: null }
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

async function getNextSeed(tournamentId: string): Promise<number> {
  const entries = await prisma.tournamentPlayer.findMany({
    where: { tournamentId },
    select: { seed: true },
  })
  return (entries ?? []).reduce((max, row) => Math.max(max, row.seed ?? 0), 0) + 1
}

function parseNullableInt(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('Invalid numeric value')
  }
  return parsed
}

function parseNonNegativeInt(value: unknown, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error('Invalid pagination value')
  }
  return parsed
}

function parsePositiveInt(value: unknown, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('Invalid pagination value')
  }
  return parsed
}

function tournamentCapacityReached(limit: number | null, count: number): boolean {
  return limit !== null && count >= limit
}

async function assertCanAddParticipant(tournamentId: string, playerId: string, organizationId: string | null): Promise<void> {
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, ...visibleTournamentWhere(organizationId) },
    select: { participantLimit: true, organizationId: true },
  })
  if (!tournament) {
    throw new Error('Torneo non trovato')
  }
  const playerExists = await prisma.player.count({
    where: { id: playerId, ...(tournament.organizationId ? { organizationId: tournament.organizationId } : {}) },
  })
  if (!playerExists) throw new Error('Giocatore non trovato')

  const alreadyEnrolled = await prisma.tournamentPlayer.findUnique({
    where: {
      tournamentId_playerId: {
        tournamentId,
        playerId,
      },
    },
  })
  if (alreadyEnrolled) return

  const count = await prisma.tournamentPlayer.count({
    where: { tournamentId },
  })
  if (tournamentCapacityReached(tournament.participantLimit, count)) {
    throw new Error('Torneo al completo')
  }
}

tournamentsRouter.get('/', async (req, res) => {
  try {
    const { name, category, status, dateFrom, dateTo, page: pageParam, perPage: perPageParam } = req.query as {
      name?: string
      category?: string
      status?: string
      dateFrom?: string
      dateTo?: string
      page?: string
      perPage?: string
    }

    const page = parseNonNegativeInt(pageParam, 0)
    const perPage = Math.min(parsePositiveInt(perPageParam, 12), 100)
    const fromDate = parseDate(dateFrom)
    const toDate = parseDate(dateTo)
    if (dateFrom && !fromDate) throw new Error('Invalid start date')
    if (dateTo && !toDate) throw new Error('Invalid end date')
    if (toDate) toDate.setUTCHours(23, 59, 59, 999)
    if (fromDate && toDate && fromDate > toDate) throw new Error('Invalid date range')

    const where: Prisma.TournamentWhereInput = {
      ...(await getVisibleTournamentWhere(req as OrganizationRequest)),
      ...(name
        ? {
            name: {
              contains: name,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      ...(fromDate
        ? {
            OR: [
              { endDate: { gte: fromDate } },
              { endDate: null, startDate: { gte: fromDate } },
            ],
          }
        : {}),
      ...(toDate ? { startDate: { lte: toDate } } : {}),
    }

    const [total, tournaments] = await prisma.$transaction([
      prisma.tournament.count({ where }),
      prisma.tournament.findMany({
        where,
        orderBy: [{ startDate: 'desc' }, { name: 'asc' }],
        skip: page * perPage,
        take: perPage,
      }),
    ])

    res.json({
      page,
      perPage,
      total,
      values: tournaments.map(serializeTournament),
    })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid query params' })
  }
})

tournamentsRouter.get('/:id', async (req, res) => {
  const tournamentId = req.params['id'] as string
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, ...(await getVisibleTournamentWhere(req as OrganizationRequest)) },
    include: { players: { orderBy: { seed: 'asc' } } },
  })
  if (!tournament) {
    res.status(404).json({ message: 'Torneo non trovato' })
    return
  }
  res.json(serializeTournamentWithPlayers(tournament))
})

tournamentsRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const data = req.body as TournamentCreate
    const organizationId = contextOrganizationId(req as OrganizationRequest)
    const participantLimit = parseNullableInt(data.participant_limit)
    const groupCount = parseNullableInt(data.group_count)
    const qualifiersPerGroup = parseNullableInt(data.qualifiers_per_group)

    if (data.format === 'round_robin_elimination' && (groupCount == null || qualifiersPerGroup == null)) {
      res.status(400).json({ message: 'La configurazione dei gironi è obbligatoria per questo formato' })
      return
    }

    if (
      data.format === 'round_robin_elimination' &&
      groupCount != null &&
      qualifiersPerGroup != null &&
      participantLimit != null &&
      groupCount * qualifiersPerGroup > participantLimit
    ) {
      res.status(400).json({ message: 'I qualificati totali non possono superare il limite partecipanti' })
      return
    }

    const tournament = await prisma.tournament.create({
      data: {
        organizationId,
        name: data.name,
        location: data.location ?? null,
        registrationStartDate: parseDate(data.registration_start_date ?? null),
        registrationEndDate: parseDate(data.registration_end_date ?? null),
        gameFormula: data.game_formula ?? null,
        registrationFee: data.registration_fee ?? null,
        startDate: parseDate(data.start_date ?? null),
        endDate: parseDate(data.end_date ?? null),
        format: data.format,
        category: data.category,
        status: data.status,
        published: data.published,
        participantLimit: participantLimit ?? null,
        groupCount: groupCount ?? null,
        qualifiersPerGroup: qualifiersPerGroup ?? null,
      },
    })
    res.status(201).json(serializeTournament(tournament))
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Torneo non trovato' })
      return
    }
    res.status(400).json({ message: (error as Error).message })
  }
})

tournamentsRouter.put('/:id', requireAdmin, async (req, res) => {
  const body = req.body as TournamentUpdate & { playerIds?: string[] }
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  const tournamentExists = await prisma.tournament.count({ where: { id: tournamentId, ...visibleTournamentWhere(organizationId) } })
  if (!tournamentExists) {
    res.status(404).json({ message: 'Torneo non trovato' })
    return
  }

  if (Array.isArray(body.playerIds)) {
    const tournamentForPlayers = await prisma.tournament.findFirst({ where: { id: tournamentId, ...visibleTournamentWhere(organizationId) }, select: { organizationId: true } })
    const playersInOrganization = await prisma.player.count({
      where: { id: { in: body.playerIds }, ...(tournamentForPlayers?.organizationId ? { organizationId: tournamentForPlayers.organizationId } : {}) },
    })
    if (playersInOrganization !== new Set(body.playerIds).size) {
      res.status(400).json({ message: 'Uno o più giocatori non appartengono all’organizzazione' })
      return
    }
    const current = await prisma.tournamentPlayer.findMany({
      where: { tournamentId },
      select: { playerId: true },
    })
    const currentIds = current.map((entry) => entry.playerId)
    await prisma.$transaction([
      ...currentIds.map((playerId) =>
        prisma.tournamentPlayer.delete({
          where: {
            tournamentId_playerId: {
              tournamentId,
              playerId,
            },
          },
        }),
      ),
      ...body.playerIds.map((playerId, index) =>
        prisma.tournamentPlayer.create({
          data: {
            tournamentId,
            playerId,
            seed: index + 1,
          },
        }),
      ),
    ])
    res.status(204).send()
    return
  }

  try {
    const participantLimit = body.participant_limit !== undefined ? parseNullableInt(body.participant_limit) : undefined
    const groupCount = body.group_count !== undefined ? parseNullableInt(body.group_count) : undefined
    const qualifiersPerGroup =
      body.qualifiers_per_group !== undefined ? parseNullableInt(body.qualifiers_per_group) : undefined

    if (
      body.format === 'round_robin_elimination' &&
      (groupCount === undefined || qualifiersPerGroup === undefined)
    ) {
      res.status(400).json({ message: 'La configurazione dei gironi è obbligatoria per questo formato' })
      return
    }

    if (
      body.format === 'round_robin_elimination' &&
      groupCount != null &&
      qualifiersPerGroup != null &&
      participantLimit != null &&
      groupCount * qualifiersPerGroup > participantLimit
    ) {
      res.status(400).json({ message: 'I qualificati totali non possono superare il limite partecipanti' })
      return
    }

    const tournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.location !== undefined ? { location: body.location ?? null } : {}),
        ...(body.registration_start_date !== undefined
          ? { registrationStartDate: parseDate(body.registration_start_date ?? null) }
          : {}),
        ...(body.registration_end_date !== undefined
          ? { registrationEndDate: parseDate(body.registration_end_date ?? null) }
          : {}),
        ...(body.game_formula !== undefined ? { gameFormula: body.game_formula ?? null } : {}),
        ...(body.registration_fee !== undefined ? { registrationFee: body.registration_fee ?? null } : {}),
        ...(body.start_date !== undefined ? { startDate: parseDate(body.start_date ?? null) } : {}),
        ...(body.end_date !== undefined ? { endDate: parseDate(body.end_date ?? null) } : {}),
        ...(body.format !== undefined ? { format: body.format } : {}),
        ...(body.category !== undefined ? { category: body.category } : {}),
        ...(body.status !== undefined ? { status: body.status } : {}),
        ...(body.published !== undefined ? { published: body.published } : {}),
        ...(participantLimit !== undefined ? { participantLimit } : {}),
        ...(groupCount !== undefined ? { groupCount } : {}),
        ...(qualifiersPerGroup !== undefined ? { qualifiersPerGroup } : {}),
      },
    })
    res.json(serializeTournament(tournament))
  } catch (error) {
    res.status(400).json({ message: (error as Error).message })
  }
})

tournamentsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  try {
    const deleted = await prisma.tournament.deleteMany({ where: { id: tournamentId, ...visibleTournamentWhere(organizationId) } })
    if (deleted.count === 0) throw new Error('NOT_FOUND')
    res.status(204).send()
  } catch {
    res.status(404).json({ message: 'Torneo non trovato' })
  }
})

tournamentsRouter.post('/:id/players', requireAdmin, async (req, res) => {
  const { playerId } = req.body as { playerId: string }
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  try {
    await assertCanAddParticipant(tournamentId, playerId, organizationId)
  } catch (error) {
    const message = (error as Error).message
    res.status(message === 'Torneo non trovato' ? 404 : 400).json({ message })
    return
  }
  const seed = await getNextSeed(tournamentId)
  await prisma.tournamentPlayer.upsert({
    where: {
      tournamentId_playerId: {
        tournamentId,
        playerId,
      },
    },
    create: {
      tournamentId,
      playerId,
      seed,
    },
    update: {
      seed,
    },
  })
  res.status(204).send()
})

tournamentsRouter.delete('/:id/players/:playerId', requireAdmin, async (req, res) => {
  const tournamentId = req.params['id'] as string
  const playerId = req.params['playerId'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  await prisma.tournamentPlayer.deleteMany({
    where: {
      tournamentId,
      playerId,
      tournament: visibleTournamentWhere(organizationId),
    },
  })
  res.status(204).send()
})

tournamentsRouter.patch('/:id/publish', requireAdmin, async (req, res) => {
  const { published } = req.body as { published: boolean }
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  try {
    const exists = await prisma.tournament.count({ where: { id: tournamentId, ...visibleTournamentWhere(organizationId) } })
    if (!exists) throw new Error('NOT_FOUND')
    const tournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: { published },
    })
    res.json(serializeTournament(tournament))
  } catch {
    res.status(404).json({ message: 'Torneo non trovato' })
  }
})

tournamentsRouter.post('/:id/enroll', async (req, res) => {
  const authReq = req as AuthenticatedRequest
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  if (!authReq.authUser) {
    res.status(401).json({ message: 'Not authenticated' })
    return
  }

  const player = await prisma.player.findFirst({ where: { userId: authReq.authUser.id, ...(organizationId ? { organizationId } : {}) } })
  if (!player) {
    res.status(400).json({ message: 'Profilo giocatore non configurato' })
    return
  }

  try {
    await assertCanAddParticipant(tournamentId, player.id, organizationId)
  } catch (error) {
    const message = (error as Error).message
    res.status(message === 'Torneo non trovato' ? 404 : 400).json({ message })
    return
  }

  const seed = await getNextSeed(tournamentId)
  await prisma.tournamentPlayer.upsert({
    where: {
      tournamentId_playerId: {
        tournamentId,
        playerId: player.id,
      },
    },
    create: {
      tournamentId,
      playerId: player.id,
      seed,
    },
    update: {
      seed,
    },
  })

  res.status(204).send()
})

tournamentsRouter.delete('/:id/enroll', async (req, res) => {
  const authReq = req as AuthenticatedRequest
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  if (!authReq.authUser) {
    res.status(401).json({ message: 'Not authenticated' })
    return
  }

  const player = await prisma.player.findFirst({ where: { userId: authReq.authUser.id, ...(organizationId ? { organizationId } : {}) } })
  if (!player) {
    res.status(400).json({ message: 'Profilo giocatore non configurato' })
    return
  }

  await prisma.tournamentPlayer.deleteMany({
    where: {
      tournamentId,
      playerId: player.id,
      tournament: visibleTournamentWhere(organizationId),
    },
  })
  res.status(204).send()
})

tournamentsRouter.get('/:id/draw.pdf', async (req, res) => {
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, ...visibleTournamentWhere(organizationId) },
    include: {
      players: {
        include: { player: true },
      },
    },
  })
  if (!tournament) {
    res.status(404).json({ message: 'Torneo non trovato' })
    return
  }

  const matches = await prisma.$transaction(async (tx) => {
    if (tournament.format === 'single_elimination') {
      await reconcileMatchProgression(tx, tournamentId)
    }
    return tx.match.findMany({
      where: { tournamentId },
      orderBy: [{ round: 'asc' }, { position: 'asc' }],
    })
  })
  if (matches.length === 0) {
    res.status(409).json({ message: 'Il tabellone non è ancora stato generato' })
    return
  }

  const tournamentSummary = {
    id: tournament.id,
    name: tournament.name,
    format: tournament.format as TournamentCreate['format'],
    category: tournament.category as TournamentCreate['category'],
    status: tournament.status as TournamentCreate['status'],
  }
  const response = buildTournamentMatchesResponse(
    tournamentSummary,
    tournament.players.length,
    matches.map(serializeMatch),
  )
  const pdf = await generateDrawPdf({
    ...response,
    tournament: {
      ...response.tournament,
      location: tournament.location,
      start_date: tournament.startDate?.toISOString(),
      end_date: tournament.endDate?.toISOString(),
    },
    players: tournament.players.map(({ player }) => ({
      id: player.id,
      name: player.name,
      ranking: player.ranking,
      club: player.club,
    })),
  })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${getDrawPdfFilename(tournament.name)}"`)
  res.setHeader('Content-Length', String(pdf.length))
  res.send(pdf)
})

tournamentsRouter.get('/:id/matches', async (req, res) => {
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, ...visibleTournamentWhere(organizationId) },
    select: {
      id: true,
      name: true,
      format: true,
      category: true,
      status: true,
      _count: { select: { players: true } },
    },
  })
  if (!tournament) {
    res.status(404).json({ message: 'Torneo non trovato' })
    return
  }
  const matches = await prisma.$transaction(async (tx) => {
    if (tournament.format === 'single_elimination') {
      await reconcileMatchProgression(tx, tournamentId)
    }
    return tx.match.findMany({
      where: { tournamentId },
      orderBy: [{ round: 'asc' }, { position: 'asc' }],
    })
  })
  res.json(buildTournamentMatchesResponse({
    id: tournament.id,
    name: tournament.name,
    format: tournament.format as TournamentCreate['format'],
    category: tournament.category as TournamentCreate['category'],
    status: tournament.status as TournamentCreate['status'],
  }, tournament._count.players, matches.map(serializeMatch)))
})

tournamentsRouter.post('/:id/bracket', requireAdmin, async (req, res) => {
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, ...visibleTournamentWhere(organizationId) },
    include: {
      players: {
        orderBy: { seed: 'asc' },
        select: {
          playerId: true,
          seed: true,
          player: { select: { ranking: true } },
        },
      },
    },
  })
  if (!tournament) {
    res.status(404).json({ message: 'Torneo non trovato' })
    return
  }

  if (!['single_elimination', 'round_robin'].includes(tournament.format)) {
    res.status(409).json({ message: 'La generazione non è ancora disponibile per questo formato' })
    return
  }

  const playerIds = [...tournament.players]
    .sort((a, b) => a.player.ranking - b.player.ranking)
    .map((entry) => entry.playerId)
  await prisma.match.deleteMany({
    where: { tournamentId },
  })

  const toInsert = tournament.format === 'round_robin'
    ? buildRoundRobinMatches(tournamentId, playerIds, () => crypto.randomUUID())
    : buildBracketMatches(tournamentId, playerIds, () => crypto.randomUUID())
  if (toInsert.length === 0) {
    res.json([])
    return
  }
  const created = await prisma.match.createMany({
    data: toInsert.map((match) => ({
      id: match.id,
      tournamentId: match.tournament_id,
      round: match.round_index + 1,
      position: match.position,
      player1Id: match.player1_id,
      player2Id: match.player2_id,
      result: match.result,
      winnerId: match.winner_id,
      status: match.status === 'completed' ? 'completed' : 'pending',
    })),
  })
  void created
  if (tournament.format === 'single_elimination') {
    await prisma.$transaction(async (tx) => {
      await autoAdvanceByeMatches(tx, tournamentId)
    })
  }
  const matches = await prisma.match.findMany({
    where: { tournamentId },
    orderBy: [{ round: 'asc' }, { position: 'asc' }],
  })
  res.json(sortMatches(matches.map(serializeMatch)))
})

tournamentsRouter.delete('/:id/matches', requireAdmin, async (req, res) => {
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  await prisma.match.deleteMany({
    where: { tournamentId, tournament: visibleTournamentWhere(organizationId) },
  })
  res.status(204).send()
})
