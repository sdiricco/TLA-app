import { Router } from 'express'
import type { PlayerCreate, PlayerUpdate } from '../../../src/types'
import { prisma } from '../db/prisma'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth'
import { requireAdmin } from '../middleware/requireAdmin'
import { serializePlayer } from '../lib/serializers'

export const playersRouter = Router()

playersRouter.use(requireAuth)

function parseNullableDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

playersRouter.get('/me', async (req, res) => {
  const authReq = req as AuthenticatedRequest
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
    where: { userId },
  })
  res.json(player ? serializePlayer(player) : null)
})

playersRouter.get('/', async (_req, res) => {
  const players = await prisma.player.findMany({
    orderBy: { ranking: 'asc' },
  })
  res.json(players.map(serializePlayer))
})

playersRouter.get('/:id', async (req, res) => {
  const playerId = req.params['id'] as string
  const player = await prisma.player.findUnique({
    where: { id: playerId },
  })

  if (!player) {
    res.status(404).json({ message: 'Giocatore non trovato' })
    return
  }

  res.json(serializePlayer(player))
})

playersRouter.post('/', requireAdmin, async (req, res) => {
  const data = req.body as PlayerCreate
  const player = await prisma.player.create({
    data: {
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
  try {
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
  try {
    await prisma.player.delete({ where: { id: playerId } })
    res.status(204).send()
  } catch {
    res.status(404).json({ message: 'Giocatore non trovato' })
  }
})
