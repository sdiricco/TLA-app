import crypto from 'node:crypto'
import { Router } from 'express'
import { prisma } from '../db/prisma'
import { getOrCreateProfile } from '../lib/profileRepo'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth'

export const organizationsRouter = Router()
organizationsRouter.use(requireAuth)

function serializeMembership(row: { role: string; organization: { id: string; name: string; joinCode: string } }) {
  return {
    id: row.organization.id,
    name: row.organization.name,
    join_code: ['owner', 'admin'].includes(row.role) ? row.organization.joinCode : '',
    role: row.role,
  }
}

async function profileFor(req: AuthenticatedRequest) {
  if (!req.authUser || req.authUser.id === 'guest') throw new Error('Registrati per usare le organizzazioni')
  return getOrCreateProfile(req.authUser)
}

organizationsRouter.get('/', async (req, res) => {
  try {
    const profile = await profileFor(req as AuthenticatedRequest)
    const memberships = await prisma.organizationMembership.findMany({
      where: { profileId: profile.id },
      include: { organization: true },
      orderBy: { createdAt: 'asc' },
    })
    res.json(memberships.map(serializeMembership))
  } catch (error) {
    res.status(403).json({ message: (error as Error).message })
  }
})

organizationsRouter.post('/', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  if (name.length < 2) {
    res.status(400).json({ message: 'Inserisci un nome per l’organizzazione' })
    return
  }
  try {
    const profile = await profileFor(req as AuthenticatedRequest)
    const organization = await prisma.organization.create({
      data: {
        name,
        joinCode: crypto.randomBytes(12).toString('base64url'),
        memberships: { create: { profileId: profile.id, role: 'owner' } },
      },
    })
    res.status(201).json({ id: organization.id, name: organization.name, join_code: organization.joinCode, role: 'owner' })
  } catch (error) {
    res.status(400).json({ message: (error as Error).message })
  }
})

organizationsRouter.post('/join', async (req, res) => {
  const joinCode = typeof req.body?.join_code === 'string' ? req.body.join_code.trim() : ''
  try {
    const profile = await profileFor(req as AuthenticatedRequest)
    const organization = await prisma.organization.findUnique({ where: { joinCode } })
    if (!organization) {
      res.status(404).json({ message: 'Codice organizzazione non valido' })
      return
    }
    await prisma.$transaction([
      prisma.organizationMembership.upsert({
        where: { organizationId_profileId: { organizationId: organization.id, profileId: profile.id } },
        create: { organizationId: organization.id, profileId: profile.id, role: 'member' },
        update: {},
      }),
      prisma.player.upsert({
        where: { organizationId_userId: { organizationId: organization.id, userId: profile.id } },
        create: { organizationId: organization.id, userId: profile.id, name: profile.name ?? profile.email, ranking: 0 },
        update: {},
      }),
    ])
    res.json({ id: organization.id, name: organization.name, join_code: '', role: 'member' })
  } catch (error) {
    res.status(400).json({ message: (error as Error).message })
  }
})
