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

test('allows guest access to the tournament list', async ({ page }) => {
  await page.route('**/api/organizations', async (route) => {
    await route.fulfill({ json: [] })
  })
  await page.getByRole('button', { name: 'Entra come ospite' }).click()

  await expect(page).toHaveURL(/\/tournaments$/)
  await expect(page.getByRole('heading', { name: 'Tornei', exact: true })).toBeVisible()
})
