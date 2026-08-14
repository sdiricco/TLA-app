import { expect, test } from '@playwright/test'

test('allows a signed-in user to enroll from the tournament detail page', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  let enrolled = false
  let enrollmentRequestReceived = false
  let tournamentStatus: 'upcoming' | 'ongoing' = 'upcoming'
  const today = new Date()
  const registrationStart = new Date(today)
  registrationStart.setDate(today.getDate() - 1)
  const registrationEnd = new Date(today)
  registrationEnd.setDate(today.getDate() + 1)

  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: { user: { id: 'player-user', email: 'player@tla.local', name: 'Mario Rossi', role: 'player' } },
    })
  })
  await page.route('**/api/organizations', async (route) => {
    await route.fulfill({ json: [] })
  })
  await page.route('**/api/tournaments/test-tournament/enrollment', async (route) => {
    await route.fulfill({ json: { enrolled, player_id: enrolled ? 'player-1' : null } })
  })
  await page.route('**/api/tournaments/test-tournament/enroll', async (route) => {
    enrollmentRequestReceived = true
    enrolled = true
    await route.fulfill({ json: { enrolled: true, player_id: 'player-1' } })
  })
  await page.route('**/api/tournaments/test-tournament/matches**', async (route) => {
    await route.fulfill({
      json: {
        tournament: {
          id: 'test-tournament',
          name: 'Torneo Open',
          format: 'single_elimination',
          category: 'maschile',
          status: tournamentStatus,
        },
        draw: { draw_size: 0, participants_count: enrolled ? 1 : 0, rounds_count: 0 },
        rounds: [],
        matches: [],
      },
    })
  })
  await page.route('**/api/players**', async (route) => {
    await route.fulfill({
      json: {
        values: enrolled
          ? [{ id: 'player-1', name: 'Mario Rossi', ranking: 0, user_id: 'player-user', organization_id: null }]
          : [],
        page: 0,
        perPage: 100,
        total: enrolled ? 1 : 0,
      },
    })
  })
  await page.route('**/api/tournaments/test-tournament', async (route) => {
    await route.fulfill({
      json: {
        id: 'test-tournament',
        name: 'Torneo Open',
        location: 'TC Lucca',
        registration_start_date: registrationStart.toISOString(),
        registration_end_date: registrationEnd.toISOString(),
        start_date: registrationEnd.toISOString(),
        format: 'single_elimination',
        category: 'maschile',
        status: tournamentStatus,
        published: true,
        participant_limit: 32,
        playerIds: enrolled ? ['player-1'] : [],
      },
    })
  })

  await page.goto('/#access_token=enrollment-test-token&type=signup')
  await page.getByRole('button', { name: 'Continua in TLA' }).click()
  await page.goto('/tournaments/test-tournament/draw')

  await expect(page).toHaveURL(/\/tournaments\/test-tournament\/draw$/)
  await expect(page.getByRole('heading', { name: '0 giocatori iscritti' })).toBeVisible()
  const enrollButton = page.getByRole('button', { name: 'Iscriviti', exact: true })
  await expect(enrollButton).toBeVisible()
  await expect(enrollButton.locator('xpath=..')).toHaveCSS('position', 'fixed')
  await enrollButton.click()

  await expect.poll(() => enrollmentRequestReceived).toBe(true)
  await expect(page.getByRole('button', { name: 'Ritira iscrizione' })).toBeVisible()
  await expect(page.getByRole('heading', { name: '1 giocatore iscritto' })).toBeVisible()
  await expect(page.getByText('1 / 32')).toBeVisible()
  await page.getByRole('button', { name: 'Vedi giocatori iscritti' }).click()
  await expect(page).toHaveURL(/\/tournaments\/test-tournament\/players$/)
  await expect(page.getByRole('button', { name: 'Torna al torneo' })).toBeVisible()
  await expect(page.getByText('Sei iscritto')).toHaveCount(0)
  await expect(page.getByRole('heading', { name: 'Mario Rossi' })).toBeVisible()

  tournamentStatus = 'ongoing'
  await page.goto('/tournaments/test-tournament/draw')
  await expect(page).toHaveURL(/\/tournaments\/test-tournament\/draw$/)
})
