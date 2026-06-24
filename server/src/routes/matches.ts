import { Router } from 'express'
import { prisma } from '../db/prisma'
import { requireAuth } from '../middleware/requireAuth'
import { requireAdmin } from '../middleware/requireAdmin'
import { serializeMatch } from '../lib/serializers'

export const matchesRouter = Router()

matchesRouter.use(requireAuth)

matchesRouter.patch('/:id/assign', requireAdmin, async (req, res) => {
  const { slot, player_id } = req.body as { slot: 'player1_id' | 'player2_id'; player_id: string | null }
  const matchId = req.params['id'] as string
  const update =
    player_id === null
      ? { [slot]: null, winnerId: null, result: null, status: 'pending' }
      : { [slot]: player_id }

  try {
    const match = await prisma.match.update({
      where: { id: matchId },
      data: update,
    })
    res.json(serializeMatch(match))
  } catch {
    res.status(404).json({ message: 'Non trovato' })
  }
})

matchesRouter.put('/:id', requireAdmin, async (req, res) => {
  const { result, winner_id } = req.body as { result: string; winner_id: string }
  const matchId = req.params['id'] as string
  try {
    const match = await prisma.match.update({
      where: { id: matchId },
      data: { result, winnerId: winner_id, status: 'completed' },
    })
    res.json(serializeMatch(match))
  } catch {
    res.status(404).json({ message: 'Non trovato' })
  }
})
