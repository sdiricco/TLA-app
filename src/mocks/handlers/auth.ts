import { http, HttpResponse } from 'msw'
import { mockUsers } from '../data/users'
import { mockPlayers } from '../data/players'
import type { MockUser, Profile, User } from '../../types'

let currentUser: Omit<MockUser, 'password'> | null = null
const GUEST_TOKEN = 'tla_guest_token'
const guestUser: User = {
  id: 'guest',
  email: 'ospite@local',
  name: 'Ospite',
  role: 'admin',
}

export const authHandlers = [
  http.post('/api/auth/register', async ({ request }) => {
    const { email, password, name } = (await request.json()) as Pick<MockUser, 'email' | 'password' | 'name'>
    if (mockUsers.find((u) => u.email === email)) {
      return HttpResponse.json({ message: 'Email già registrata' }, { status: 409 })
    }
    const newUser: MockUser = { id: `user-${Date.now()}`, email, password, name, role: 'player' }
    mockUsers.push(newUser)
    // Auto-create player record for new player users
    mockPlayers.push({
      id: `p-${Date.now()}`,
      name: name ?? 'Nuovo giocatore',
      ranking: 0,
      birth_date: null,
      photo_url: null,
      club: null,
      phone: null,
      user_id: newUser.id,
    })
    const { password: _pwd, ...safeUser } = newUser
    void _pwd
    currentUser = safeUser
    return HttpResponse.json({ user: safeUser, token: `mock-jwt-token-${safeUser.id}` }, { status: 201 })
  }),

  http.post('/api/auth/login', async ({ request }) => {
    const { email, password } = (await request.json()) as Pick<MockUser, 'email' | 'password'>
    const user = mockUsers.find((u) => u.email === email && u.password === password)
    if (!user) {
      return HttpResponse.json({ message: 'Credenziali non valide' }, { status: 401 })
    }
    const { password: _pwd, ...safeUser } = user
    void _pwd
    currentUser = safeUser
    return HttpResponse.json({ user: safeUser, token: `mock-jwt-token-${safeUser.id}` })
  }),

  http.post('/api/auth/logout', () => {
    currentUser = null
    return HttpResponse.json({ message: 'Logout effettuato' })
  }),

  http.get('/api/auth/me', ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (auth === `Bearer ${GUEST_TOKEN}`) {
      return HttpResponse.json({ user: guestUser })
    }
    if (!auth?.startsWith('Bearer mock-jwt-token-')) {
      return HttpResponse.json({ message: 'Non autorizzato' }, { status: 401 })
    }
    if (!currentUser) {
      return HttpResponse.json({ message: 'Sessione scaduta' }, { status: 401 })
    }
    return HttpResponse.json({ user: currentUser as User })
  }),

  http.get('/api/auth/profile', ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (auth === `Bearer ${GUEST_TOKEN}`) {
      return HttpResponse.json({
        id: 'guest',
        email: guestUser.email,
        name: guestUser.name,
        role: 'player',
      })
    }
    if (!auth?.startsWith('Bearer mock-jwt-token-') || !currentUser) {
      return HttpResponse.json({ message: 'Non autorizzato' }, { status: 401 })
    }
    const profile: Profile = {
      id: currentUser.id,
      name: currentUser.name ?? null,
      role: currentUser.role,
    }
    return HttpResponse.json(profile)
  }),

  http.get('/api/auth/profiles/unlinked', ({ request }) => {
    const auth = request.headers.get('Authorization')
    if (auth === `Bearer ${GUEST_TOKEN}`) {
      const linkedUserIds = new Set(mockPlayers.map((p) => p.user_id).filter(Boolean))
      const profiles: Profile[] = mockUsers
        .filter((u) => u.role === 'player' && !linkedUserIds.has(u.id))
        .map((u) => ({ id: u.id, name: u.name ?? null, role: u.role }))
      return HttpResponse.json(profiles)
    }
    if (!auth?.startsWith('Bearer mock-jwt-token-') || !currentUser) {
      return HttpResponse.json({ message: 'Non autorizzato' }, { status: 401 })
    }
    const linkedUserIds = new Set(mockPlayers.map((p) => p.user_id).filter(Boolean))
    const profiles: Profile[] = mockUsers
      .filter((u) => u.role === 'player' && !linkedUserIds.has(u.id))
      .map((u) => ({ id: u.id, name: u.name ?? null, role: u.role }))
    return HttpResponse.json(profiles)
  }),
]
