import { http, HttpResponse } from 'msw'
import { mockTournaments } from '../data/tournaments'

export const organizerHandlers = [
  http.get('/api/organizers', () => {
    const counts = new Map<string, { id: string; name: string; tournaments_count: number }>()
    for (const tournament of mockTournaments) {
      if (!tournament.organizer) continue
      const current = counts.get(tournament.organizer.id)
      counts.set(tournament.organizer.id, {
        ...tournament.organizer,
        tournaments_count: (current?.tournaments_count ?? 0) + 1,
      })
    }
    return HttpResponse.json([...counts.values()].sort((left, right) => left.name.localeCompare(right.name)))
  }),
  http.get('/api/organizers/:id', ({ params }) => {
    const tournaments = mockTournaments.filter((tournament) => tournament.organizer_id === params['id'])
    const organizer = tournaments[0]?.organizer
    if (!organizer) return HttpResponse.json({ message: 'Organizzatore non trovato' }, { status: 404 })
    return HttpResponse.json({
      ...organizer,
      player_id: null,
      photo_url: null,
      tournaments_count: tournaments.length,
      tournaments,
    })
  }),
]
