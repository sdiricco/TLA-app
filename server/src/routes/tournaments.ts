import { Router } from 'express'
import { Prisma } from '@prisma/client'
import type { TournamentCreate, TournamentUpdate } from '../../../src/types'
import { prisma } from '../db/prisma'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth'
import { requireAdmin } from '../middleware/requireAdmin'
import { buildBracketMatches, sortMatches } from '../lib/bracket'
import {
  serializeMatch,
  serializeTournament,
  serializeTournamentWithPlayers,
} from '../lib/serializers'

export const tournamentsRouter = Router()

tournamentsRouter.use(requireAuth)

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

async function getTournamentWithPlayers(id: string) {
  return prisma.tournament.findUnique({
    where: { id },
    include: {
      players: {
        orderBy: { seed: 'asc' },
      },
    },
  })
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

function tournamentCapacityReached(limit: number | null, count: number): boolean {
  return limit !== null && count >= limit
}

async function assertCanAddParticipant(tournamentId: string, playerId: string): Promise<void> {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    select: { participantLimit: true },
  })
  if (!tournament) {
    throw new Error('Torneo non trovato')
  }

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

tournamentsRouter.get('/', async (_req, res) => {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { startDate: 'desc' },
  })
  res.json(tournaments.map(serializeTournament))
})

tournamentsRouter.get('/:id', async (req, res) => {
  const tournamentId = req.params['id'] as string
  const tournament = await getTournamentWithPlayers(tournamentId)
  if (!tournament) {
    res.status(404).json({ message: 'Torneo non trovato' })
    return
  }
  res.json(serializeTournamentWithPlayers(tournament))
})

tournamentsRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const data = req.body as TournamentCreate
    const participantLimit = parseNullableInt(data.participant_limit)
    const groupCount = parseNullableInt(data.group_count)
    const qualifiersPerGroup = parseNullableInt(data.qualifiers_per_group)

    if (data.format === 'round_robin_elimination' && (groupCount == null || qualifiersPerGroup == null)) {
      res.status(400).json({ message: 'La configurazione dei gironi è obbligatoria per questo formato' })
      return
    }

    if (
      data.format === 'round_robin_elimination' &&
      groupCount !== null &&
      qualifiersPerGroup !== null &&
      participantLimit !== null &&
      groupCount * qualifiersPerGroup > participantLimit
    ) {
      res.status(400).json({ message: 'I qualificati totali non possono superare il limite partecipanti' })
      return
    }

    const tournament = await prisma.tournament.create({
      data: {
        name: data.name,
        location: data.location ?? null,
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

  if (Array.isArray(body.playerIds)) {
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
      groupCount !== null &&
      qualifiersPerGroup !== null &&
      participantLimit !== null &&
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
  try {
    await prisma.tournament.delete({ where: { id: tournamentId } })
    res.status(204).send()
  } catch {
    res.status(404).json({ message: 'Torneo non trovato' })
  }
})

tournamentsRouter.post('/:id/players', requireAdmin, async (req, res) => {
  const { playerId } = req.body as { playerId: string }
  const tournamentId = req.params['id'] as string
  try {
    await assertCanAddParticipant(tournamentId, playerId)
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
  await prisma.tournamentPlayer.deleteMany({
    where: {
      tournamentId,
      playerId,
    },
  })
  res.status(204).send()
})

tournamentsRouter.patch('/:id/publish', requireAdmin, async (req, res) => {
  const { published } = req.body as { published: boolean }
  const tournamentId = req.params['id'] as string
  try {
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
  if (!authReq.authUser) {
    res.status(401).json({ message: 'Not authenticated' })
    return
  }

  const player = await prisma.player.findUnique({
    where: { userId: authReq.authUser.id },
  })
  if (!player) {
    res.status(400).json({ message: 'Profilo giocatore non configurato' })
    return
  }

  try {
    await assertCanAddParticipant(tournamentId, player.id)
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
  if (!authReq.authUser) {
    res.status(401).json({ message: 'Not authenticated' })
    return
  }

  const player = await prisma.player.findUnique({
    where: { userId: authReq.authUser.id },
  })
  if (!player) {
    res.status(400).json({ message: 'Profilo giocatore non configurato' })
    return
  }

  await prisma.tournamentPlayer.deleteMany({
    where: {
      tournamentId,
      playerId: player.id,
    },
  })
  res.status(204).send()
})

tournamentsRouter.get('/:id/matches', async (req, res) => {
  const tournamentId = req.params['id'] as string
  const matches = await prisma.match.findMany({
    where: { tournamentId },
    orderBy: [{ round: 'asc' }, { position: 'asc' }],
  })
  res.json(sortMatches(matches.map(serializeMatch)))
})

tournamentsRouter.post('/:id/bracket', requireAdmin, async (req, res) => {
  const tournamentId = req.params['id'] as string
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      players: {
        orderBy: { seed: 'asc' },
        select: { playerId: true, seed: true },
      },
    },
  })
  if (!tournament) {
    res.status(404).json({ message: 'Torneo non trovato' })
    return
  }

  const playerIds = [...tournament.players]
    .sort((a, b) => (a.seed ?? Number.MAX_SAFE_INTEGER) - (b.seed ?? Number.MAX_SAFE_INTEGER))
    .map((entry) => entry.playerId)
  await prisma.match.deleteMany({
    where: { tournamentId },
  })

  const toInsert = buildBracketMatches(tournamentId, playerIds, () => crypto.randomUUID())
  if (toInsert.length === 0) {
    res.json([])
    return
  }
  const created = await prisma.match.createMany({
    data: toInsert.map((match) => ({
      id: match.id,
      tournamentId: match.tournament_id,
      round: match.round,
      position: match.position,
      player1Id: match.player1_id,
      player2Id: match.player2_id,
      result: match.result,
      winnerId: match.winner_id,
      status: match.status,
    })),
  })
  void created
  const matches = await prisma.match.findMany({
    where: { tournamentId },
    orderBy: [{ round: 'asc' }, { position: 'asc' }],
  })
  res.json(sortMatches(matches.map(serializeMatch)))
})

tournamentsRouter.delete('/:id/matches', requireAdmin, async (req, res) => {
  const tournamentId = req.params['id'] as string
  await prisma.match.deleteMany({
    where: { tournamentId },
  })
  res.status(204).send()
})
