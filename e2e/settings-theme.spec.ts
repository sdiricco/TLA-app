import { expect, test } from '@playwright/test'

test('persists light and dark preferences and follows the system theme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.addInitScript(() => {
    if (sessionStorage.getItem('theme-test-initialized')) return
    localStorage.clear()
    localStorage.setItem('tla_token', 'theme-preferences-token')
    sessionStorage.setItem('theme-test-initialized', 'true')
  })
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: 'theme-user',
          email: 'theme@tla.local',
          name: 'Tema Utente',
          role: 'player',
          onboardingCompleted: true,
          onboardingIntent: 'explore',
        },
      },
    })
  })
  await page.route('**/api/organizations', async (route) => {
    await route.fulfill({ json: [] })
  })

  await page.goto('/settings')

  await expect(page.locator('html')).toHaveClass(/app-dark/)
  await expect(page.getByText('Preferenza salvata: Sistema')).toBeVisible()
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--color-surface-ground').trim())).toBe('#151719')
  await expect.poll(() => page.locator('.app-content').evaluate((element) => getComputedStyle(element).backgroundImage)).toBe('none')

  await page.getByRole('button', { name: 'Chiaro' }).click()
  await expect(page.locator('html')).not.toHaveClass(/app-dark/)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tla_color_scheme'))).toBe('light')

  await page.reload()
  await expect(page.locator('html')).not.toHaveClass(/app-dark/)

  await page.getByRole('button', { name: 'Sistema' }).click()
  await expect(page.locator('html')).toHaveClass(/app-dark/)
  await page.emulateMedia({ colorScheme: 'light' })
  await expect(page.locator('html')).not.toHaveClass(/app-dark/)

  await page.getByRole('button', { name: 'Scuro' }).click()
  await expect(page.locator('html')).toHaveClass(/app-dark/)
  await expect.poll(() => page.evaluate(() => localStorage.getItem('tla_color_scheme'))).toBe('dark')
})
