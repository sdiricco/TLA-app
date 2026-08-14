import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear())
  await page.goto('/login')
})

test('shows the login form', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Accedi al tuo account' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByPlaceholder('Inserisci la password')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Accedi' })).toBeVisible()
})

test('opens account registration', async ({ page }) => {
  await page.getByRole('button', { name: 'Registrati' }).click()

  await expect(page).toHaveURL(/\/register$/)
  await expect(page.getByRole('heading', { name: 'Crea il tuo account' })).toBeVisible()
})

test('clears a previous pending registration before creating another account', async ({ page }) => {
  await page.route('**/api/auth/register', async (route) => {
    await route.fulfill({
      json: {
        requires_email_confirmation: true,
        email: 'pending@tla.local',
        message: 'Registrazione completata, ma serve confermare l’email prima del login.',
      },
    })
  })
  await page.getByRole('button', { name: 'Registrati' }).click()
  await page.getByLabel('Nome e cognome').fill('Nuovo Utente')
  await page.getByLabel('Email').fill('pending@tla.local')
  await page.getByPlaceholder('Crea una password').fill('Password123!')
  await page.getByPlaceholder('Ripeti la password').fill('Password123!')
  await page.getByRole('button', { name: 'Crea account' }).click()

  await expect(page.getByRole('heading', { name: 'Controlla la tua email' })).toBeVisible()
  await expect(page.getByText('pending@tla.local')).toBeVisible()

  await page.getByRole('button', { name: 'Vai al login' }).click()
  await page.getByRole('button', { name: 'Registrati' }).click()

  await expect(page.getByRole('heading', { name: 'Crea il tuo account' })).toBeVisible()
  await expect(page.getByText('pending@tla.local')).not.toBeVisible()
})

test('handles the email confirmation callback and opens the application', async ({ page }) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: { user: { id: 'user-2', email: 'player@tla.local', name: 'Mario Rossi', role: 'player' } },
    })
  })
  await page.route('**/api/organizations', async (route) => {
    await route.fulfill({ json: [] })
  })
  await page.route('**/api/tournaments**', async (route) => {
    await route.fulfill({ json: { values: [], page: 1, perPage: 12, total: 0 } })
  })
  await page.goto('/#access_token=mock-jwt-token-user-2&type=signup')

  await expect(page).toHaveURL(/\/auth\/confirm$/)
  await expect(page.getByRole('heading', { name: 'Email confermata' })).toBeVisible()
  await page.getByRole('button', { name: 'Continua in TLA' }).click()

  await expect(page).toHaveURL(/\/tournaments$/)
})

test('allows guest access to the tournament list', async ({ page }) => {
  await page.route('**/api/organizations', async (route) => {
    await route.fulfill({ json: [] })
  })
  await page.getByRole('button', { name: 'Entra come ospite' }).click()

  await expect(page).toHaveURL(/\/tournaments$/)
  await expect(page.getByRole('heading', { name: 'Tornei', exact: true })).toBeVisible()
})
