import assert from 'node:assert/strict'
import { test } from 'node:test'

import type { Response } from 'express'
import { requirePlatformAdmin } from '../routes/admin'
import { requireAuth, resolveImpersonation, type AuthenticatedRequest } from './requireAuth'

type Profile = { id: string; email: string; name: string | null; role: string }

const profiles: Record<string, Profile> = {
  'admin-1': { id: 'admin-1', email: 'admin@tla.test', name: 'Admin', role: 'admin' },
  'admin-2': { id: 'admin-2', email: 'admin2@tla.test', name: 'Altro admin', role: 'admin' },
  'player-1': { id: 'player-1', email: 'player@tla.test', name: 'Giocatore', role: 'player' },
  'player-2': { id: 'player-2', email: 'player2@tla.test', name: 'Altro giocatore', role: 'player' },
}

const lookup = {
  findUnique: async ({ where }: { where: { id: string } }) => profiles[where.id] ?? null,
}

function fakeResponse() {
  const state: { status?: number; body?: unknown } = {}
  const res = {
    status(code: number) {
      state.status = code
      return this
    },
    json(body: unknown) {
      state.body = body
      return this
    },
  } as unknown as Response
  return { res, state }
}

test('a platform admin can act as a player', async () => {
  const result = await resolveImpersonation('admin-1', 'player-1', lookup)

  assert.equal(result.ok, true)
  if (!result.ok) return
  assert.equal(result.target.id, 'player-1')
  assert.equal(result.target.email, 'player@tla.test')
  assert.equal(result.impersonator.id, 'admin-1')
})

test('a player cannot act as another user', async () => {
  const result = await resolveImpersonation('player-1', 'player-2', lookup)

  assert.equal(result.ok, false)
})

test('an admin cannot act as another admin or as themself', async () => {
  assert.equal((await resolveImpersonation('admin-1', 'admin-2', lookup)).ok, false)
  assert.equal((await resolveImpersonation('admin-1', 'admin-1', lookup)).ok, false)
})

test('impersonating a missing user is refused', async () => {
  assert.equal((await resolveImpersonation('admin-1', 'missing', lookup)).ok, false)
})

test('a guest token with the impersonation header is rejected', async () => {
  const { res, state } = fakeResponse()
  let nextCalled = false
  const req = {
    header: (name: string) => ({
      authorization: 'Bearer tla_guest_token',
      'x-impersonate-user-id': 'player-1',
    } as Record<string, string>)[name.toLowerCase()],
  } as unknown as AuthenticatedRequest

  await requireAuth(req, res, () => { nextCalled = true })

  assert.equal(nextCalled, false)
  assert.equal(state.status, 403)
})

test('admin tools refuse to run while impersonating', async () => {
  const { res, state } = fakeResponse()
  let nextCalled = false
  const req = {
    authUser: { id: 'player-1', email: 'player@tla.test' },
    impersonator: { id: 'admin-1', email: 'admin@tla.test', name: 'Admin' },
  } as AuthenticatedRequest

  await requirePlatformAdmin(req, res, () => { nextCalled = true })

  assert.equal(nextCalled, false)
  assert.equal(state.status, 403)
})
