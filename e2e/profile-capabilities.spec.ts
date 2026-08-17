import { expect, test } from '@playwright/test'

test('lets an organizer add a player profile without losing club permissions', async ({ page }) => {
  let playerCreated = false
  let onboardingPayload: unknown

  await page.addInitScript(() => {
    localStorage.clear()
    localStorage.setItem('tla_token', 'profile-capabilities-token')
  })
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: 'organizer-player',
          email: 'simone@tla.local',
          name: 'Simone Diricco',
          role: 'player',
          onboardingCompleted: true,
          onboardingIntent: 'manager',
        },
      },
    })
  })
  await page.route('**/api/organizations', async (route) => {
    await route.fulfill({
      json: [{ id: 'profile-club', name: 'TC Lucca', role: 'owner', join_code: 'LUCCA' }],
    })
  })
  await page.route('**/api/auth/onboarding', async (route) => {
    onboardingPayload = route.request().postDataJSON()
    playerCreated = true
    await route.fulfill({
      json: {
        user: {
          id: 'organizer-player',
          email: 'simone@tla.local',
          name: 'Simone Diricco',
          role: 'player',
          onboardingCompleted: true,
          onboardingIntent: 'manager',
        },
      },
    })
  })
  await page.route('**/api/players/profile-player/matches', async (route) => {
    await route.fulfill({
      json: {
        stats: { played: 0, wins: 0, losses: 0, win_rate: 0 },
        recent_form: [],
        recent_matches: [],
      },
    })
  })
  await page.route('**/api/players/me', async (route) => {
    await route.fulfill({
      json: playerCreated
        ? {
            id: 'profile-player',
            name: 'Simone Diricco',
            ranking: 0,
            birth_date: '1991-06-20',
            club: 'TC Lucca',
            phone: '+39 333 123 4567',
            user_id: 'organizer-player',
            organization_id: null,
          }
        : null,
    })
  })

  await page.goto('/profile')

  await expect(page.getByText('Organizzatore', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Crea profilo giocatore' }).click()
  await page.getByLabel('Data di nascita Facoltativa').fill('20/06/1991')
  await page.getByLabel('Telefono Facoltativo').fill('+39 333 123 4567')
  await page.getByLabel('Club di appartenenza Facoltativo').fill('TC Lucca')
  await page.getByRole('button', { name: 'Crea profilo', exact: true }).click()

  await expect(page.getByText('Giocatore · Organizzatore')).toBeVisible()
  await expect(page.getByText('GIOCATORE COLLEGATO')).toBeVisible()
  expect(onboardingPayload).toEqual({
    intent: 'player',
    player: {
      name: 'Simone Diricco',
      birth_date: '1991-06-20',
      club: 'TC Lucca',
      phone: '+39 333 123 4567',
    },
  })
})
