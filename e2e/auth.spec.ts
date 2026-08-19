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

  await expect(page).toHaveURL(/\/dashboard$/)
})

test('shows confirmation progress while the backend session is loading', async ({ page }) => {
  await page.route('**/api/auth/me', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2_000))
    await route.fulfill({
      json: { user: { id: 'user-3', email: 'slow@tla.local', name: 'Utente Fly', role: 'player' } },
    })
  })

  await page.goto('/#access_token=slow-mock-jwt&type=signup')

  await expect(page).toHaveURL(/\/auth\/confirm$/)
  await expect(page.getByRole('heading', { name: 'Conferma in corso' })).toBeVisible()
})

test('keeps the organization filter above the primary mobile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: { user: { id: 'user-4', email: 'mobile@tla.local', name: 'Utente Mobile', role: 'player' } },
    })
  })
  await page.route('**/api/organizations', async (route) => {
    await route.fulfill({ json: [] })
  })
  await page.route('**/api/tournaments**', async (route) => {
    await route.fulfill({ json: { values: [], page: 1, perPage: 12, total: 0 } })
  })

  await page.goto('/#access_token=mobile-mock-jwt&type=signup')
  await page.getByRole('button', { name: 'Continua in TLA' }).click()

  const organizationFilter = page.getByRole('button', { name: 'Filtra per organizzazione: Tutti i contenuti' })
  await expect(organizationFilter).toBeVisible()

  const navigation = page.getByRole('navigation', { name: 'Navigazione mobile principale' })
  await expect(navigation.getByRole('link', { name: 'Dashboard' })).toBeVisible()
  await expect(navigation.getByRole('link', { name: 'Tornei' })).toBeVisible()
  await expect(navigation.getByRole('link', { name: 'Giocatori' })).toBeVisible()
  await expect(navigation.getByRole('link', { name: 'Profilo' })).toBeVisible()
  await expect(navigation.getByRole('link', { name: 'Organizzazioni' })).toHaveCount(0)

  await organizationFilter.click()
  await expect(page.getByRole('menuitem', { name: 'Non sei iscritto a nessuna organizzazione' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Gestisci organizzazioni' })).toBeVisible()
})

test('allows guest access to the dashboard', async ({ page }) => {
  await page.route('**/api/organizations', async (route) => {
    await route.fulfill({ json: [] })
  })
  await page.getByRole('button', { name: 'Entra come ospite' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(page.getByRole('heading', { name: /^(Buongiorno|Buon pomeriggio|Buonasera),/ })).toBeVisible()
})

test('allows a registered account to start a global tournament without a club', async ({ page }) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: { user: { id: 'global-organizer', email: 'organizer@tla.local', name: 'Giulia Bianchi', role: 'player' } },
    })
  })
  await page.route('**/api/organizations', async (route) => {
    await route.fulfill({ json: [] })
  })
  await page.route('**/api/tournaments**', async (route) => {
    await route.fulfill({ json: { values: [], page: 0, perPage: 12, total: 0 } })
  })
  await page.route('**/api/organizers**', async (route) => {
    await route.fulfill({ json: [] })
  })

  await page.goto('/#access_token=global-organizer-token&type=signup')
  await page.getByRole('button', { name: 'Continua in TLA' }).click()

  await expect(page.getByRole('button', { name: 'Nuovo torneo' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Filtra per organizzazione: Tutti i contenuti' })).toBeVisible()
  await page.getByRole('link', { name: 'Tornei', exact: true }).first().click()
  await expect(page.getByRole('button', { name: 'Nuovo torneo' })).toBeVisible()
  await page.getByRole('button', { name: 'Nuovo torneo' }).click()
  await expect(page).toHaveURL(/\/tournaments\/new$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Nuovo torneo' })).toBeVisible()
  await expect(page.getByText('Crea un torneo globale: ne sarai l’organizzatore')).toBeVisible()
})
