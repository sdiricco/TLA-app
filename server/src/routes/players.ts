import { Router } from 'express'
import { Prisma } from '@prisma/client'
import type { PlayerCreate, PlayerMatchHistory, PlayerUpdate } from '../../../src/types'
import { prisma } from '../db/prisma'
import { requireAuth } from '../middleware/requireAuth'
import { requireAdmin } from '../middleware/requireAdmin'
import { requireOrganization, type OrganizationRequest } from '../middleware/requireOrganization'
import { getOrCreateProfile } from '../lib/profileRepo'
import { serializePlayer } from '../lib/serializers'
import { visiblePlayerWhere as getVisiblePlayerWhere } from '../lib/visibility'
import { visibleTournamentWhere as getVisibleTournamentWhere } from '../lib/visibility'

export const playersRouter = Router()

playersRouter.use(requireAuth)
playersRouter.use(requireOrganization)

function contextOrganizationId(req: OrganizationRequest): string | null {
  return req.organization?.id ?? null
}

function parseNullableDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

function parseOwnProfileDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null

  const date = new Date(String(value))
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now()) {
    throw new Error('La data di nascita non è valida')
  }
  return date
}

function parseOptionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return String(value).trim() || null
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

  const visibleWhere = await getVisiblePlayerWhere(authReq)
  const player = await prisma.player.findFirst({
    where: { userId, organizationId: null, ...visibleWhere },
  }) ?? await prisma.player.findFirst({ where: { userId, ...visibleWhere } })
  res.json(player ? serializePlayer(player) : null)
})

playersRouter.patch('/me', async (req, res) => {
  const authReq = req as OrganizationRequest
  const authUser = authReq.authUser

  if (!authUser || authUser.id === 'guest') {
    res.status(403).json({ message: 'Accedi con un account per modificare il profilo giocatore' })
    return
  }

  try {
    const data = req.body as PlayerUpdate
    const profile = await getOrCreateProfile(authUser)
    const name = data.name === undefined ? undefined : data.name.trim()
    const birthDate = parseOwnProfileDate(data.birth_date)
    const club = parseOptionalText(data.club)
    const phone = parseOptionalText(data.phone)
    const photoUrl = parseOptionalText(data.photo_url)

    if (name !== undefined && (name.length < 2 || name.length > 80)) {
      res.status(400).json({ message: 'Il nome deve contenere da 2 a 80 caratteri' })
      return
    }
    if (club && club.length > 120) {
      res.status(400).json({ message: 'Il nome del club non può superare 120 caratteri' })
      return
    }
    if (phone && phone.length > 40) {
      res.status(400).json({ message: 'Il numero di telefono non può superare 40 caratteri' })
      return
    }

    const player = await prisma.player.findFirst({
      where: { userId: profile.id, organizationId: null },
      select: { id: true },
    }) ?? await prisma.player.findFirst({
      where: { userId: profile.id },
      select: { id: true },
    })

    if (!player) {
      res.status(404).json({ message: 'Profilo giocatore non trovato' })
      return
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (name !== undefined) {
        await tx.profile.update({ where: { id: profile.id }, data: { name } })
        await tx.player.updateMany({ where: { userId: profile.id }, data: { name } })
      }

      return tx.player.update({
        where: { id: player.id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(birthDate !== undefined ? { birthDate } : {}),
          ...(club !== undefined ? { club } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(photoUrl !== undefined ? { photoUrl } : {}),
        },
      })
    })

    res.json(serializePlayer(updated))
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Impossibile aggiornare il profilo giocatore' })
  }
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
    const where: Prisma.PlayerWhereInput = {
      ...(await getVisiblePlayerWhere(req as OrganizationRequest)),
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
  const playerExists = await prisma.player.count({ where: { id: playerId, ...(await getVisiblePlayerWhere(req as OrganizationRequest)) } })
  if (!playerExists) {
    res.status(404).json({ message: 'Giocatore non trovato' })
    return
  }

  const playedMatchWhere: Prisma.MatchWhereInput = {
    tournament: await getVisibleTournamentWhere(req as OrganizationRequest),
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
  const player = await prisma.player.findFirst({
    where: { id: playerId, ...(await getVisiblePlayerWhere(req as OrganizationRequest)) },
  })

  if (!player) {
    res.status(404).json({ message: 'Giocatore non trovato' })
    return
  }

  res.json(serializePlayer(player))
})

playersRouter.post('/', requireAdmin, async (req, res) => {
  const data = req.body as PlayerCreate
  const organizationId = contextOrganizationId(req as OrganizationRequest)
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
  const organizationId = contextOrganizationId(req as OrganizationRequest)
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
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  try {
    const deleted = await prisma.player.deleteMany({ where: { id: playerId, organizationId } })
    if (deleted.count === 0) throw new Error('NOT_FOUND')
    res.status(204).send()
  } catch {
    res.status(404).json({ message: 'Giocatore non trovato' })
  }
})
