import crypto from 'node:crypto'
import { Router } from 'express'
import { prisma } from '../db/prisma'
import { getOrCreateProfile } from '../lib/profileRepo'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth'
import { requireAdmin } from '../middleware/requireAdmin'
import { requireOrganization, type OrganizationRequest } from '../middleware/requireOrganization'

export const organizationsRouter = Router()
organizationsRouter.use(requireAuth)

const discoveryHits = new Map<string, { startedAt: number; count: number }>()
const DISCOVERY_WINDOW_MS = 60_000
const DISCOVERY_MAX_REQUESTS = 60

function allowDiscovery(req: import('express').Request): boolean {
  const key = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const current = discoveryHits.get(key)
  if (discoveryHits.size > 1000) {
    for (const [storedKey, hit] of discoveryHits) {
      if (now - hit.startedAt >= DISCOVERY_WINDOW_MS) discoveryHits.delete(storedKey)
    }
  }
  if (!current || now - current.startedAt >= DISCOVERY_WINDOW_MS) {
    discoveryHits.set(key, { startedAt: now, count: 1 })
    return true
  }
  if (current.count >= DISCOVERY_MAX_REQUESTS) return false
  current.count += 1
  return true
}

function serializeMembership(row: { role: string; organization: { id: string; name: string; slug: string; description: string | null; city: string | null; sport: string | null; visibility: string; joinCode: string; _count?: { memberships: number } } }) {
  return {
    id: row.organization.id,
    name: row.organization.name,
    slug: row.organization.slug,
    description: row.organization.description,
    city: row.organization.city,
    sport: row.organization.sport,
    visibility: row.organization.visibility,
    member_count: row.organization._count?.memberships ?? 0,
    join_code: ['owner', 'admin'].includes(row.role) ? row.organization.joinCode : '',
    role: row.role,
  }
}

function serializePublicOrganization(organization: { id: string; name: string; slug: string; description: string | null; city: string | null; sport: string | null; visibility: string; _count: { memberships: number } }) {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    city: organization.city,
    sport: organization.sport,
    visibility: organization.visibility,
    member_count: organization._count.memberships,
    join_code: '',
    role: 'member',
  }
}

function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'organization'
}

async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  let slug = base
  let suffix = 2
  while (await prisma.organization.count({ where: { slug } })) slug = `${base}-${suffix++}`
  return slug
}

async function profileFor(req: AuthenticatedRequest) {
  if (!req.authUser || req.authUser.id === 'guest') throw new Error('Registrati per usare le organizzazioni')
  return getOrCreateProfile(req.authUser)
}

organizationsRouter.get('/', async (req, res) => {
  try {
    if ((req as AuthenticatedRequest).authUser?.id === 'guest') {
      const organizations = await prisma.organization.findMany({
        where: { visibility: 'public' },
        orderBy: { createdAt: 'asc' },
        include: { _count: { select: { memberships: true } } },
      })
      res.json(organizations.map(serializePublicOrganization))
      return
    }

    const profile = await profileFor(req as AuthenticatedRequest)
    const memberships = await prisma.organizationMembership.findMany({
      where: { profileId: profile.id },
      include: { organization: { include: { _count: { select: { memberships: true } } } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json(memberships.map(serializeMembership))
  } catch (error) {
    res.status(403).json({ message: (error as Error).message })
  }
})

organizationsRouter.get('/discover', async (req, res) => {
  if (!allowDiscovery(req)) {
    res.setHeader('Retry-After', '60')
    res.status(429).json({ message: 'Troppe richieste di ricerca. Riprova tra poco.' })
    return
  }
  const query = typeof req.query.q === 'string' ? req.query.q.trim() : ''
  const page = Math.max(1, Number.parseInt(String(req.query.page ?? '1'), 10) || 1)
  const perPage = Math.min(30, Math.max(1, Number.parseInt(String(req.query.per_page ?? '12'), 10) || 12))
  const where = {
    visibility: 'public' as const,
    ...(query ? {
      OR: [
        { name: { contains: query, mode: 'insensitive' as const } },
        { slug: { contains: query, mode: 'insensitive' as const } },
        { city: { contains: query, mode: 'insensitive' as const } },
        { sport: { contains: query, mode: 'insensitive' as const } },
      ],
    } : {}),
  }
  const total = await prisma.organization.count({ where })
  const organizations = await prisma.organization.findMany({
    where,
    orderBy: [{ name: 'asc' }],
    skip: (page - 1) * perPage,
    take: perPage,
    include: { _count: { select: { memberships: true } } },
  })
  res.json({ items: organizations.map(serializePublicOrganization), page, per_page: perPage, total, has_more: page * perPage < total })
})

organizationsRouter.post('/', async (req, res) => {
  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const visibility = req.body?.visibility === 'public' ? 'public' : 'private'
  if (name.length < 2) {
    res.status(400).json({ message: 'Inserisci un nome per l’organizzazione' })
    return
  }
  try {
    const profile = await profileFor(req as AuthenticatedRequest)
    const organization = await prisma.organization.create({
      data: {
        name,
        slug: await uniqueSlug(name),
        visibility,
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
  const organizationId = typeof req.body?.organization_id === 'string' ? req.body.organization_id : ''
  try {
    const profile = await profileFor(req as AuthenticatedRequest)
    const organization = organizationId
      ? await prisma.organization.findFirst({ where: { id: organizationId, visibility: 'public' } })
      : await prisma.organization.findUnique({ where: { joinCode } })
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

organizationsRouter.patch('/:id', requireOrganization, requireAdmin, async (req, res) => {
  const organizationId = (req as OrganizationRequest).organization!.id
  if (organizationId !== req.params.id) {
    res.status(403).json({ message: 'Organizzazione non autorizzata' })
    return
  }
  const data: { visibility?: string; description?: string | null; city?: string | null; sport?: string | null; joinCode?: string } = {}
  if (req.body?.visibility === 'public' || req.body?.visibility === 'private') data.visibility = req.body.visibility
  for (const field of ['description', 'city', 'sport'] as const) {
    if (typeof req.body?.[field] === 'string' || req.body?.[field] === null) data[field] = req.body[field]
  }
  if (req.body?.regenerate_code === true) data.joinCode = crypto.randomBytes(12).toString('base64url')
  const organization = await prisma.organization.update({ where: { id: organizationId }, data, include: { _count: { select: { memberships: true } } } })
  res.json(serializeMembership({ role: (req as OrganizationRequest).organization!.role, organization }))
})
