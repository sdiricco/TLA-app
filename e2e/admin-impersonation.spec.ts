import { expect, test } from '@playwright/test'

const admin = {
  id: 'admin-1',
  email: 'admin@tla.local',
  name: 'Admin Piattaforma',
  role: 'admin',
  onboardingCompleted: true,
  onboardingIntent: 'explore',
}
const player = {
  id: 'player-1',
  email: 'giocatore@tla.local',
  name: 'Giocatore Test',
  role: 'player',
  onboardingCompleted: true,
  onboardingIntent: 'player',
}
const adminUsers = [
  { ...admin, onboarding_completed: true, created_at: '2026-11-01T10:00:00Z', last_sign_in_at: '2026-11-26T08:00:00Z', email_confirmed: true, player: null },
  { ...player, onboarding_completed: true, created_at: '2026-11-02T10:00:00Z', last_sign_in_at: null, email_confirmed: true, player: null },
]

test('a platform admin lands on the admin area, logs in as a user and goes back', async ({ page }) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('admin-test-initialized')) return
    localStorage.clear()
    sessionStorage.setItem('admin-test-initialized', 'true')
  })

  // Anything not mocked below answers with an empty collection, so the app
  // never reaches a real backend with the fake token.
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ json: { values: [], page: 0, perPage: 100, total: 0 } })
  })
  await page.route('**/api/organizations', async (route) => route.fulfill({ json: [] }))
  await page.route('**/api/notifications/unread-count', async (route) => route.fulfill({ json: { count: 0 } }))
  await page.route('**/api/players/me', async (route) => route.fulfill({ json: null }))
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({ json: { user: admin, token: 'admin-session-token' } })
  })
  await page.route('**/api/auth/me', async (route) => {
    const impersonated = route.request().headers()['x-impersonate-user-id']
    await route.fulfill({
      json: impersonated === player.id
        ? { user: player, impersonator: { id: admin.id, email: admin.email, name: admin.name } }
        : { user: admin, impersonator: null },
    })
  })
  await page.route('**/api/admin/users', async (route) => route.fulfill({ json: adminUsers }))
  await page.route('**/api/admin/impersonate/*', async (route) => {
    expect(route.request().method()).toBe('POST')
    await route.fulfill({ json: adminUsers[1] })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill(admin.email)
  await page.getByPlaceholder('Inserisci la password').fill('e2e-admin-pass')
  await page.getByRole('button', { name: 'Accedi' }).click()

  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByText('Giocatore Test')).toBeVisible()
  // The backoffice stands outside the app shell: no app navigation, no
  // tournament configuration.
  await expect(page.getByRole('link', { name: 'Tornei' })).toHaveCount(0)
  await expect(page.getByText('Configurazione tornei')).toHaveCount(0)
  // Admins cannot be impersonated, so only the player row offers the action.
  await expect(page.getByRole('button', { name: /^Entra come/ })).toHaveCount(1)

  await page.getByRole('button', { name: 'Entra come Giocatore Test' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('status').filter({ hasText: 'Stai usando TLA come Giocatore Test' })).toBeVisible()
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('tla_impersonate_user_id'))).toBe(player.id)

  await page.getByRole('button', { name: 'Torna al tuo account' }).click()
  await expect(page).toHaveURL(/\/admin$/)
  await expect(page.getByText('Stai usando TLA come')).toHaveCount(0)
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('tla_impersonate_user_id'))).toBeNull()

  // The admin can also enter the app with their own account.
  await page.getByRole('button', { name: 'Entra nell\'app con il tuo account' }).click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByText('Stai usando TLA come')).toHaveCount(0)
})
