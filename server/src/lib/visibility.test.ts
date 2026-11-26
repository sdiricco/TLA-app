import assert from 'node:assert/strict'
import { test } from 'node:test'

// @req-partial ORG-007 TRN-006 NFR-002
import { explicitOrganizationScope } from './visibility'

test('keeps the aggregate context open to every accessible content source', () => {
  assert.equal(explicitOrganizationScope('mine', ['club-1']), null)
})

test('limits a selected organization to that organization only', () => {
  assert.deepEqual(
    explicitOrganizationScope('club-1', ['club-1', 'club-2']),
    { organizationId: 'club-1' },
  )
})

test('limits the global context to records without an organization', () => {
  assert.deepEqual(explicitOrganizationScope('global', ['club-1']), { organizationId: null })
})

test('returns no rows for an organization outside the user memberships', () => {
  assert.deepEqual(explicitOrganizationScope('other-club', ['club-1']), { id: { in: [] } })
})
