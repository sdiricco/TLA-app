import crypto from 'node:crypto'
import { Router } from 'express'
import { prisma } from '../db/prisma'
import { getOrCreateProfile } from '../lib/profileRepo'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth'
import { requireAdmin } from '../middleware/requireAdmin'
import { requireOrganization, requireSelectedOrganization, type OrganizationRequest } from '../middleware/requireOrganization'

export const organizationsRouter = Router()
organizationsRouter.use(requireAuth)

const discoveryHits = new Map<string, { startedAt: number; count: number }>()
const DISCOVERY_WINDOW_MS = 60_000
const DISCOVERY_MAX_REQUESTS = 60
const JOIN_WINDOW_MS = 60_000
const JOIN_MAX_REQUESTS = 10
const JOIN_CODE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const JOIN_CODE_LENGTH = 5
const joinHits = new Map<string, { startedAt: number; count: number }>()

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

function allowJoinAttempt(req: import('express').Request): boolean {
  const key = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  const current = joinHits.get(key)
  if (!current || now - current.startedAt >= JOIN_WINDOW_MS) {
    joinHits.set(key, { startedAt: now, count: 1 })
    return true
  }
  if (current.count >= JOIN_MAX_REQUESTS) return false
  current.count += 1
  return true
}

function joinCodeCandidate(): string {
  return Array.from(
    { length: JOIN_CODE_LENGTH },
    () => JOIN_CODE_ALPHABET[crypto.randomInt(JOIN_CODE_ALPHABET.length)],
  ).join('')
}

async function uniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = joinCodeCandidate()
    if (!await prisma.organization.count({ where: { joinCode: candidate } })) return candidate
  }
  throw new Error('Impossibile generare un codice invito univoco')
}

function serializeMembership(row: { role: string; organization: { id: string; name: string; slug: string; description: string | null; city: string | null; sport: string | null; latitude: number | null; longitude: number | null; visibility: string; discoverable: boolean; joinCode: string; _count?: { memberships: number } } }) {
  return {
    id: row.organization.id,
    name: row.organization.name,
    slug: row.organization.slug,
    description: row.organization.description,
    city: row.organization.city,
    sport: row.organization.sport,
    latitude: row.organization.latitude,
    longitude: row.organization.longitude,
    visibility: row.organization.visibility,
    discoverable: row.organization.discoverable,
    member_count: row.organization._count?.memberships ?? 0,
    join_code: ['owner', 'admin'].includes(row.role) ? row.organization.joinCode : '',
    role: row.role,
  }
}

function serializePublicOrganization(organization: { id: string; name: string; slug: string; description: string | null; city: string | null; sport: string | null; latitude: number | null; longitude: number | null; visibility: string; discoverable: boolean; _count: { memberships: number } }) {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    description: organization.description,
    city: organization.city,
    sport: organization.sport,
    latitude: organization.latitude,
    longitude: organization.longitude,
    visibility: organization.visibility,
    discoverable: organization.discoverable,
    member_count: organization._count.memberships,
    join_code: '',
    role: 'member',
  }
}

function slugify(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'organization'
}

function parseCoordinates(body: { latitude?: unknown; longitude?: unknown }, required: boolean): { latitude: number | null; longitude: number | null } {
  const latitude = body.latitude === null || body.latitude === undefined || body.latitude === '' ? null : Number(body.latitude)
  const longitude = body.longitude === null || body.longitude === undefined || body.longitude === '' ? null : Number(body.longitude)
  if (latitude === null && longitude === null) {
    if (required) throw new Error('Per un’organizzazione pubblica seleziona una posizione sulla mappa')
    return { latitude: null, longitude: null }
  }
  if (latitude === null || longitude === null || !Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    throw new Error('La posizione selezionata non è valida')
  }
  return { latitude, longitude }
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
    console.error('Failed to load organizations', error)
    res.status(500).json({ message: 'Impossibile caricare le organizzazioni. Verifica la connessione al database e le migrazioni.' })
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
    AND: [
      { OR: [{ visibility: 'public' as const }, { discoverable: true }] },
      ...(query ? [{
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { slug: { contains: query, mode: 'insensitive' as const } },
          { city: { contains: query, mode: 'insensitive' as const } },
          { sport: { contains: query, mode: 'insensitive' as const } },
        ],
      }] : []),
    ],
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
    const discoverable = visibility === 'public' || req.body?.discoverable === true
    const coordinates = parseCoordinates(req.body ?? {}, discoverable)
    const profile = await profileFor(req as AuthenticatedRequest)
    const organization = await prisma.organization.create({
      data: {
        name,
        description: typeof req.body?.description === 'string' ? req.body.description.trim() || null : null,
        slug: await uniqueSlug(name),
        visibility,
        discoverable,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        joinCode: await uniqueJoinCode(),
        memberships: { create: { profileId: profile.id, role: 'owner' } },
      },
    })
    res.status(201).json({ id: organization.id, name: organization.name, slug: organization.slug, visibility: organization.visibility, discoverable: organization.discoverable, latitude: organization.latitude, longitude: organization.longitude, join_code: organization.joinCode, role: 'owner' })
  } catch (error) {
    res.status(400).json({ message: (error as Error).message })
  }
})

organizationsRouter.post('/join', async (req, res) => {
  if (!allowJoinAttempt(req)) {
    res.setHeader('Retry-After', '60')
    res.status(429).json({ message: 'Troppi tentativi. Riprova tra un minuto.' })
    return
  }
  const rawJoinCode = typeof req.body?.join_code === 'string' ? req.body.join_code.trim() : ''
  const joinCode = rawJoinCode.length === JOIN_CODE_LENGTH ? rawJoinCode.toUpperCase() : rawJoinCode
  const organizationId = typeof req.body?.organization_id === 'string' ? req.body.organization_id : ''
  const validNewCode = /^[A-Z0-9]{5}$/.test(joinCode)
  const validLegacyCode = /^[A-Za-z0-9_-]{8,64}$/.test(joinCode)
  if (!organizationId && !validNewCode && !validLegacyCode) {
    res.status(400).json({ message: 'Il codice invito non è valido' })
    return
  }
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
    res.json({ id: organization.id, name: organization.name, slug: organization.slug, visibility: organization.visibility, discoverable: organization.discoverable, latitude: organization.latitude, longitude: organization.longitude, join_code: '', role: 'member' })
  } catch (error) {
    res.status(400).json({ message: (error as Error).message })
  }
})

organizationsRouter.post('/:id/request', async (req, res) => {
  try {
    const profile = await profileFor(req as AuthenticatedRequest)
    const organization = await prisma.organization.findFirst({ where: { id: req.params.id, discoverable: true }, include: { _count: { select: { memberships: true } } } })
    if (!organization) {
      res.status(404).json({ message: 'Organizzazione non disponibile per le richieste' })
      return
    }
    const membership = await prisma.organizationMembership.findUnique({ where: { organizationId_profileId: { organizationId: organization.id, profileId: profile.id } } })
    if (membership) {
      res.json({ organization: serializeMembership({ role: membership.role, organization }), status: 'approved' })
      return
    }
    await prisma.organizationAccessRequest.upsert({
      where: { organizationId_profileId: { organizationId: organization.id, profileId: profile.id } },
      create: { organizationId: organization.id, profileId: profile.id },
      update: { status: 'pending' },
    })
    res.status(201).json({ organization: serializePublicOrganization(organization), status: 'pending' })
  } catch (error) {
    res.status(400).json({ message: (error as Error).message })
  }
})

organizationsRouter.patch('/:id', requireOrganization, requireSelectedOrganization, requireAdmin, async (req, res) => {
  const organizationId = (req as OrganizationRequest).organization!.id
  if (organizationId !== req.params.id) {
    res.status(403).json({ message: 'Organizzazione non autorizzata' })
    return
  }
  const currentOrganization = await prisma.organization.findUnique({ where: { id: organizationId }, select: { visibility: true, discoverable: true, latitude: true, longitude: true } })
  if (!currentOrganization) {
    res.status(404).json({ message: 'Organizzazione non trovata' })
    return
  }
  const data: { visibility?: string; discoverable?: boolean; description?: string | null; city?: string | null; sport?: string | null; latitude?: number | null; longitude?: number | null; joinCode?: string } = {}
  if (req.body?.visibility === 'public' || req.body?.visibility === 'private') data.visibility = req.body.visibility
  if (typeof req.body?.discoverable === 'boolean') data.discoverable = data.visibility === 'public' ? true : req.body.discoverable
  for (const field of ['description', 'city', 'sport'] as const) {
    if (typeof req.body?.[field] === 'string' || req.body?.[field] === null) data[field] = req.body[field]
  }
  if (req.body?.latitude !== undefined || req.body?.longitude !== undefined || (data.visibility === 'public' && data.discoverable !== false) || (currentOrganization.visibility === 'public' && currentOrganization.discoverable)) {
    const coordinates = parseCoordinates({
      latitude: req.body?.latitude !== undefined ? req.body.latitude : currentOrganization.latitude,
      longitude: req.body?.longitude !== undefined ? req.body.longitude : currentOrganization.longitude,
    }, data.discoverable ?? currentOrganization.discoverable)
    data.latitude = coordinates.latitude
    data.longitude = coordinates.longitude
  }
  if (req.body?.regenerate_code === true) data.joinCode = await uniqueJoinCode()
  const organization = await prisma.organization.update({ where: { id: organizationId }, data, include: { _count: { select: { memberships: true } } } })
  res.json(serializeMembership({ role: (req as OrganizationRequest).organization!.role, organization }))
})
