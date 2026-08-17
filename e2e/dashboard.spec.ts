import { expect, test } from '@playwright/test'

const organization = {
  id: 'org-dashboard',
  name: 'TC Lucca',
  role: 'owner',
  join_code: 'TCLUCCA',
}

const tournaments = [
  {
    id: 'tournament-live',
    name: 'Open di Primavera',
    organization_id: organization.id,
    location: 'TC Lucca',
    status: 'ongoing',
    published: true,
    format: 'single_elimination',
    category: 'male',
    start_date: '2026-08-10',
    end_date: '2026-08-20',
    participants_count: 16,
    max_participants: 32,
  },
  {
    id: 'tournament-draft',
    name: 'Coppa Estate',
    organization_id: organization.id,
    location: 'TC Lucca',
    status: 'upcoming',
    published: false,
    format: 'round_robin',
    category: 'mixed',
    start_date: '2026-09-01',
    end_date: '2026-09-07',
    participants_count: 0,
    max_participants: 24,
  },
]

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear())
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: { user: { id: 'admin-dashboard', email: 'admin@tla.local', name: 'Simone Diricco', role: 'admin' } },
    })
  })
  await page.route('**/api/organizations', async (route) => {
    await route.fulfill({ json: [organization] })
  })
  await page.route('**/api/tournaments**', async (route) => {
    await route.fulfill({ json: { values: tournaments, page: 0, perPage: 100, total: tournaments.length } })
  })
  await page.route('**/api/players**', async (route) => {
    await route.fulfill({ json: { values: [], page: 0, perPage: 1, total: 24 } })
  })
  await page.route('**/api/players/dashboard-player/matches', async (route) => {
    await route.fulfill({
      json: {
        stats: { played: 8, wins: 6, losses: 2, win_rate: 75 },
        recent_form: ['W', 'W', 'L'],
        recent_matches: [],
      },
    })
  })
  await page.route('**/api/players/me', async (route) => {
    await route.fulfill({
      json: {
        id: 'dashboard-player',
        name: 'Simone Diricco',
        ranking: 3,
        club: 'TC Lucca',
        user_id: 'admin-dashboard',
        organization_id: null,
      },
    })
  })
  await page.route('**/api/requests', async (route) => {
    await route.fulfill({
      json: [{
        id: 'request-dashboard',
        organization_id: organization.id,
        title: 'Nuove luci per il campo 2',
        description: 'Valutare preventivo e tempi.',
        status: 'open',
        created_at: '2026-08-14T08:00:00.000Z',
        updated_at: '2026-08-14T08:00:00.000Z',
      }],
    })
  })
})

test('gives an administrator a clear operational overview', async ({ page }) => {
  await page.goto('/#access_token=dashboard-admin-token&type=signup')
  await page.getByRole('button', { name: 'Continua in TLA' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { level: 1, name: /Simone/ })).toBeVisible()
  await expect(page.getByText('TC Lucca', { exact: true }).first()).toBeVisible()

  const indicators = page.getByRole('region', { name: 'Indicatori principali' })
  await expect(indicators.getByText('In corso', { exact: true })).toBeVisible()
  await expect(indicators.getByText('Giocatori', { exact: true })).toBeVisible()
  await expect(indicators.getByText('24', { exact: true })).toBeVisible()

  await expect(page.getByRole('heading', { name: 'Priorità' })).toBeVisible()
  await expect(page.getByText('1 torneo in corso')).toBeVisible()
  await expect(page.getByText('1 torneo da pubblicare')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tornei da seguire' })).toBeVisible()
  await expect(page.getByText('Open di Primavera')).toBeVisible()
  await expect(page.getByText('Nuove luci per il campo 2')).toBeVisible()
  await expect(page.getByRole('link', { name: /Nuovo torneo/ })).toBeVisible()
  await expect(page.getByText('La tua stagione')).toBeVisible()
  await expect(page.getByText('75%', { exact: true })).toBeVisible()
})

test('keeps the dashboard useful and compact on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/#access_token=dashboard-mobile-token&type=signup')
  await page.getByRole('button', { name: 'Continua in TLA' }).click()

  await expect(page.getByRole('heading', { level: 1, name: /Simone/ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navigazione mobile principale' }).getByRole('link', { name: 'Dashboard' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Priorità' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tornei da seguire' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Accessi rapidi' })).toBeVisible()
})

test('recovers the greeting from the linked player for an older unnamed profile', async ({ page }) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: { user: { id: 'admin-dashboard', email: 'admin@tla.local', role: 'admin' } },
    })
  })

  await page.goto('/#access_token=dashboard-legacy-token&type=signup')
  await page.getByRole('button', { name: 'Continua in TLA' }).click()

  await expect(page.getByRole('heading', { level: 1, name: /Simone/ })).toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).not.toContainText('admin')
})
