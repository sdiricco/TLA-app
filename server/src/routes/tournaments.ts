import { randomUUID } from 'node:crypto'
import { Router, raw } from 'express'
import { Prisma } from '@prisma/client'
import type { TournamentCreate, TournamentUpdate } from '../../../src/types'
import { env } from '../config/env'
import { prisma } from '../db/prisma'
import { requireAuth, type AuthenticatedRequest } from '../middleware/requireAuth'
import { requireAdmin } from '../middleware/requireAdmin'
import { requireOrganization, type OrganizationRequest } from '../middleware/requireOrganization'
import { sortMatches } from '../lib/bracket'
import { reconcileMatchProgression } from '../lib/matchProgression'
import { buildTournamentMatchesResponse } from '../../../src/utils/matches'
import { generateDrawPdf, getDrawPdfFilename } from '../lib/drawPdf'
import { getOrCreateProfile } from '../lib/profileRepo'
import { visibleTournamentWhere as getVisibleTournamentWhere } from '../lib/visibility'
import {
  serializeMatch,
  serializeTournament,
  serializeTournamentPhase,
  serializeTournamentWithPlayers,
} from '../lib/serializers'
import {
  completeTournamentPhase,
  createTournamentPhases,
  generatePhaseMatches,
  normalizeTournamentPhases,
  removePlayerFromFirstPhase,
  syncPlayerWithFirstPhase,
  tournamentPhaseInclude,
  validateTournamentPhases,
} from '../lib/tournamentPhases'

export const tournamentsRouter = Router()
const TOURNAMENT_REGULATIONS_BUCKET = 'tournament-regulations'
const MAX_REGULATION_SIZE = 6 * 1024 * 1024
const tournamentOrganizerInclude = {
  organizer: { select: { id: true, name: true } },
} satisfies Prisma.TournamentInclude

tournamentsRouter.use(requireAuth)
tournamentsRouter.use(requireOrganization)

function contextOrganizationId(req: OrganizationRequest): string | null {
  return req.organization?.id ?? null
}

function visibleTournamentWhere(organizationId: string | null): Prisma.TournamentWhereInput {
  return organizationId
    ? { OR: [{ organizationId }, { organizationId: null }] }
    : { organizationId: null }
}

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

async function getNextSeed(tournamentId: string): Promise<number> {
  const entries = await prisma.tournamentPlayer.findMany({
    where: { tournamentId },
    select: { seed: true },
  })
  return (entries ?? []).reduce((max, row) => Math.max(max, row.seed ?? 0), 0) + 1
}

function parseNullableInt(value: unknown): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('Invalid numeric value')
  }
  return parsed
}

function parseNonNegativeInt(value: unknown, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error('Invalid pagination value')
  }
  return parsed
}

function parsePositiveInt(value: unknown, fallback: number): number {
  if (value === undefined) return fallback
  const parsed = typeof value === 'number' ? value : Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error('Invalid pagination value')
  }
  return parsed
}

function tournamentCapacityReached(limit: number | null, count: number): boolean {
  return limit !== null && count >= limit
}

type SelfEnrollmentTournament = {
  id: string
  organizationId: string | null
  participantLimit: number | null
  published: boolean
  status: string
  registrationStartDate: Date | null
  registrationEndDate: Date | null
}

async function findSelfEnrollmentTournament(
  tournamentId: string,
  organizationId: string | null,
): Promise<SelfEnrollmentTournament | null> {
  return prisma.tournament.findFirst({
    where: { id: tournamentId, ...visibleTournamentWhere(organizationId) },
    select: {
      id: true,
      organizationId: true,
      participantLimit: true,
      published: true,
      status: true,
      registrationStartDate: true,
      registrationEndDate: true,
    },
  })
}

function assertSelfEnrollmentOpen(tournament: SelfEnrollmentTournament, now = new Date()): void {
  if (!tournament.published) throw new Error('Le iscrizioni non sono disponibili')
  if (tournament.status !== 'upcoming') throw new Error('Le iscrizioni sono chiuse')

  if (tournament.registrationStartDate) {
    const registrationStart = new Date(tournament.registrationStartDate)
    registrationStart.setUTCHours(0, 0, 0, 0)
    if (now < registrationStart) throw new Error('Le iscrizioni non sono ancora aperte')
  }

  if (tournament.registrationEndDate) {
    const registrationEnd = new Date(tournament.registrationEndDate)
    registrationEnd.setUTCHours(23, 59, 59, 999)
    if (now > registrationEnd) throw new Error('Le iscrizioni sono chiuse')
  }
}

async function findSelfEnrollmentPlayer(userId: string, organizationId: string | null) {
  return prisma.player.findFirst({ where: { userId, organizationId } })
}

async function getOrCreateSelfEnrollmentPlayer(
  authUser: NonNullable<AuthenticatedRequest['authUser']>,
  organizationId: string | null,
) {
  const existingPlayer = await findSelfEnrollmentPlayer(authUser.id, organizationId)
  if (existingPlayer) return existingPlayer

  const profile = await getOrCreateProfile(authUser)
  try {
    return await prisma.player.create({
      data: {
        userId: profile.id,
        organizationId,
        name: profile.name?.trim() || profile.email,
        ranking: 0,
      },
    })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const concurrentlyCreatedPlayer = await findSelfEnrollmentPlayer(authUser.id, organizationId)
      if (concurrentlyCreatedPlayer) return concurrentlyCreatedPlayer
    }
    throw error
  }
}

function parseRegulationFileName(value: string | undefined): string {
  if (!value) throw new Error('Nome del file mancante')
  let decoded: string
  try {
    decoded = decodeURIComponent(value)
  } catch {
    throw new Error('Nome del file non valido')
  }
  const fileName = decoded.trim()
  if (!fileName || fileName.length > 255 || /[/\\\u0000-\u001f\u007f]/.test(fileName)) {
    throw new Error('Nome del file non valido')
  }
  return fileName
}

function regulationStorageUrl(path: string, authenticated = false): string {
  const encodedPath = path.split('/').map(encodeURIComponent).join('/')
  const access = authenticated ? 'authenticated/' : ''
  return `${env.supabaseUrl}/storage/v1/object/${access}${TOURNAMENT_REGULATIONS_BUCKET}/${encodedPath}`
}

async function assertCanAddParticipant(tournamentId: string, playerId: string, organizationId: string | null): Promise<void> {
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, ...visibleTournamentWhere(organizationId) },
    select: { participantLimit: true, organizationId: true },
  })
  if (!tournament) {
    throw new Error('Torneo non trovato')
  }
  const playerExists = await prisma.player.count({
    where: { id: playerId, ...(tournament.organizationId ? { organizationId: tournament.organizationId } : {}) },
  })
  if (!playerExists) throw new Error('Giocatore non trovato')

  const alreadyEnrolled = await prisma.tournamentPlayer.findUnique({
    where: {
      tournamentId_playerId: {
        tournamentId,
        playerId,
      },
    },
  })
  if (alreadyEnrolled) return

  const count = await prisma.tournamentPlayer.count({
    where: { tournamentId },
  })
  if (tournamentCapacityReached(tournament.participantLimit, count)) {
    throw new Error('Torneo al completo')
  }
}

tournamentsRouter.get('/', async (req, res) => {
  try {
    const { name, category, status, dateFrom, dateTo, organizerId, page: pageParam, perPage: perPageParam } = req.query as {
      name?: string
      category?: string
      status?: string
      dateFrom?: string
      dateTo?: string
      organizerId?: string
      page?: string
      perPage?: string
    }

    const page = parseNonNegativeInt(pageParam, 0)
    const perPage = Math.min(parsePositiveInt(perPageParam, 12), 100)
    const fromDate = parseDate(dateFrom)
    const toDate = parseDate(dateTo)
    if (dateFrom && !fromDate) throw new Error('Invalid start date')
    if (dateTo && !toDate) throw new Error('Invalid end date')
    if (toDate) toDate.setUTCHours(23, 59, 59, 999)
    if (fromDate && toDate && fromDate > toDate) throw new Error('Invalid date range')

    const where: Prisma.TournamentWhereInput = {
      ...(await getVisibleTournamentWhere(req as OrganizationRequest)),
      ...(name
        ? {
            name: {
              contains: name,
              mode: 'insensitive' as const,
            },
          }
        : {}),
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      ...(organizerId ? { organizerProfileId: organizerId } : {}),
      ...(fromDate
        ? {
            OR: [
              { endDate: { gte: fromDate } },
              { endDate: null, startDate: { gte: fromDate } },
            ],
          }
        : {}),
      ...(toDate ? { startDate: { lte: toDate } } : {}),
    }

    const [total, tournaments] = await prisma.$transaction([
      prisma.tournament.count({ where }),
      prisma.tournament.findMany({
        where,
        include: tournamentOrganizerInclude,
        orderBy: [{ startDate: 'desc' }, { name: 'asc' }],
        skip: page * perPage,
        take: perPage,
      }),
    ])

    res.json({
      page,
      perPage,
      total,
      values: tournaments.map(serializeTournament),
    })
  } catch (error) {
    res.status(400).json({ message: error instanceof Error ? error.message : 'Invalid query params' })
  }
})

tournamentsRouter.get('/:id', async (req, res) => {
  const tournamentId = req.params['id'] as string
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, ...(await getVisibleTournamentWhere(req as OrganizationRequest)) },
    include: {
      ...tournamentOrganizerInclude,
      players: { orderBy: { seed: 'asc' } },
      phases: {
        orderBy: { position: 'asc' },
        include: tournamentPhaseInclude,
      },
    },
  })
  if (!tournament) {
    res.status(404).json({ message: 'Torneo non trovato' })
    return
  }
  res.json(serializeTournamentWithPlayers(tournament))
})

tournamentsRouter.post(
  '/:id/regulation',
  requireAdmin,
  raw({ type: 'application/octet-stream', limit: MAX_REGULATION_SIZE }),
  async (req, res) => {
    const authReq = req as AuthenticatedRequest & OrganizationRequest
    const tournamentId = String(req.params['id'])
    const organizationId = contextOrganizationId(authReq)
    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, ...visibleTournamentWhere(organizationId) },
    })
    if (!tournament) {
      res.status(404).json({ message: 'Torneo non trovato' })
      return
    }

    try {
      if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        throw new Error('Seleziona un file da caricare')
      }
      if (req.body.length > MAX_REGULATION_SIZE) {
        throw new Error('Il regolamento non può superare 6 MB')
      }
      const fileName = parseRegulationFileName(req.header('x-file-name'))
      const contentType = req.header('x-file-type')?.trim().slice(0, 255) || 'application/octet-stream'
      const userId = authReq.authUser?.id
      if (!userId || userId === 'guest') {
        res.status(403).json({ message: 'Non puoi caricare un regolamento come ospite' })
        return
      }

      const path = `${userId}/${tournamentId}/${randomUUID()}`
      const fileBytes = new Uint8Array(req.body.length)
      fileBytes.set(req.body)
      const storageResponse = await fetch(regulationStorageUrl(path), {
        method: 'POST',
        headers: {
          apikey: env.supabaseAnonKey,
          Authorization: `Bearer ${authReq.authToken ?? ''}`,
          'Content-Type': contentType,
          'x-upsert': 'false',
        },
        body: fileBytes,
      })
      if (!storageResponse.ok) {
        throw new Error('Impossibile caricare il regolamento')
      }

      const updatedTournament = await prisma.tournament.update({
        where: { id: tournamentId },
        data: {
          regulationPath: path,
          regulationName: fileName,
          regulationContentType: contentType,
          regulationSize: BigInt(req.body.length),
        },
        include: tournamentOrganizerInclude,
      })
      res.status(201).json(serializeTournament(updatedTournament))
    } catch (error) {
      res.status(400).json({
        message: error instanceof Error ? error.message : 'Impossibile caricare il regolamento',
      })
    }
  },
)

tournamentsRouter.get('/:id/regulation', async (req, res) => {
  const authReq = req as AuthenticatedRequest & OrganizationRequest
  if (!authReq.authUser || authReq.authUser.id === 'guest') {
    res.status(403).json({ message: 'Accedi per scaricare il regolamento' })
    return
  }
  const tournamentId = String(req.params['id'])
  const organizationId = contextOrganizationId(authReq)
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, ...visibleTournamentWhere(organizationId) },
    select: {
      regulationPath: true,
      regulationName: true,
      regulationContentType: true,
    },
  })
  if (!tournament?.regulationPath || !tournament.regulationName) {
    res.status(404).json({ message: 'Regolamento non disponibile' })
    return
  }

  const storageResponse = await fetch(regulationStorageUrl(tournament.regulationPath, true), {
    headers: {
      apikey: env.supabaseAnonKey,
      Authorization: `Bearer ${authReq.authToken ?? ''}`,
    },
  })
  if (!storageResponse.ok) {
    res.status(502).json({ message: 'Impossibile scaricare il regolamento' })
    return
  }
  const file = Buffer.from(await storageResponse.arrayBuffer())
  res.setHeader('Content-Type', tournament.regulationContentType ?? 'application/octet-stream')
  res.setHeader(
    'Content-Disposition',
    `attachment; filename*=UTF-8''${encodeURIComponent(tournament.regulationName)}`,
  )
  res.setHeader('Content-Length', String(file.length))
  res.send(file)
})

tournamentsRouter.post('/', requireAdmin, async (req, res) => {
  try {
    const authReq = req as AuthenticatedRequest & OrganizationRequest
    const data = req.body as TournamentCreate
    const organizationId = contextOrganizationId(authReq)
    const organizer = await getOrCreateProfile(authReq.authUser!)
    const participantLimit = parseNullableInt(data.participant_limit)
    const groupCount = parseNullableInt(data.group_count)
    const qualifiersPerGroup = parseNullableInt(data.qualifiers_per_group)
    const phases = normalizeTournamentPhases(
      data.format,
      data.phases,
      groupCount,
      qualifiersPerGroup,
    )
    validateTournamentPhases(phases, participantLimit)

    const tournament = await prisma.$transaction(async (tx) => {
      const created = await tx.tournament.create({
        data: {
          organizationId,
          organizerProfileId: organizer.id,
          name: data.name,
          location: data.location ?? null,
          registrationStartDate: parseDate(data.registration_start_date ?? null),
          registrationEndDate: parseDate(data.registration_end_date ?? null),
          gameFormula: data.game_formula ?? null,
          registrationFee: data.registration_fee ?? null,
          startDate: parseDate(data.start_date ?? null),
          endDate: parseDate(data.end_date ?? null),
          format: data.format,
          category: data.category,
          status: data.status,
          published: data.published,
          participantLimit: participantLimit ?? null,
          groupCount: groupCount ?? null,
          qualifiersPerGroup: qualifiersPerGroup ?? null,
        },
      })
      await createTournamentPhases(tx, created.id, phases)
      return tx.tournament.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          ...tournamentOrganizerInclude,
          players: true,
          phases: {
            orderBy: { position: 'asc' },
            include: tournamentPhaseInclude,
          },
        },
      })
    })
    res.status(201).json(serializeTournamentWithPlayers(tournament))
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      res.status(404).json({ message: 'Torneo non trovato' })
      return
    }
    res.status(400).json({ message: (error as Error).message })
  }
})

tournamentsRouter.put('/:id', requireAdmin, async (req, res) => {
  const body = req.body as TournamentUpdate & { playerIds?: string[] }
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  const tournamentExists = await prisma.tournament.count({ where: { id: tournamentId, ...visibleTournamentWhere(organizationId) } })
  if (!tournamentExists) {
    res.status(404).json({ message: 'Torneo non trovato' })
    return
  }

  if (Array.isArray(body.playerIds)) {
    const tournamentForPlayers = await prisma.tournament.findFirst({ where: { id: tournamentId, ...visibleTournamentWhere(organizationId) }, select: { organizationId: true } })
    const playersInOrganization = await prisma.player.count({
      where: { id: { in: body.playerIds }, ...(tournamentForPlayers?.organizationId ? { organizationId: tournamentForPlayers.organizationId } : {}) },
    })
    if (playersInOrganization !== new Set(body.playerIds).size) {
      res.status(400).json({ message: 'Uno o più giocatori non appartengono all’organizzazione' })
      return
    }
    await prisma.$transaction(async (tx) => {
      await tx.tournamentPlayer.deleteMany({ where: { tournamentId } })
      if (body.playerIds!.length > 0) {
        await tx.tournamentPlayer.createMany({
          data: body.playerIds!.map((playerId, index) => ({
            tournamentId,
            playerId,
            seed: index + 1,
          })),
        })
      }
      const firstPhase = await tx.tournamentPhase.findFirst({
        where: { tournamentId },
        orderBy: { position: 'asc' },
        select: { id: true },
      })
      if (firstPhase) {
        await tx.tournamentPhasePlayer.deleteMany({ where: { phaseId: firstPhase.id } })
        if (body.playerIds!.length > 0) {
          await tx.tournamentPhasePlayer.createMany({
            data: body.playerIds!.map((playerId, index) => ({
              phaseId: firstPhase.id,
              playerId,
              seed: index + 1,
            })),
          })
        }
      }
    })
    res.status(204).send()
    return
  }

  try {
    const participantLimit = body.participant_limit !== undefined ? parseNullableInt(body.participant_limit) : undefined
    const groupCount = body.group_count !== undefined ? parseNullableInt(body.group_count) : undefined
    const qualifiersPerGroup =
      body.qualifiers_per_group !== undefined ? parseNullableInt(body.qualifiers_per_group) : undefined
    const replacementPhases = body.phases
      ? normalizeTournamentPhases(
          body.format ?? 'single_elimination',
          body.phases,
          groupCount,
          qualifiersPerGroup,
        )
      : null
    if (replacementPhases) validateTournamentPhases(replacementPhases, participantLimit)

    const tournament = await prisma.$transaction(async (tx) => {
      if (replacementPhases) {
        const existingMatches = await tx.match.count({ where: { tournamentId } })
        if (existingMatches > 0) {
          throw new Error('Non puoi modificare le fasi dopo la generazione degli incontri')
        }
        await tx.tournamentPhase.deleteMany({ where: { tournamentId } })
        await createTournamentPhases(tx, tournamentId, replacementPhases)
        const players = await tx.tournamentPlayer.findMany({
          where: { tournamentId },
          orderBy: { seed: 'asc' },
        })
        for (const [index, entry] of players.entries()) {
          await syncPlayerWithFirstPhase(tx, tournamentId, entry.playerId, entry.seed ?? index + 1)
        }
      }
      await tx.tournament.update({
        where: { id: tournamentId },
        data: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.location !== undefined ? { location: body.location ?? null } : {}),
          ...(body.registration_start_date !== undefined
            ? { registrationStartDate: parseDate(body.registration_start_date ?? null) }
            : {}),
          ...(body.registration_end_date !== undefined
            ? { registrationEndDate: parseDate(body.registration_end_date ?? null) }
            : {}),
          ...(body.game_formula !== undefined ? { gameFormula: body.game_formula ?? null } : {}),
          ...(body.registration_fee !== undefined ? { registrationFee: body.registration_fee ?? null } : {}),
          ...(body.start_date !== undefined ? { startDate: parseDate(body.start_date ?? null) } : {}),
          ...(body.end_date !== undefined ? { endDate: parseDate(body.end_date ?? null) } : {}),
          ...(body.format !== undefined ? { format: body.format } : {}),
          ...(body.category !== undefined ? { category: body.category } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
          ...(body.published !== undefined ? { published: body.published } : {}),
          ...(participantLimit !== undefined ? { participantLimit } : {}),
          ...(groupCount !== undefined ? { groupCount } : {}),
          ...(qualifiersPerGroup !== undefined ? { qualifiersPerGroup } : {}),
        },
      })
      return tx.tournament.findUniqueOrThrow({
        where: { id: tournamentId },
        include: {
          ...tournamentOrganizerInclude,
          players: { orderBy: { seed: 'asc' } },
          phases: {
            orderBy: { position: 'asc' },
            include: tournamentPhaseInclude,
          },
        },
      })
    })
    res.json(serializeTournamentWithPlayers(tournament))
  } catch (error) {
    res.status(400).json({ message: (error as Error).message })
  }
})

tournamentsRouter.delete('/:id', requireAdmin, async (req, res) => {
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  try {
    const deleted = await prisma.tournament.deleteMany({ where: { id: tournamentId, ...visibleTournamentWhere(organizationId) } })
    if (deleted.count === 0) throw new Error('NOT_FOUND')
    res.status(204).send()
  } catch {
    res.status(404).json({ message: 'Torneo non trovato' })
  }
})

tournamentsRouter.post('/:id/players', requireAdmin, async (req, res) => {
  const { playerId } = req.body as { playerId: string }
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  try {
    await assertCanAddParticipant(tournamentId, playerId, organizationId)
  } catch (error) {
    const message = (error as Error).message
    res.status(message === 'Torneo non trovato' ? 404 : 400).json({ message })
    return
  }
  const seed = await getNextSeed(tournamentId)
  await prisma.$transaction(async (tx) => {
    await tx.tournamentPlayer.upsert({
      where: {
        tournamentId_playerId: {
          tournamentId,
          playerId,
        },
      },
      create: {
        tournamentId,
        playerId,
        seed,
      },
      update: {
        seed,
      },
    })
    await syncPlayerWithFirstPhase(tx, tournamentId, playerId, seed)
  })
  res.status(204).send()
})

tournamentsRouter.delete('/:id/players/:playerId', requireAdmin, async (req, res) => {
  const tournamentId = req.params['id'] as string
  const playerId = req.params['playerId'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  await prisma.$transaction(async (tx) => {
    await tx.tournamentPlayer.deleteMany({
      where: {
        tournamentId,
        playerId,
        tournament: visibleTournamentWhere(organizationId),
      },
    })
    await removePlayerFromFirstPhase(tx, tournamentId, playerId)
  })
  res.status(204).send()
})

tournamentsRouter.patch('/:id/publish', requireAdmin, async (req, res) => {
  const { published } = req.body as { published: boolean }
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  try {
    const exists = await prisma.tournament.count({ where: { id: tournamentId, ...visibleTournamentWhere(organizationId) } })
    if (!exists) throw new Error('NOT_FOUND')
    const tournament = await prisma.tournament.update({
      where: { id: tournamentId },
      data: { published },
      include: tournamentOrganizerInclude,
    })
    res.json(serializeTournament(tournament))
  } catch {
    res.status(404).json({ message: 'Torneo non trovato' })
  }
})

tournamentsRouter.get('/:id/enrollment', async (req, res) => {
  const authReq = req as AuthenticatedRequest
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  if (!authReq.authUser || authReq.authUser.id === 'guest') {
    res.status(401).json({ message: 'Not authenticated' })
    return
  }

  const tournament = await findSelfEnrollmentTournament(tournamentId, organizationId)
  if (!tournament) {
    res.status(404).json({ message: 'Torneo non trovato' })
    return
  }

  const player = await findSelfEnrollmentPlayer(authReq.authUser.id, tournament.organizationId)
  const enrolled = player
    ? Boolean(await prisma.tournamentPlayer.findUnique({
        where: { tournamentId_playerId: { tournamentId, playerId: player.id } },
        select: { playerId: true },
      }))
    : false

  res.json({ enrolled, player_id: player?.id ?? null })
})

tournamentsRouter.post('/:id/enroll', async (req, res) => {
  const authReq = req as AuthenticatedRequest
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  if (!authReq.authUser || authReq.authUser.id === 'guest') {
    res.status(401).json({ message: 'Not authenticated' })
    return
  }

  try {
    const tournament = await findSelfEnrollmentTournament(tournamentId, organizationId)
    if (!tournament) {
      res.status(404).json({ message: 'Torneo non trovato' })
      return
    }
    assertSelfEnrollmentOpen(tournament)
    const player = await getOrCreateSelfEnrollmentPlayer(authReq.authUser, tournament.organizationId)
    await assertCanAddParticipant(tournamentId, player.id, organizationId)

    const seed = await getNextSeed(tournamentId)
    await prisma.$transaction(async (tx) => {
      await tx.tournamentPlayer.upsert({
        where: {
          tournamentId_playerId: {
            tournamentId,
            playerId: player.id,
          },
        },
        create: {
          tournamentId,
          playerId: player.id,
          seed,
        },
        update: {},
      })
      await syncPlayerWithFirstPhase(tx, tournamentId, player.id, seed)
    })

    res.json({ enrolled: true, player_id: player.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Impossibile completare l’iscrizione'
    res.status(message === 'Torneo non trovato' ? 404 : 400).json({ message })
  }
})

tournamentsRouter.delete('/:id/enroll', async (req, res) => {
  const authReq = req as AuthenticatedRequest
  const tournamentId = req.params['id'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  if (!authReq.authUser || authReq.authUser.id === 'guest') {
    res.status(401).json({ message: 'Not authenticated' })
    return
  }

  const tournament = await findSelfEnrollmentTournament(tournamentId, organizationId)
  if (!tournament) {
    res.status(404).json({ message: 'Torneo non trovato' })
    return
  }
  if (tournament.status !== 'upcoming') {
    res.status(400).json({ message: 'Non puoi ritirarti dopo l’inizio del torneo' })
    return
  }

  const player = await findSelfEnrollmentPlayer(authReq.authUser.id, tournament.organizationId)
  if (!player) {
    res.json({ enrolled: false, player_id: null })
    return
  }

  await prisma.$transaction(async (tx) => {
    await tx.tournamentPlayer.deleteMany({
      where: {
        tournamentId,
        playerId: player.id,
        tournament: visibleTournamentWhere(organizationId),
      },
    })
    await removePlayerFromFirstPhase(tx, tournamentId, player.id)
  })
  res.json({ enrolled: false, player_id: player.id })
})

tournamentsRouter.get('/:id/draw.pdf', async (req, res) => {
  const tournamentId = req.params['id'] as string
  const requestedPhaseId = typeof req.query['phaseId'] === 'string' ? req.query['phaseId'] : undefined
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, ...visibleTournamentWhere(organizationId) },
    include: {
      players: {
        include: { player: true },
      },
      phases: {
        orderBy: { position: 'asc' },
        include: tournamentPhaseInclude,
      },
    },
  })
  if (!tournament) {
    res.status(404).json({ message: 'Torneo non trovato' })
    return
  }
  const phase = requestedPhaseId
    ? tournament.phases.find((entry) => entry.id === requestedPhaseId)
    : tournament.phases.find((entry) => entry.status === 'active')
      ?? tournament.phases.at(-1)
  if (!phase) {
    res.status(409).json({ message: 'Il torneo non contiene fasi configurate' })
    return
  }

  const matches = await prisma.$transaction(async (tx) => {
    if (phase.format === 'single_elimination') {
      await reconcileMatchProgression(tx, tournamentId, phase.id)
    }
    return tx.match.findMany({
      where: { tournamentId, phaseId: phase.id },
      orderBy: [{ round: 'asc' }, { position: 'asc' }],
    })
  })
  if (matches.length === 0) {
    res.status(409).json({ message: 'Il tabellone non è ancora stato generato' })
    return
  }

  const tournamentSummary = {
    id: tournament.id,
    name: tournament.phases.length > 1 ? `${tournament.name} · ${phase.name}` : tournament.name,
    format: phase.format as TournamentCreate['format'],
    category: tournament.category as TournamentCreate['category'],
    status: tournament.status as TournamentCreate['status'],
  }
  const response = buildTournamentMatchesResponse(
    tournamentSummary,
    phase.players.length,
    matches.map(serializeMatch),
  )
  const pdf = await generateDrawPdf({
    ...response,
    tournament: {
      ...response.tournament,
      location: tournament.location,
      start_date: tournament.startDate?.toISOString(),
      end_date: tournament.endDate?.toISOString(),
    },
    players: tournament.players.map(({ player }) => ({
      id: player.id,
      name: player.name,
      ranking: player.ranking,
      club: player.club,
    })),
  })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${getDrawPdfFilename(tournament.name)}"`)
  res.setHeader('Content-Length', String(pdf.length))
  res.send(pdf)
})

tournamentsRouter.get('/:id/matches', async (req, res) => {
  const tournamentId = req.params['id'] as string
  const requestedPhaseId = typeof req.query['phaseId'] === 'string' ? req.query['phaseId'] : undefined
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  const tournament = await prisma.tournament.findFirst({
    where: { id: tournamentId, ...visibleTournamentWhere(organizationId) },
    include: {
      phases: {
        orderBy: { position: 'asc' },
        include: tournamentPhaseInclude,
      },
    },
  })
  if (!tournament) {
    res.status(404).json({ message: 'Torneo non trovato' })
    return
  }
  const phase = requestedPhaseId
    ? tournament.phases.find((entry) => entry.id === requestedPhaseId)
    : tournament.phases.find((entry) => entry.status === 'active')
      ?? tournament.phases.at(-1)
  if (!phase) {
    res.status(409).json({ message: 'Il torneo non contiene fasi configurate' })
    return
  }
  const matches = await prisma.$transaction(async (tx) => {
    if (phase.format === 'single_elimination') {
      await reconcileMatchProgression(tx, tournamentId, phase.id)
    }
    return tx.match.findMany({
      where: { tournamentId, phaseId: phase.id },
      orderBy: [{ round: 'asc' }, { position: 'asc' }],
    })
  })
  res.json({
    ...buildTournamentMatchesResponse({
      id: tournament.id,
      name: tournament.name,
      format: phase.format as TournamentCreate['format'],
      category: tournament.category as TournamentCreate['category'],
      status: tournament.status as TournamentCreate['status'],
    }, phase.players.length, matches.map(serializeMatch)),
    phase: serializeTournamentPhase(phase),
  })
})

tournamentsRouter.post('/:id/bracket', requireAdmin, async (req, res) => {
  try {
    const tournamentId = req.params['id'] as string
    const requestedPhaseId =
      typeof req.body?.phaseId === 'string' ? req.body.phaseId as string : undefined
    const organizationId = contextOrganizationId(req as OrganizationRequest)
    const tournament = await prisma.tournament.findFirst({
      where: { id: tournamentId, ...visibleTournamentWhere(organizationId) },
      include: {
        phases: {
          orderBy: { position: 'asc' },
          include: tournamentPhaseInclude,
        },
      },
    })
    if (!tournament) {
      res.status(404).json({ message: 'Torneo non trovato' })
      return
    }
    const phase = requestedPhaseId
      ? tournament.phases.find((entry) => entry.id === requestedPhaseId)
      : tournament.phases.find((entry) => entry.status === 'active')
        ?? tournament.phases[0]
    if (!phase) {
      res.status(409).json({ message: 'Il torneo non contiene fasi configurate' })
      return
    }
    const matches = await prisma.$transaction(async (tx) => {
      await generatePhaseMatches(tx, tournamentId, phase.id)
      return tx.match.findMany({
        where: { tournamentId, phaseId: phase.id },
        orderBy: [{ round: 'asc' }, { position: 'asc' }],
      })
    })
    res.json(sortMatches(matches.map(serializeMatch)))
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : 'Impossibile generare gli incontri',
    })
  }
})

tournamentsRouter.delete('/:id/matches', requireAdmin, async (req, res) => {
  const tournamentId = req.params['id'] as string
  const phaseId = typeof req.query['phaseId'] === 'string' ? req.query['phaseId'] : undefined
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  await prisma.match.deleteMany({
    where: {
      tournamentId,
      ...(phaseId ? { phaseId } : {}),
      tournament: visibleTournamentWhere(organizationId),
    },
  })
  res.status(204).send()
})

tournamentsRouter.post('/:id/phases/:phaseId/complete', requireAdmin, async (req, res) => {
  const tournamentId = req.params['id'] as string
  const phaseId = req.params['phaseId'] as string
  const organizationId = contextOrganizationId(req as OrganizationRequest)
  const exists = await prisma.tournament.count({
    where: { id: tournamentId, ...visibleTournamentWhere(organizationId) },
  })
  if (!exists) {
    res.status(404).json({ message: 'Torneo non trovato' })
    return
  }
  try {
    const tournament = await prisma.$transaction(async (tx) => {
      await completeTournamentPhase(tx, tournamentId, phaseId)
      return tx.tournament.findUniqueOrThrow({
        where: { id: tournamentId },
        include: {
          ...tournamentOrganizerInclude,
          players: { orderBy: { seed: 'asc' } },
          phases: {
            orderBy: { position: 'asc' },
            include: tournamentPhaseInclude,
          },
        },
      })
    })
    res.json(serializeTournamentWithPlayers(tournament))
  } catch (error) {
    res.status(409).json({ message: (error as Error).message })
  }
})
