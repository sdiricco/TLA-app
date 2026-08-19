import type { NextFunction, Response } from 'express'
import { prisma } from '../db/prisma'
import type { OrganizationRequest } from './requireOrganization'

type TournamentPermissionRecord = {
  organizationId: string | null
  organizerProfileId: string | null
}

/**
 * Global tournaments belong to their creator, so every registered account can
 * start one. Tournaments created inside a club remain restricted to that
 * club's owners and administrators (plus platform administrators).
 */
export async function canCreateTournamentInContext(req: OrganizationRequest): Promise<boolean> {
  const userId = req.authUser?.id
  if (!userId || userId === 'guest') return false
  if (!req.organization) return true
  if (['owner', 'admin'].includes(req.organization.role)) return true

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return profile?.role === 'admin'
}

export async function requireTournamentCreator(
  req: OrganizationRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!(await canCreateTournamentInContext(req))) {
      res.status(403).json({
        message: req.organization
          ? 'Solo proprietari e amministratori possono creare tornei per questo club'
          : 'Accedi con un account per creare un torneo',
      })
      return
    }
    next()
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Impossibile verificare i permessi di creazione',
    })
  }
}

/**
 * Tournament administration is a scoped capability. The assigned organizer,
 * platform administrators and administrators of the owning organization can
 * manage the competition; being an administrator elsewhere is not enough.
 */
export async function canManageTournamentRecord(
  req: OrganizationRequest,
  tournament: TournamentPermissionRecord,
): Promise<boolean> {
  const userId = req.authUser?.id
  if (!userId || userId === 'guest') return false
  if (tournament.organizerProfileId === userId) return true

  if (
    tournament.organizationId
    && req.organization?.id === tournament.organizationId
    && ['owner', 'admin'].includes(req.organization.role)
  ) {
    return true
  }

  const profile = await prisma.profile.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return profile?.role === 'admin'
}

export async function requireTournamentAdmin(
  req: OrganizationRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const tournamentId = req.params['id']
    if (!tournamentId || Array.isArray(tournamentId)) {
      res.status(400).json({ message: 'Torneo non specificato' })
      return
    }

    const tournament = await prisma.tournament.findUnique({
      where: { id: tournamentId },
      select: { organizationId: true, organizerProfileId: true },
    })
    if (!tournament) {
      res.status(404).json({ message: 'Torneo non trovato' })
      return
    }
    if (!(await canManageTournamentRecord(req, tournament))) {
      res.status(403).json({ message: 'Non puoi amministrare questo torneo' })
      return
    }
    next()
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Impossibile verificare i permessi del torneo',
    })
  }
}

export async function requireMatchTournamentAdmin(
  req: OrganizationRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const matchId = req.params['id']
    if (!matchId || Array.isArray(matchId)) {
      res.status(400).json({ message: 'Incontro non specificato' })
      return
    }

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      select: { tournamentId: true },
    })
    if (!match) {
      res.status(404).json({ message: 'Incontro non trovato' })
      return
    }
    const tournament = await prisma.tournament.findUnique({
      where: { id: match.tournamentId },
      select: { organizationId: true, organizerProfileId: true },
    })
    if (!tournament) {
      res.status(404).json({ message: 'Torneo non trovato' })
      return
    }
    if (!(await canManageTournamentRecord(req, tournament))) {
      res.status(403).json({ message: 'Non puoi amministrare questo torneo' })
      return
    }
    next()
  } catch (error) {
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Impossibile verificare i permessi del torneo',
    })
  }
}
