import { Router } from 'express'
import { prisma } from '../db/prisma'
import { getOrCreateProfile } from '../lib/profileRepo'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth'
import { requireAdmin } from '../middleware/requireAdmin'
import { requireOrganization, type OrganizationRequest as OrganizationContextRequest } from '../middleware/requireOrganization'

export const requestsRouter = Router()
requestsRouter.use(requireAuth, requireOrganization)

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
  createdBy: { id: string; name: string | null; email: string }
}) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    type: row.type,
    priority: row.priority,
    status: row.status,
    created_at: row.createdAt.toISOString(),
    updated_at: row.updatedAt.toISOString(),
    created_by: {
      id: row.createdBy.id,
      name: row.createdBy.name ?? row.createdBy.email,
    },
  }
}

function organizationId(req: OrganizationContextRequest): string {
  return req.organization!.id
}

requestsRouter.get('/', async (req, res) => {
  const organization = organizationId(req as OrganizationContextRequest)
  const status = typeof req.query.status === 'string' && statuses.has(req.query.status) ? req.query.status : undefined
  const type = typeof req.query.type === 'string' && requestTypes.has(req.query.type) ? req.query.type : undefined
  const requests = await prisma.organizationRequest.findMany({
    where: { organizationId: organization, ...(status ? { status } : {}), ...(type ? { type } : {}) },
    orderBy: [{ status: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  })
  res.json(requests.map(serializeRequest))
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
  const request = await prisma.organizationRequest.create({
    data: {
      organizationId: organizationId(authReq),
      createdById: profile.id,
      title,
      description: description || null,
      type,
      priority,
    },
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  })
  res.status(201).json(serializeRequest(request))
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
    include: { createdBy: { select: { id: true, name: true, email: true } } },
  })
  res.json(serializeRequest(request))
})
