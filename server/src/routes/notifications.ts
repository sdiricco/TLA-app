import { Router } from 'express'
import { prisma } from '../db/prisma'
import { getOrCreateProfile } from '../lib/profileRepo'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth'

export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

async function profileFor(req: AuthenticatedRequest) {
  if (!req.authUser || req.authUser.id === 'guest') throw new Error('Le notifiche richiedono un account TLA')
  return getOrCreateProfile(req.authUser)
}

function serializeInvitation(invitation: {
  id: string
  status: string
  readAt: Date | null
  createdAt: Date
  organization: { id: string; name: string }
  invitedBy: { id: string; name: string | null; email: string } | null
}) {
  return {
    id: invitation.id,
    type: 'organization_invitation',
    status: invitation.status,
    read_at: invitation.readAt?.toISOString() ?? null,
    created_at: invitation.createdAt.toISOString(),
    organization: invitation.organization,
    invited_by: invitation.invitedBy
      ? { id: invitation.invitedBy.id, name: invitation.invitedBy.name ?? invitation.invitedBy.email }
      : null,
  }
}

const invitationInclude = {
  organization: { select: { id: true, name: true } },
  invitedBy: { select: { id: true, name: true, email: true } },
} as const

notificationsRouter.get('/', async (req, res) => {
  try {
    const profile = await profileFor(req as AuthenticatedRequest)
    const invitations = await prisma.organizationInvitation.findMany({
      where: { inviteeProfileId: profile.id, status: { in: ['pending', 'accepted', 'declined'] } },
      include: invitationInclude,
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
    res.json(invitations.map(serializeInvitation))
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Impossibile caricare le notifiche' })
  }
})

notificationsRouter.get('/unread-count', async (req, res) => {
  try {
    const profile = await profileFor(req as AuthenticatedRequest)
    const count = await prisma.organizationInvitation.count({
      where: { inviteeProfileId: profile.id, status: 'pending', readAt: null },
    })
    res.json({ count })
  } catch {
    res.json({ count: 0 })
  }
})

notificationsRouter.patch('/:id/read', async (req, res) => {
  try {
    const profile = await profileFor(req as AuthenticatedRequest)
    const result = await prisma.organizationInvitation.updateMany({
      where: { id: req.params.id, inviteeProfileId: profile.id },
      data: { readAt: new Date() },
    })
    if (!result.count) {
      res.status(404).json({ message: 'Notifica non trovata' })
      return
    }
    res.status(204).end()
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Impossibile aggiornare la notifica' })
  }
})

notificationsRouter.post('/:id/respond', async (req, res) => {
  const decision = req.body?.decision
  if (decision !== 'accepted' && decision !== 'declined') {
    res.status(400).json({ message: 'La risposta all’invito non è valida' })
    return
  }

  try {
    const profile = await profileFor(req as AuthenticatedRequest)
    const invitation = await prisma.organizationInvitation.findFirst({
      where: { id: req.params.id, inviteeProfileId: profile.id, status: 'pending' },
      include: { organization: true },
    })
    if (!invitation) {
      res.status(404).json({ message: 'Invito non disponibile o già gestito' })
      return
    }

    if (decision === 'accepted') {
      const globalPlayer = await prisma.player.findFirst({
        where: { userId: profile.id, organizationId: null },
      })
      if (!globalPlayer) {
        res.status(409).json({ message: 'Completa prima la tua scheda giocatore globale' })
        return
      }

      await prisma.$transaction(async (tx) => {
        await tx.organizationMembership.upsert({
          where: { organizationId_profileId: { organizationId: invitation.organizationId, profileId: profile.id } },
          create: { organizationId: invitation.organizationId, profileId: profile.id, role: 'member' },
          update: {},
        })
        const existingPlayer = await tx.player.findFirst({
          where: { organizationId: invitation.organizationId, userId: profile.id },
          select: { id: true },
        })
        const playerData = {
          name: globalPlayer.name,
          birthDate: globalPlayer.birthDate,
          photoUrl: globalPlayer.photoUrl,
          club: globalPlayer.club,
          phone: globalPlayer.phone,
        }
        if (existingPlayer) {
          await tx.player.update({ where: { id: existingPlayer.id }, data: playerData })
        } else {
          await tx.player.create({
            data: {
              ...playerData,
              ranking: globalPlayer.ranking,
              organizationId: invitation.organizationId,
              userId: profile.id,
            },
          })
        }
        await tx.organizationInvitation.update({
          where: { id: invitation.id },
          data: { status: 'accepted', readAt: new Date(), respondedAt: new Date() },
        })
      })
    } else {
      await prisma.organizationInvitation.update({
        where: { id: invitation.id },
        data: { status: 'declined', readAt: new Date(), respondedAt: new Date() },
      })
    }

    res.json({ id: invitation.id, status: decision, organization_id: invitation.organizationId })
  } catch (error) {
    console.error('Failed to respond to organization invitation', error)
    res.status(400).json({ message: error instanceof Error ? error.message : 'Impossibile rispondere all’invito' })
  }
})
