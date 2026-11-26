import { expect, test } from '@playwright/test'

const organizer = {
  id: 'organizer-1',
  email: 'organizzatore@tla.local',
  name: 'Organizzatore Test',
  role: 'player',
  onboardingCompleted: true,
  onboardingIntent: 'organizer',
}
const playerA = { id: 'p-a', name: 'Anna Bianchi', club: 'TC Firenze', ranking: 12, photo_url: null, birth_date: null }
const playerB = { id: 'p-b', name: 'Bea Verdi', club: 'CT Pisa', ranking: 20, photo_url: null, birth_date: null }
const tournament = {
  id: 't-final',
  name: 'Masters di prova',
  status: 'in_progress',
  format: 'single_elimination',
  can_manage: true,
  tournament_players: [{ player_id: playerA.id, seed: 1 }, { player_id: playerB.id, seed: 2 }],
  phases: [],
}

test('match detail shows a scoreboard and saves the result', async ({ page }) => {
  let savedMatch = {
    id: 'm-final',
    tournament_id: tournament.id,
    round_index: 0,
    position: 0,
    player1_id: playerA.id,
    player2_id: playerB.id,
    result: null as string | null,
    winner_id: null as string | null,
    status: 'pending',
  }

  // Anything not mocked below answers with an empty collection, so the app
  // never reaches a real backend with the fake token.
  await page.route('**/api/**', async (route) => {
    await route.fulfill({ json: { values: [], page: 0, perPage: 100, total: 0 } })
  })
  await page.route('**/api/organizations', async (route) => route.fulfill({ json: [] }))
  await page.route('**/api/notifications/unread-count', async (route) => route.fulfill({ json: { count: 0 } }))
  await page.route('**/api/players/me', async (route) => route.fulfill({ json: null }))
  await page.route('**/api/auth/login', async (route) => route.fulfill({ json: { user: organizer, token: 'organizer-token' } }))
  await page.route('**/api/auth/me', async (route) => route.fulfill({ json: { user: organizer, impersonator: null } }))
  await page.route(`**/api/tournaments/${tournament.id}`, async (route) => route.fulfill({ json: tournament }))
  await page.route(`**/api/tournaments/${tournament.id}/matches*`, async (route) => route.fulfill({
    json: {
      tournament,
      draw: { draw_size: 2, participants_count: 2, rounds_count: 1 },
      rounds: [{ index: 0, name: 'Finale' }],
      matches: [savedMatch],
    },
  }))
  await page.route('**/api/players/p-*', async (route) => {
    const id = route.request().url().split('/').pop()
    await route.fulfill({ json: id === playerA.id ? playerA : playerB })
  })
  await page.route(`**/api/matches/${savedMatch.id}`, async (route) => {
    const body = route.request().postDataJSON() as { result: string; winner_id: string }
    savedMatch = { ...savedMatch, ...body, status: 'completed' }
    await route.fulfill({ json: savedMatch })
  })

  await page.goto('/login')
  await page.getByLabel('Email').fill(organizer.email)
  await page.getByPlaceholder('Inserisci la password').fill('e2e-organizer-pass')
  await page.getByRole('button', { name: 'Accedi' }).click()
  await page.waitForURL(/dashboard|onboarding/)

  await page.goto(`/tournaments/${tournament.id}/matches/${savedMatch.id}`)
  await expect(page.getByRole('heading', { name: 'Finale' })).toBeVisible()
  await expect(page.getByText('Da giocare')).toBeVisible()
  await expect(page.getByText('Risultato non ancora inserito')).toBeVisible()

  // The score is written from the winner's side; player 2 wins here.
  await page.getByLabel('Punteggio').fill('6-4 3-6 7-5')
  await page.getByRole('button', { name: playerB.name }).click()
  await page.getByRole('button', { name: 'Salva' }).click()

  await expect(page.getByText('Concluso')).toBeVisible()
  const scoreboard = page.getByRole('region', { name: 'Segnapunti' })
  await expect(scoreboard.getByLabel('Vincitore')).toBeVisible()
  const games = scoreboard.getByRole('list', { name: 'Game per set' })
  await expect(games.nth(0)).toHaveText(/4\s*6\s*5/)
  await expect(games.nth(1)).toHaveText(/6\s*3\s*7/)
})
