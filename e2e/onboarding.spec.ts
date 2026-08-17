import { expect, test, type Page } from '@playwright/test'

interface OnboardingPayload {
  intent: 'player' | 'explore'
  player?: {
    name: string
    birth_date?: string | null
    club?: string | null
    phone?: string | null
  }
}

async function mockIncompleteAccount(page: Page): Promise<OnboardingPayload[]> {
  const payloads: OnboardingPayload[] = []
  let onboardingCompleted = false
  let onboardingIntent: 'player' | 'explore' | undefined

  await page.addInitScript(() => localStorage.clear())
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      json: {
        user: {
          id: 'new-account',
          email: 'nuovo@tla.local',
          name: 'Mario Rossi',
          role: 'player',
          onboardingCompleted,
          onboardingIntent,
        },
      },
    })
  })
  await page.route('**/api/auth/onboarding', async (route) => {
    const payload = route.request().postDataJSON() as OnboardingPayload
    payloads.push(payload)
    onboardingCompleted = true
    onboardingIntent = payload.intent
    await route.fulfill({
      json: {
        user: {
          id: 'new-account',
          email: 'nuovo@tla.local',
          name: 'Mario Rossi',
          role: 'player',
          onboardingCompleted,
          onboardingIntent,
        },
      },
    })
  })
  await page.route('**/api/organizations', async (route) => {
    await route.fulfill({ json: [] })
  })
  await page.route('**/api/tournaments**', async (route) => {
    await route.fulfill({ json: { values: [], page: 0, perPage: 100, total: 0 } })
  })
  await page.route('**/api/players**', async (route) => {
    await route.fulfill({ json: { values: [], page: 0, perPage: 1, total: 0 } })
  })
  await page.route('**/api/players/onboarding-player/matches', async (route) => {
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
      json: onboardingIntent === 'player'
        ? { id: 'onboarding-player', name: 'Mario Rossi', ranking: 0, club: 'TC Lucca', user_id: 'new-account' }
        : null,
    })
  })

  return payloads
}

async function openOnboarding(page: Page): Promise<void> {
  await page.goto('/#access_token=new-account-token&type=signup')
  await page.getByRole('button', { name: 'Continua in TLA' }).click()
  await expect(page).toHaveURL(/\/onboarding$/)
}

test('creates a player profile from the guided onboarding', async ({ page }) => {
  const payloads = await mockIncompleteAccount(page)
  await openOnboarding(page)

  await expect(page.getByRole('heading', { name: 'Da cosa vuoi iniziare?' })).toBeVisible()
  await expect(page.getByText('con lo stesso account puoi giocare e gestire uno o più club')).toBeVisible()
  await page.getByRole('button', { name: 'Crea profilo giocatore' }).click()
  await expect(page.getByRole('heading', { name: 'Crea il profilo giocatore' })).toBeVisible()
  await expect(page.getByLabel('Nome e cognome')).toHaveValue('Mario Rossi')

  await page.getByLabel('Data di nascita Facoltativa').fill('20/06/1991')
  await page.getByLabel('Telefono Facoltativo').fill('+39 333 123 4567')
  await page.getByLabel('Club di appartenenza Facoltativo').fill('TC Lucca')
  await page.getByRole('button', { name: 'Crea profilo e continua' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  expect(payloads).toEqual([{
    intent: 'player',
    player: {
      name: 'Mario Rossi',
      birth_date: '1991-06-20',
      club: 'TC Lucca',
      phone: '+39 333 123 4567',
    },
  }])
})

test('keeps organization setup outside the main application navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await mockIncompleteAccount(page)
  await openOnboarding(page)

  await page.getByRole('button', { name: 'Crea organizzazione' }).click()

  await expect(page).toHaveURL(/\/onboarding\/organization$/)
  await expect(page.getByRole('heading', { name: 'Crea un’organizzazione' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Navigazione mobile principale' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Torna alla scelta' })).toBeVisible()
})

test('allows entering as an authenticated explorer without creating a player', async ({ page }) => {
  const payloads = await mockIncompleteAccount(page)
  await openOnboarding(page)

  await page.getByRole('button', { name: 'Esplora TLA' }).click()

  await expect(page).toHaveURL(/\/dashboard$/)
  expect(payloads).toEqual([{ intent: 'explore' }])
})
