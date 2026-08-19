import { expect, test } from '@playwright/test'

const organizer = { id: 'organizer-1', name: 'Giulia Bianchi', tournaments_count: 1 }
const tournament = {
  id: 'organized-tournament',
  name: 'Open della Versilia',
  location: 'TC Lucca',
  status: 'upcoming',
  published: true,
  format: 'single_elimination',
  category: 'maschile',
  start_date: '2026-09-10',
  organizer_id: organizer.id,
  organizer: { id: organizer.id, name: organizer.name },
  can_manage: true,
  tournament_players: [],
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear())
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: { user: { id: organizer.id, email: 'giulia@tla.local', name: organizer.name, role: 'player' } },
    })
  })
  await page.route('**/api/organizations', async (route) => {
    await route.fulfill({ json: [{ id: 'org-1', name: 'TC Lucca', role: 'member', join_code: 'TCLUCCA' }] })
  })
  await page.route('**/api/organizers**', async (route) => {
    await route.fulfill({ json: [organizer, { id: 'organizer-2', name: 'Marco Conti', tournaments_count: 2 }] })
  })
  await page.route('**/api/organizers/organizer-1**', async (route) => {
    await route.fulfill({
      json: {
        ...organizer,
        player_id: null,
        photo_url: null,
        tournaments: [tournament],
      },
    })
  })
  await page.route('**/api/tournaments**', async (route) => {
    const pathname = new URL(route.request().url()).pathname
    if (pathname.endsWith('/enrollment')) {
      await route.fulfill({ json: { enrolled: false, player_id: null } })
      return
    }
    if (pathname.endsWith(`/${tournament.id}`)) {
      await route.fulfill({ json: tournament })
      return
    }
    await route.fulfill({ json: { values: [tournament], page: 0, perPage: 12, total: 1 } })
  })
})

test('the assigned organizer can administer the tournament without a global admin role', async ({ page }) => {
  await page.goto('/#access_token=organizer-token&type=signup')
  await page.getByRole('button', { name: 'Continua in TLA' }).click()
  await page.getByRole('link', { name: 'Tornei', exact: true }).click()
  await page.getByRole('button', { name: `Apri il torneo ${tournament.name}` }).click()

  await expect(page.getByText('Organizzatore', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: `Apri la scheda dell'organizzatore ${organizer.name}` })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Cambia stato' })).toBeVisible()
  await page.getByRole('button', { name: 'Altre azioni del torneo' }).click()
  await expect(page.getByText('Modifica torneo', { exact: true })).toBeVisible()
})

test('filters by organizer and opens the organizer tournament profile', async ({ page }) => {
  let organizerFilter = ''
  await page.route('**/api/tournaments**', async (route) => {
    organizerFilter = new URL(route.request().url()).searchParams.get('organizerId') ?? ''
    await route.fulfill({ json: { values: [tournament], page: 0, perPage: 12, total: 1 } })
  })

  await page.goto('/#access_token=organizer-token&type=signup')
  await page.getByRole('button', { name: 'Continua in TLA' }).click()
  await page.getByRole('link', { name: 'Tornei', exact: true }).click()

  await expect(page.getByRole('link', { name: `Apri la scheda di ${organizer.name}` })).toBeVisible()
  await page.getByRole('button', { name: 'Apri filtri tornei' }).click()
  await page.locator('#tournament-organizer-filter').click()
  await page.getByRole('option', { name: /Giulia Bianchi/ }).click()
  await page.getByRole('button', { name: 'Mostra risultati' }).click()
  await expect.poll(() => organizerFilter).toBe(organizer.id)

  await page.getByRole('link', { name: `Apri la scheda di ${organizer.name}` }).click()
  await expect(page).toHaveURL(/\/organizers\/organizer-1$/)
  await expect(page.getByRole('heading', { level: 1, name: organizer.name })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tornei organizzati' })).toBeVisible()
  await expect(page.getByText(tournament.name)).toBeVisible()
})
