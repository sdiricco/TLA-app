import { expect, test } from '@playwright/test'

// @req-partial ORG-007 ORG-010 DATA-004 UX-003

const organization = {
  id: 'club-context',
  name: 'TC Lucca',
  role: 'owner',
  join_code: 'LUCCA',
}

test('keeps organization content isolated and preserves the global context', async ({ page }) => {
  const playerScopes: string[] = []
  const invitationPlayerIds: string[] = []

  await page.addInitScript((organizationId) => {
    if (sessionStorage.getItem('organization-context-seeded')) return
    localStorage.clear()
    localStorage.setItem('tla_token', 'organization-context-token')
    localStorage.setItem('tla_organization_id', organizationId)
    sessionStorage.setItem('organization-context-seeded', 'true')
  }, organization.id)
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: 'club-owner',
          email: 'owner@tla.local',
          name: 'Mario Rossi',
          role: 'player',
          onboardingCompleted: true,
        },
      },
    })
  })
  await page.route('**/api/organizations', async (route) => {
    await route.fulfill({ json: [organization] })
  })
  await page.route('**/api/organizations/*/invitations/candidates**', async (route) => {
    await route.fulfill({ json: [{ player_id: 'global-player', profile_id: 'candidate-profile', name: 'Lorenzo Bianchi', club: 'TC Pisa', photo_url: null }] })
  })
  await page.route('**/api/organizations/*/invitations', async (route) => {
    const payload = route.request().postDataJSON() as { player_id: string }
    invitationPlayerIds.push(payload.player_id)
    await route.fulfill({ status: 201, json: { id: 'invite-1', organization_id: organization.id, organization_name: organization.name, player_name: 'Lorenzo Bianchi', status: 'pending', created_at: new Date().toISOString() } })
  })
  await page.route('**/api/notifications/unread-count', async (route) => {
    await route.fulfill({ json: { count: 0 } })
  })
  await page.route('**/api/players**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname.endsWith('/me')) {
      await route.fulfill({ json: null })
      return
    }
    playerScopes.push(url.searchParams.get('organizationId') ?? '')
    await route.fulfill({ json: { values: [], page: 0, perPage: 20, total: 0 } })
  })
  await page.route('**/api/tournaments**', async (route) => {
    await route.fulfill({ json: { values: [], page: 0, perPage: 100, total: 0 } })
  })

  await page.goto('/players')

  await expect(page.getByRole('button', { name: `Filtra per organizzazione: ${organization.name}` })).toBeVisible()
  await expect.poll(() => playerScopes[0]).toBe(organization.id)
  await expect(page.getByRole('heading', { name: `Ancora nessun giocatore in ${organization.name}` })).toBeVisible()

  await page.getByRole('button', { name: 'Invita giocatore' }).click()
  await expect(page.getByRole('dialog', { name: 'Invita un giocatore' })).toBeVisible()
  await page.getByRole('button', { name: 'Invita', exact: true }).click()
  await expect(page.getByText('Invito inviato a Lorenzo Bianchi.')).toBeVisible()
  expect(invitationPlayerIds).toEqual(['global-player'])
  await expect(page.getByRole('textbox', { name: 'Codice invito' })).toHaveValue(organization.join_code)
  await expect(page.getByRole('button', { name: 'Crea manualmente' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Chiudi' }).click()

  await page.getByRole('button', { name: `Filtra per organizzazione: ${organization.name}` }).click()
  await page.getByRole('menuitem', { name: 'Contenuti globali' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('button', { name: 'Filtra per organizzazione: Contenuti globali' })).toBeVisible()
  await expect.poll(() => playerScopes.at(-1)).toBe('global')
  expect(await page.evaluate(() => localStorage.getItem('tla_organization_id'))).toBeNull()
})
