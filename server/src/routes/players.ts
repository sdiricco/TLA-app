import { Router } from 'express'
import { Prisma } from '@prisma/client'
import type { PlayerCreate, PlayerMatchHistory, PlayerUpdate } from '../../../src/types'
import { prisma } from '../db/prisma'
import { requireAuth } from '../middleware/requireAuth'
import { requireAdmin } from '../middleware/requireAdmin'
import { requireOrganization, type OrganizationRequest } from '../middleware/requireOrganization'
import { serializePlayer } from '../lib/serializers'

export const playersRouter = Router()

playersRouter.use(requireAuth)
playersRouter.use(requireOrganization)

function parseNullableDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
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

function parsePlayerSort(
  sortBy: unknown,
  sortOrder: unknown,
): Prisma.PlayerOrderByWithRelationInput[] {
  const allowedFields = new Set(['ranking', 'name', 'club', 'created_at'])
  const field = typeof sortBy === 'string' && allowedFields.has(sortBy) ? sortBy : 'ranking'
  const order: Prisma.SortOrder = sortOrder === 'desc' ? 'desc' : 'asc'

  switch (field) {
    case 'name':
      return [{ name: order }, { ranking: 'asc' }]
    case 'club':
      return [{ club: { sort: order, nulls: 'last' } }, { name: 'asc' }]
    case 'created_at':
      return [{ createdAt: order }, { name: 'asc' }]
    case 'ranking':
    default:
      return [{ ranking: order }, { name: 'asc' }]
  }
}

playersRouter.get('/me', async (req, res) => {
  const authReq = req as OrganizationRequest
  const userId = authReq.authUser?.id
  if (!userId) {
    res.status(401).json({ message: 'Not authenticated' })
    return
  }

  if (userId === 'guest') {
    res.json(null)
    return
  }

  const player = await prisma.player.findUnique({
    where: { organizationId_userId: { organizationId: authReq.organization!.id, userId } },
  })
  res.json(player ? serializePlayer(player) : null)
})

playersRouter.get('/', async (req, res) => {
  try {
    const { name, club, page: pageParam, perPage: perPageParam, sortBy, sortOrder } = req.query as {
      name?: string
      club?: string
      page?: string
      perPage?: string
      sortBy?: string
      sortOrder?: string
    }
    const page = parseNonNegativeInt(pageParam, 0)
    const perPage = Math.min(parsePositiveInt(perPageParam, 20), 100)
    const orderBy = parsePlayerSort(sortBy, sortOrder)
    const organizationId = (req as OrganizationRequest).organization!.id
    const where: Prisma.PlayerWhereInput = {
      organizationId,
      ...(name
        ? {
            name: {
              contains: name,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(club
        ? {
            club: {
              contains: club,
              mode: 'insensitive' as const,
            },
          }
        : {}),
    }

    const [total, players] = await prisma.$transaction([
      prisma.player.count({ where }),
      prisma.player.findMany({
        where,
        orderBy,
        skip: page * perPage,
        take: perPage,
      }),
    ])

    res.json({
      page,
      perPage,
      total,
      values: players.map(serializePlayer),
    })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid query params' })
  }
})

playersRouter.get('/:id/matches', async (req, res) => {
  const playerId = req.params['id'] as string
  const organizationId = (req as OrganizationRequest).organization!.id
  const playerExists = await prisma.player.count({ where: { id: playerId, organizationId } })
  if (!playerExists) {
    res.status(404).json({ message: 'Giocatore non trovato' })
    return
  }

  const playedMatchWhere: Prisma.MatchWhereInput = {
    tournament: { organizationId },
    status: 'completed',
    player1Id: { not: null },
    player2Id: { not: null },
    result: { not: null },
    NOT: { result: 'BYE' },
    OR: [{ player1Id: playerId }, { player2Id: playerId }],
  }

  const [played, wins, recentMatches] = await prisma.$transaction([
    prisma.match.count({ where: playedMatchWhere }),
    prisma.match.count({ where: { ...playedMatchWhere, winnerId: playerId } }),
    prisma.match.findMany({
      where: playedMatchWhere,
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: {
        tournament: { select: { id: true, name: true } },
        player1: { select: { id: true, name: true, photoUrl: true } },
        player2: { select: { id: true, name: true, photoUrl: true } },
      },
    }),
  ])

  const response: PlayerMatchHistory = {
    stats: {
      played,
      wins,
      losses: played - wins,
      win_rate: played > 0 ? Math.round((wins / played) * 100) : 0,
    },
    recent_form: recentMatches.map((match) => match.winnerId === playerId ? 'win' : 'loss'),
    recent_matches: recentMatches.map((match) => {
      const opponent = match.player1Id === playerId ? match.player2 : match.player1
      return {
        id: match.id,
        tournament_id: match.tournament.id,
        tournament_name: match.tournament.name,
        opponent_id: opponent!.id,
        opponent_name: opponent!.name,
        opponent_photo_url: opponent!.photoUrl,
        result: match.result!,
        outcome: match.winnerId === playerId ? 'win' : 'loss',
        played_at: match.updatedAt.toISOString(),
      }
    }),
  }

  res.json(response)
})

playersRouter.get('/:id', async (req, res) => {
  const playerId = req.params['id'] as string
  const organizationId = (req as OrganizationRequest).organization!.id
  const player = await prisma.player.findFirst({
    where: { id: playerId, organizationId },
  })

  if (!player) {
    res.status(404).json({ message: 'Giocatore non trovato' })
    return
  }

  res.json(serializePlayer(player))
})

playersRouter.post('/', requireAdmin, async (req, res) => {
  const data = req.body as PlayerCreate
  const organizationId = (req as OrganizationRequest).organization!.id
  const player = await prisma.player.create({
    data: {
      organizationId,
      name: data.name,
      ranking: data.ranking ?? 0,
      birthDate: parseNullableDate(data.birth_date) ?? null,
      photoUrl: data.photo_url ?? null,
      club: data.club ?? null,
      phone: data.phone ?? null,
      userId: data.user_id ?? null,
    },
  })
  res.status(201).json(serializePlayer(player))
})

playersRouter.put('/:id', requireAdmin, async (req, res) => {
  const data = req.body as PlayerUpdate
  const playerId = req.params['id'] as string
  const organizationId = (req as OrganizationRequest).organization!.id
  try {
    const existing = await prisma.player.findFirst({ where: { id: playerId, organizationId }, select: { id: true } })
    if (!existing) throw new Error('NOT_FOUND')
    const player = await prisma.player.update({
      where: { id: playerId },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.ranking !== undefined ? { ranking: data.ranking ?? 0 } : {}),
        ...(data.birth_date !== undefined ? { birthDate: parseNullableDate(data.birth_date) } : {}),
        ...(data.photo_url !== undefined ? { photoUrl: data.photo_url ?? null } : {}),
        ...(data.club !== undefined ? { club: data.club ?? null } : {}),
        ...(data.phone !== undefined ? { phone: data.phone ?? null } : {}),
        ...(data.user_id !== undefined ? { userId: data.user_id ?? null } : {}),
      },
    })
    res.json(serializePlayer(player))
  } catch {
    res.status(404).json({ message: 'Giocatore non trovato' })
  }
})

playersRouter.delete('/:id', requireAdmin, async (req, res) => {
  const playerId = req.params['id'] as string
  const organizationId = (req as OrganizationRequest).organization!.id
  try {
    const deleted = await prisma.player.deleteMany({ where: { id: playerId, organizationId } })
    if (deleted.count === 0) throw new Error('NOT_FOUND')
    res.status(204).send()
  } catch {
    res.status(404).json({ message: 'Giocatore non trovato' })
  }
})
