import { prisma } from '../db/prisma'
import { deleteSupabaseUser } from './supabaseAuth'

export class AccountDeletionError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

// Removes the Auth identity and the application data owned only by this
// account: personal tournaments, organizations where the user is the sole
// member, and the profile. Linked players are anonymised, not deleted, so
// past draws stay consistent. Shared by self-service and admin deletion.
export async function deleteUserAccount(profileId: string): Promise<void> {
  const ownedMemberships = await prisma.organizationMembership.findMany({
    where: { profileId, role: 'owner' },
    select: {
      organization: {
        select: {
          id: true,
          name: true,
          _count: { select: { memberships: true } },
          memberships: {
            where: { role: 'owner', profileId: { not: profileId } },
            select: { profileId: true },
            take: 1,
          },
        },
      },
    },
  })
  const blockedOrganizations = ownedMemberships
    .map(({ organization }) => organization)
    .filter((organization) => organization._count.memberships > 1 && organization.memberships.length === 0)

  if (blockedOrganizations.length > 0) {
    const names = blockedOrganizations.map(({ name }) => name).join(', ')
    throw new AccountDeletionError(`Prima di eliminare l’account assegna un altro proprietario a: ${names}`, 409)
  }

  const emptyOwnedOrganizationIds = ownedMemberships
    .map(({ organization }) => organization)
    .filter((organization) => organization._count.memberships === 1)
    .map(({ id }) => id)
  const [linkedPlayers, personalTournaments] = await Promise.all([
    prisma.player.findMany({ where: { userId: profileId }, select: { id: true } }),
    prisma.tournament.findMany({
      where: { organizerProfileId: profileId, organizationId: null },
      select: { id: true },
    }),
  ])

  await deleteSupabaseUser(profileId)

  try {
    await prisma.$transaction([
      prisma.tournament.deleteMany({ where: { id: { in: personalTournaments.map(({ id }) => id) } } }),
      prisma.organization.deleteMany({ where: { id: { in: emptyOwnedOrganizationIds } } }),
      prisma.player.updateMany({
        where: { id: { in: linkedPlayers.map(({ id }) => id) } },
        data: {
          userId: null,
          name: 'Giocatore eliminato',
          birthDate: null,
          photoUrl: null,
          club: null,
          phone: null,
        },
      }),
      prisma.profile.deleteMany({ where: { id: profileId } }),
    ])
  } catch (cleanupError) {
    // The Auth identity is already gone at this point. Keep the deletion
    // successful for the caller and surface cleanup failures to server logs.
    console.error('Account deleted but application cleanup failed', cleanupError)
  }
}
