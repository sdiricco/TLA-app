import type { PrismaClient } from '@prisma/client'

type InvitationNotification = {
  id: string
  status: string
  readAt: Date | null
  createdAt: Date
  organization: { id: string; name: string }
  invitedBy: { id: string; name: string | null; email: string } | null
}

const invitationInclude = {
  organization: { select: { id: true, name: true } },
  invitedBy: { select: { id: true, name: true, email: true } },
} as const

export function serializeInvitationNotification(invitation: InvitationNotification) {
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

export async function listInvitationNotifications(
  client: Pick<PrismaClient, 'organizationInvitation'>,
  profileId: string,
) {
  const invitations = await client.organizationInvitation.findMany({
    where: { inviteeProfileId: profileId, status: { in: ['pending', 'accepted', 'declined'] } },
    include: invitationInclude,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return invitations.map(serializeInvitationNotification)
}

export async function countUnreadInvitations(
  client: Pick<PrismaClient, 'organizationInvitation'>,
  profileId: string,
): Promise<number> {
  return client.organizationInvitation.count({
    where: { inviteeProfileId: profileId, status: 'pending', readAt: null },
  })
}

export async function markInvitationRead(
  client: Pick<PrismaClient, 'organizationInvitation'>,
  profileId: string,
  invitationId: string,
): Promise<boolean> {
  const result = await client.organizationInvitation.updateMany({
    where: { id: invitationId, inviteeProfileId: profileId },
    data: { readAt: new Date() },
  })
  return result.count > 0
}

type InvitationForResponse = {
  id: string
  organizationId: string
}

type GlobalPlayerForInvitation = {
  name: string
  birthDate: Date | null
  photoUrl: string | null
  club: string | null
  phone: string | null
  ranking: number
}

export async function acceptOrganizationInvitation(
  client: Pick<PrismaClient, '$transaction'>,
  profileId: string,
  invitation: InvitationForResponse,
  globalPlayer: GlobalPlayerForInvitation,
): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.organizationMembership.upsert({
      where: {
        organizationId_profileId: {
          organizationId: invitation.organizationId,
          profileId,
        },
      },
      create: { organizationId: invitation.organizationId, profileId, role: 'member' },
      update: {},
    })

    const existingPlayer = await tx.player.findFirst({
      where: { organizationId: invitation.organizationId, userId: profileId },
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
          userId: profileId,
        },
      })
    }

    await tx.organizationInvitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted', readAt: new Date(), respondedAt: new Date() },
    })
  })
}

export async function declineOrganizationInvitation(
  client: Pick<PrismaClient, 'organizationInvitation'>,
  invitationId: string,
): Promise<void> {
  await client.organizationInvitation.update({
    where: { id: invitationId },
    data: { status: 'declined', readAt: new Date(), respondedAt: new Date() },
  })
}
