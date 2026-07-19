import { Router } from 'express'
import { prisma } from '../db/prisma'
import { requireAuth } from '../middleware/requireAuth'
import { requireAdmin } from '../middleware/requireAdmin'
import { requireOrganization, type OrganizationRequest } from '../middleware/requireOrganization'
import { propagateMatchWinner } from '../lib/matchProgression'
import { serializeMatch } from '../lib/serializers'
import { Prisma } from '@prisma/client'

export const matchesRouter = Router()

matchesRouter.use(requireAuth)
matchesRouter.use(requireOrganization)

function visibleTournamentWhere(req: OrganizationRequest): Prisma.TournamentWhereInput {
  const organizationId = req.organization?.id
  return organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : { organizationId: null }
}

matchesRouter.patch('/:id/assign', requireAdmin, async (req, res) => {
  const { slot, player_id } = req.body as { slot: 'player1_id' | 'player2_id'; player_id: string | null }
  const matchId = req.params['id'] as string
  const organizationId = (req as OrganizationRequest).organization?.id ?? null
  const update =
    player_id === null
      ? { [slot]: null, winnerId: null, result: null, status: 'pending' }
      : { [slot]: player_id }

  try {
    const existing = await prisma.match.findFirst({
      where: { id: matchId, tournament: visibleTournamentWhere(req as OrganizationRequest) },
      select: { id: true },
    })
    if (!existing) throw new Error('NOT_FOUND')
    if (player_id) {
      const playerExists = await prisma.player.count({ where: { id: player_id, ...(organizationId ? { organizationId } : {}) } })
      if (!playerExists) {
        res.status(400).json({ message: 'Giocatore non appartenente all’organizzazione' })
        return
      }
    }
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
  const organizationId = (req as OrganizationRequest).organization?.id ?? null
  try {
    const match = await prisma.$transaction(async (tx) => {
      const current = await tx.match.findUnique({
        where: { id: matchId },
        include: { tournament: { select: { format: true, organizationId: true } } },
      })
      if (!current || (organizationId && current.tournament.organizationId !== organizationId && current.tournament.organizationId !== null) || (!organizationId && current.tournament.organizationId !== null)) throw new Error('NOT_FOUND')
      if (![current.player1Id, current.player2Id].includes(winner_id)) {
        throw new Error('INVALID_MATCH_RESULT')
      }
      const updated = await tx.match.update({
        where: { id: matchId },
        data: { result, winnerId: winner_id, status: 'completed' },
      })

      if (current.tournament.format === 'single_elimination') {
        await propagateMatchWinner(tx, matchId, winner_id)
      }

      return updated
    })
    res.json(serializeMatch(match))
  } catch (error) {
    if (error instanceof Error && error.message === 'INVALID_MATCH_RESULT') {
      res.status(400).json({ message: 'Il vincitore deve partecipare all’incontro' })
      return
    }
    res.status(404).json({ message: 'Non trovato' })
  }
})
