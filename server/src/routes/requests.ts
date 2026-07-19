import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { prisma } from '../db/prisma'
import { env } from '../config/env'
import { getOrCreateProfile } from '../lib/profileRepo'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth'
import { requireAdmin } from '../middleware/requireAdmin'
import { requireOrganization, requireSelectedOrganization, type OrganizationRequest as OrganizationContextRequest } from '../middleware/requireOrganization'

export const requestsRouter = Router()
requestsRouter.use(requireAuth, requireOrganization, requireSelectedOrganization)

const requestTypes = new Set(['feature', 'improvement', 'bug'])
const priorities = new Set(['low', 'medium', 'high'])
const statuses = new Set(['open', 'planned', 'in_progress', 'done', 'rejected'])

function serializeRequest(row: {
  id: string
  title: string
  description: string | null
  type: string
  priority: string
  status: string
  createdAt: Date
  updatedAt: Date
  imageUrl: string | null
  createdBy: { id: string; name: string | null; email: string }
  _count?: { votes: number }
  votes?: Array<{ profileId: string }>
}, profileId?: string) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    priority: row.priority,
    status: row.status,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    image_url: row.imageUrl,
    important_count: row._count?.votes ?? 0,
    important_by_me: Boolean(profileId && row.votes?.some(vote => vote.profileId === profileId)),
    created_by: {
      id: row.createdBy.id,
      name: row.createdBy.name ?? row.createdBy.email,
    },
  }
}

const requestInclude = (profileId?: string) => ({
  createdBy: { select: { id: true, name: true, email: true } },
  _count: { select: { votes: true } },
  ...(profileId ? { votes: { where: { profileId }, select: { profileId: true } } } : {}),
})

async function uploadRequestImage(dataUrl: unknown, requestId: string, token: string): Promise<string | null> {
  if (dataUrl == null || dataUrl === '') return null
  if (typeof dataUrl !== 'string') throw new Error('Immagine non valida')
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/)
  if (!match) throw new Error('Usa un’immagine JPG, PNG, WEBP o GIF')
  const contentType = match[1]
  const buffer = Buffer.from(match[2], 'base64')
  if (buffer.length > 5 * 1024 * 1024) throw new Error('L’immagine deve essere più piccola di 5 MB')
  const extension = contentType === 'image/jpeg' ? 'jpg' : contentType.split('/')[1]
  const path = `requests/${requestId}.${extension}`
  const response = await fetch(`${env.supabaseUrl}/storage/v1/object/request-images/${path}`, {
    method: 'POST',
    headers: { apikey: env.supabaseAnonKey, Authorization: `Bearer ${token}`, 'Content-Type': contentType, 'x-upsert': 'false' },
    body: buffer,
  })
  if (!response.ok) throw new Error('Impossibile caricare l’immagine')
  return `${env.supabaseUrl}/storage/v1/object/public/request-images/${path}`
}

function organizationId(req: OrganizationContextRequest): string {
  return req.organization!.id
}

function serializeComment(row: {
  id: string
  body: string
  createdAt: Date
  updatedAt: Date
  profile: { id: string; name: string | null; email: string }
}) {
  return {
    id: row.id,
    body: row.body,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    author: { id: row.profile.id, name: row.profile.name ?? row.profile.email },
  }
}

requestsRouter.get('/', async (req, res) => {
  const organization = organizationId(req as OrganizationContextRequest)
  const authReq = req as AuthenticatedRequest
  const profileId = authReq.authUser?.id !== 'guest' ? authReq.authUser?.id : undefined
  const status = typeof req.query.status === 'string' && statuses.has(req.query.status) ? req.query.status : undefined
  const type = typeof req.query.type === 'string' && requestTypes.has(req.query.type) ? req.query.type : undefined
  const requests = await prisma.organizationRequest.findMany({
    where: { organizationId: organization, ...(status ? { status } : {}), ...(type ? { type } : {}) },
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    include: requestInclude(profileId),
  })
  res.json(requests.map(request => serializeRequest(request, profileId)))
})

requestsRouter.get('/:id', async (req, res) => {
  const authReq = req as AuthenticatedRequest & OrganizationContextRequest
  const profileId = authReq.authUser?.id !== 'guest' ? authReq.authUser?.id : undefined
  const request = await prisma.organizationRequest.findFirst({
    where: { id: String(req.params.id), organizationId: organizationId(authReq) },
    include: requestInclude(profileId),
  })
  if (!request) {
    res.status(404).json({ message: 'Richiesta non trovata' })
    return
  }
  res.json(serializeRequest(request, profileId))
})

requestsRouter.get('/:id/comments', async (req, res) => {
  const organization = organizationId(req as OrganizationContextRequest)
  const request = await prisma.organizationRequest.findFirst({ where: { id: String(req.params.id), organizationId: organization }, select: { id: true } })
  if (!request) {
    res.status(404).json({ message: 'Richiesta non trovata' })
    return
  }
  const comments = await prisma.organizationRequestComment.findMany({
    where: { requestId: request.id },
    orderBy: { createdAt: 'asc' },
    include: { profile: { select: { id: true, name: true, email: true } } },
  })
  res.json(comments.map(serializeComment))
})

requestsRouter.post('/', async (req, res) => {
  const authReq = req as AuthenticatedRequest & OrganizationContextRequest
  if (!authReq.authUser || authReq.authUser.id === 'guest') {
    res.status(403).json({ message: 'Registrati per creare una richiesta' })
    return
  }
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  const description = typeof req.body?.description === 'string' ? req.body.description.trim() : null
  const type = requestTypes.has(req.body?.type) ? req.body.type : 'improvement'
  const priority = priorities.has(req.body?.priority) ? req.body.priority : 'medium'
  if (title.length < 3) {
    res.status(400).json({ message: 'Inserisci un titolo di almeno 3 caratteri' })
    return
  }
  const profile = await getOrCreateProfile(authReq.authUser)
  const requestId = randomUUID()
  let imageUrl: string | null = null
  try {
    imageUrl = await uploadRequestImage(req.body?.image_data_url, requestId, authReq.authToken ?? '')
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Impossibile caricare l’immagine' })
    return
  }
  const request = await prisma.organizationRequest.create({
    data: {
      id: requestId,
      organizationId: organizationId(authReq),
      createdById: profile.id,
      title,
      description: description || null,
      type,
      priority,
      imageUrl,
    },
    include: requestInclude(profile.id),
  })
  res.status(201).json(serializeRequest(request, profile.id))
})

requestsRouter.post('/:id/important', async (req, res) => {
  const authReq = req as AuthenticatedRequest & OrganizationContextRequest
  if (!authReq.authUser || authReq.authUser.id === 'guest') {
    res.status(403).json({ message: 'Registrati per indicare un argomento importante' })
    return
  }
  const requestId = String(req.params.id)
  const profile = await getOrCreateProfile(authReq.authUser)
  const existing = await prisma.organizationRequest.findFirst({ where: { id: requestId, organizationId: organizationId(authReq) }, select: { id: true } })
  if (!existing) {
    res.status(404).json({ message: 'Richiesta non trovata' })
    return
  }
  try {
    await prisma.organizationRequestVote.create({ data: { requestId, profileId: profile.id } })
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') throw error
  }
  const request = await prisma.organizationRequest.findUniqueOrThrow({ where: { id: requestId }, include: requestInclude(profile.id) })
  res.json(serializeRequest(request, profile.id))
})

requestsRouter.post('/:id/comments', async (req, res) => {
  const authReq = req as AuthenticatedRequest & OrganizationContextRequest
  if (!authReq.authUser || authReq.authUser.id === 'guest') {
    res.status(403).json({ message: 'Registrati per commentare una richiesta' })
    return
  }
  const body = typeof req.body?.body === 'string' ? req.body.body.trim() : ''
  if (!body || body.length > 2000) {
    res.status(400).json({ message: 'Il commento deve contenere da 1 a 2000 caratteri' })
    return
  }
  const request = await prisma.organizationRequest.findFirst({ where: { id: String(req.params.id), organizationId: organizationId(authReq) }, select: { id: true } })
  if (!request) {
    res.status(404).json({ message: 'Richiesta non trovata' })
    return
  }
  const profile = await getOrCreateProfile(authReq.authUser)
  const comment = await prisma.organizationRequestComment.create({
    data: { requestId: request.id, profileId: profile.id, body },
    include: { profile: { select: { id: true, name: true, email: true } } },
  })
  res.status(201).json(serializeComment(comment))
})

requestsRouter.patch('/:id', requireAdmin, async (req, res) => {
  const organization = organizationId(req as OrganizationContextRequest)
  const requestId = String(req.params.id)
  const data: { status?: string; priority?: string; type?: string; title?: string; description?: string | null } = {}
  if (typeof req.body?.status === 'string' && statuses.has(req.body.status)) data.status = req.body.status
  if (typeof req.body?.priority === 'string' && priorities.has(req.body.priority)) data.priority = req.body.priority
  if (typeof req.body?.type === 'string' && requestTypes.has(req.body.type)) data.type = req.body.type
  if (typeof req.body?.title === 'string' && req.body.title.trim().length >= 3) data.title = req.body.title.trim()
  if (typeof req.body?.description === 'string' || req.body?.description === null) data.description = req.body.description?.trim() || null
  const existing = await prisma.organizationRequest.findFirst({ where: { id: requestId, organizationId: organization }, select: { id: true } })
  if (!existing) {
    res.status(404).json({ message: 'Richiesta non trovata' })
    return
  }
  const request = await prisma.organizationRequest.update({
    where: { id: existing.id },
    data,
    include: requestInclude((req as AuthenticatedRequest).authUser?.id),
  })
  res.json(serializeRequest(request, (req as AuthenticatedRequest).authUser?.id))
})
