import { expect, test } from '@playwright/test'

test('shows the linked account email on the player profile', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.clear()
    localStorage.setItem('tla_token', 'player-profile-token')
  })
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: 'viewer-profile',
          email: 'viewer@tla.local',
          name: 'Utente Verifica',
          role: 'admin',
          onboardingCompleted: true,
        },
      },
    })
  })
  await page.route('**/api/organizations', async (route) => {
    await route.fulfill({ json: [] })
  })
  await page.route('**/api/players/player-to-check/matches', async (route) => {
    await route.fulfill({
      json: {
        stats: { played: 0, wins: 0, losses: 0, win_rate: 0 },
        recent_form: [],
        recent_matches: [],
      },
    })
  })
  await page.route('**/api/players/player-to-check', async (route) => {
    await route.fulfill({
      json: {
        id: 'player-to-check',
        name: 'Mario Rossi',
        email: 'mario.rossi@example.com',
        ranking: 0,
        user_id: 'mario-profile',
        organization_id: null,
      },
    })
  })

  await page.goto('/players/player-to-check')

  await expect(page.getByRole('heading', { name: 'Mario Rossi', level: 2 })).toBeVisible()
  await expect(page.getByText('mario.rossi@example.com')).toBeVisible()
  await expect(page.getByText('temporaneo')).toBeVisible()
})
