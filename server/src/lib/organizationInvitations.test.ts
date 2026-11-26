import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { PrismaClient } from '@prisma/client'
import {
  acceptOrganizationInvitation,
  countUnreadInvitations,
  declineOrganizationInvitation,
  listInvitationNotifications,
  markInvitationRead,
} from './organizationInvitations'

// @req-covered NOT-001 NOT-002 NOT-003 NOT-004 NOT-005 NFR-006
// @req-partial DATA-003 DATA-004 DATA-009

const invitation = { id: 'invitation-1', organizationId: 'club-a' }
const globalPlayer = {
  name: 'Mario Rossi',
  birthDate: new Date('1991-06-20T00:00:00.000Z'),
  photoUrl: null,
  club: 'TC Lucca',
  phone: '+39 333 123 4567',
  ranking: 12,
}

function invitationClient(existingPlayerId: string | null = null) {
  const calls: Array<{ operation: string; input: unknown }> = []
  const tx = {
    organizationMembership: {
      upsert: async (input: unknown) => calls.push({ operation: 'membership.upsert', input }),
    },
    player: {
      findFirst: async (input: unknown) => {
        calls.push({ operation: 'player.findFirst', input })
        return existingPlayerId ? { id: existingPlayerId } : null
      },
      create: async (input: unknown) => calls.push({ operation: 'player.create', input }),
      update: async (input: unknown) => calls.push({ operation: 'player.update', input }),
    },
    organizationInvitation: {
      update: async (input: unknown) => calls.push({ operation: 'invitation.update', input }),
      findMany: async (input: unknown) => {
        calls.push({ operation: 'invitation.findMany', input })
        return [{
          id: 'invitation-1', status: 'pending', readAt: null,
          createdAt: new Date('2026-11-01T10:00:00.000Z'),
          organization: { id: 'club-a', name: 'Club A' },
          invitedBy: { id: 'admin-1', name: null, email: 'admin@example.com' },
        }]
      },
      count: async (input: unknown) => {
        calls.push({ operation: 'invitation.count', input })
        return 2
      },
      updateMany: async (input: unknown) => {
        calls.push({ operation: 'invitation.updateMany', input })
        return { count: 1 }
      },
    },
  }
  const client = {
    $transaction: async (callback: (transaction: typeof tx) => Promise<void>) => callback(tx),
    organizationInvitation: tx.organizationInvitation,
  } as unknown as PrismaClient
  return { calls, client }
}

test('lists at most 50 invitation notifications for the current profile', async () => {
  const { calls, client } = invitationClient()

  const notifications = await listInvitationNotifications(client, 'profile-1')

  assert.deepEqual(notifications, [{
    id: 'invitation-1',
    type: 'organization_invitation',
    status: 'pending',
    read_at: null,
    created_at: '2026-11-01T10:00:00.000Z',
    organization: { id: 'club-a', name: 'Club A' },
    invited_by: { id: 'admin-1', name: 'admin@example.com' },
  }])
  assert.deepEqual(calls[0]?.input, {
    where: { inviteeProfileId: 'profile-1', status: { in: ['pending', 'accepted', 'declined'] } },
    include: {
      organization: { select: { id: true, name: true } },
      invitedBy: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
})

test('counts only pending unread invitations for the current profile', async () => {
  const { calls, client } = invitationClient()

  assert.equal(await countUnreadInvitations(client, 'profile-1'), 2)
  assert.deepEqual(calls[0]?.input, {
    where: { inviteeProfileId: 'profile-1', status: 'pending', readAt: null },
  })
})

test('marks an invitation as read only when it belongs to the current profile', async () => {
  const { calls, client } = invitationClient()

  assert.equal(await markInvitationRead(client, 'profile-1', 'invitation-1'), true)
  assert.deepEqual(calls[0]?.input, {
    where: { id: 'invitation-1', inviteeProfileId: 'profile-1' },
    data: { readAt: calls[0] && (calls[0].input as { data: { readAt: Date } }).data.readAt },
  })
  assert.ok((calls[0]?.input as { data: { readAt: Date } }).data.readAt instanceof Date)
})

test('accepting an invitation updates membership, club player and invitation in one transaction', async () => {
  const { calls, client } = invitationClient()

  await acceptOrganizationInvitation(client, 'profile-1', invitation, globalPlayer)

  assert.deepEqual(calls.map(call => call.operation), [
    'membership.upsert',
    'player.findFirst',
    'player.create',
    'invitation.update',
  ])
  assert.deepEqual(calls[0]?.input, {
    where: { organizationId_profileId: { organizationId: 'club-a', profileId: 'profile-1' } },
    create: { organizationId: 'club-a', profileId: 'profile-1', role: 'member' },
    update: {},
  })
  assert.match(JSON.stringify(calls[2]?.input), /"ranking":12/)
  assert.match(JSON.stringify(calls[3]?.input), /"status":"accepted"/)
})

test('accepting an invitation refreshes an existing club player instead of duplicating it', async () => {
  const { calls, client } = invitationClient('club-player-1')

  await acceptOrganizationInvitation(client, 'profile-1', invitation, globalPlayer)

  assert.equal(calls.some(call => call.operation === 'player.create'), false)
  assert.deepEqual(calls.find(call => call.operation === 'player.update')?.input, {
    where: { id: 'club-player-1' },
    data: {
      name: globalPlayer.name,
      birthDate: globalPlayer.birthDate,
      photoUrl: null,
      club: globalPlayer.club,
      phone: globalPlayer.phone,
    },
  })
})

test('declining an invitation records status, reading and response timestamps', async () => {
  const { calls, client } = invitationClient()

  await declineOrganizationInvitation(client, invitation.id)

  const input = calls[0]?.input as { data: Record<string, unknown> }
  assert.equal(input.data.status, 'declined')
  assert.ok(input.data.readAt instanceof Date)
  assert.ok(input.data.respondedAt instanceof Date)
})
