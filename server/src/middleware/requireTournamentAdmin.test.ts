import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { OrganizationRequest } from './requireOrganization'
import { canCreateTournamentInContext, canManageTournamentRecord } from './requireTournamentAdmin'

function requestFor(userId: string, organization?: OrganizationRequest['organization']): OrganizationRequest {
  return {
    authUser: { id: userId, email: `${userId}@tla.test`, user_metadata: {} },
    organization,
  } as OrganizationRequest
}

test('the assigned organizer can manage only their tournament without a global role', async () => {
  const allowed = await canManageTournamentRecord(requestFor('organizer-1'), {
    organizationId: null,
    organizerProfileId: 'organizer-1',
  })

  assert.equal(allowed, true)
})

test('an organization administrator can manage a tournament owned by the selected organization', async () => {
  const allowed = await canManageTournamentRecord(
    requestFor('club-admin', { id: 'club-1', role: 'admin' }),
    { organizationId: 'club-1', organizerProfileId: 'another-user' },
  )

  assert.equal(allowed, true)
})

test('a guest cannot manage a tournament', async () => {
  const allowed = await canManageTournamentRecord(requestFor('guest'), {
    organizationId: null,
    organizerProfileId: 'organizer-1',
  })

  assert.equal(allowed, false)
})

test('a registered account can create a global tournament', async () => {
  assert.equal(await canCreateTournamentInContext(requestFor('player-1')), true)
})

test('an organization owner can create a tournament for the selected club', async () => {
  const allowed = await canCreateTournamentInContext(
    requestFor('club-owner', { id: 'club-1', role: 'owner' }),
  )

  assert.equal(allowed, true)
})

test('a guest cannot create a global tournament', async () => {
  assert.equal(await canCreateTournamentInContext(requestFor('guest')), false)
})
