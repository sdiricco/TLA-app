import { Router } from 'express'
import { prisma } from '../db/prisma'
import { getOrCreateProfile } from '../lib/profileRepo'
import {
  acceptOrganizationInvitation,
  countUnreadInvitations,
  declineOrganizationInvitation,
  listInvitationNotifications,
  markInvitationRead,
} from '../lib/organizationInvitations'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth'

export const notificationsRouter = Router()
notificationsRouter.use(requireAuth)

async function profileFor(req: AuthenticatedRequest) {
  if (!req.authUser || req.authUser.id === 'guest') throw new Error('Le notifiche richiedono un account TLA')
  return getOrCreateProfile(req.authUser)
}

notificationsRouter.get('/', async (req, res) => {
  try {
    const profile = await profileFor(req as AuthenticatedRequest)
    res.json(await listInvitationNotifications(prisma, profile.id))
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Impossibile caricare le notifiche' })
  }
})

notificationsRouter.get('/unread-count', async (req, res) => {
  try {
    const profile = await profileFor(req as AuthenticatedRequest)
    const count = await countUnreadInvitations(prisma, profile.id)
    res.json({ count })
  } catch {
    res.json({ count: 0 })
  }
})

notificationsRouter.patch('/:id/read', async (req, res) => {
  try {
    const profile = await profileFor(req as AuthenticatedRequest)
    const updated = await markInvitationRead(prisma, profile.id, req.params.id)
    if (!updated) {
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

      await acceptOrganizationInvitation(prisma, profile.id, invitation, globalPlayer)
    } else {
      await declineOrganizationInvitation(prisma, invitation.id)
    }

    res.json({ id: invitation.id, status: decision, organization_id: invitation.organizationId })
  } catch (error) {
    console.error('Failed to respond to organization invitation', error)
    res.status(400).json({ message: error instanceof Error ? error.message : 'Impossibile rispondere all’invito' })
  }
})
