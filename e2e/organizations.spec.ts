import { expect, test } from '@playwright/test'

const lucca = {
  id: 'org-lucca',
  name: 'TC Lucca Mura',
  description: 'Il circolo sulle mura di Lucca.',
  city: 'Lucca',
  visibility: 'public',
  discoverable: true,
  member_count: 23,
  role: 'owner',
  join_code: 'LUC42',
}
const pisa = {
  id: 'org-pisa',
  name: 'Circolo Tennis Pisa',
  description: null,
  city: 'Pisa',
  visibility: 'private',
  discoverable: false,
  member_count: 18,
  role: 'member',
  join_code: 'PIS42',
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript((organizationId) => {
    localStorage.setItem('tla_organization_id', organizationId)
  }, lucca.id)
  // Anything not mocked below answers with an empty collection.
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ json: { values: [], page: 0, perPage: 100, total: 0 } })
  })
  const user = { id: 'owner-1', email: 'owner@tla.local', name: 'Giulia Neri', role: 'player', onboardingCompleted: true }
  await page.route('**/api/auth/login', async (route) => route.fulfill({ json: { user, token: 'owner-token' } }))
  await page.route('**/api/auth/me', async (route) => route.fulfill({ json: { user, impersonator: null } }))
  await page.route('**/api/requests', async (route) => route.fulfill({ json: [] }))
  await page.route('**/api/organizations', async (route) => route.fulfill({ json: [pisa, lucca] }))
  await page.route('**/api/notifications/unread-count', async (route) => route.fulfill({ json: { count: 0 } }))
  await page.route('**/api/players/me', async (route) => route.fulfill({ json: null }))
})

test('shows the active organization and switches to another one', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('owner@tla.local')
  await page.getByPlaceholder('Inserisci la password').fill('e2e-owner-pass')
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL(/dashboard/)
  await page.goto('/organizations')

  await expect(page.getByRole('heading', { level: 1, name: 'Organizzazioni' })).toBeVisible()
  const hero = page.getByRole('region', { name: lucca.name })
  await expect(hero.getByText('Organizzazione attiva')).toBeVisible()
  await expect(hero.getByText('23 membri')).toBeVisible()
  await expect(hero.getByRole('button', { name: `Copia codice invito di ${lucca.name}` })).toContainText(lucca.join_code)

  const list = page.getByRole('region', { name: 'Le tue organizzazioni' })
  // The active organization leads the list.
  await expect(list.getByRole('article').first()).toContainText(lucca.name)
  await expect(list.getByRole('button', { name: `Copia codice invito di ${pisa.name}` })).toHaveCount(0)

  await list.getByRole('button', { name: `Passa a ${pisa.name}` }).click()
  await expect(page.getByRole('region', { name: pisa.name }).getByText('Organizzazione attiva')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Modifica' })).toHaveCount(0)
})
