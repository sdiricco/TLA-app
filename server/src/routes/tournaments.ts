import { Router } from 'express'
import type { TournamentCreate, TournamentUpdate } from '../../../src/types'
import { prisma } from '../db/prisma'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth'
import { requireAdmin } from '../middleware/requireAdmin'
import { buildEmptyBracket, sortMatches } from '../lib/bracket'
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
  const data = req.body as TournamentCreate
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
    },
  })
  res.status(201).json(serializeTournament(tournament))
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
      },
    })
    res.json(serializeTournament(tournament))
  } catch {
    res.status(404).json({ message: 'Torneo non trovato' })
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
  const { numPlayers } = req.body as { numPlayers: number }
  const tournamentId = req.params['id'] as string
  await prisma.match.deleteMany({
    where: { tournamentId },
  })
  const toInsert = buildEmptyBracket(tournamentId, numPlayers, () => crypto.randomUUID())
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
