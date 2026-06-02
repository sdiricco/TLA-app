import type { MockUser } from '../../types'

export const mockUsers: MockUser[] = [
  { id: 'user-1', email: 'admin@tla.local', password: 'password', name: 'Admin User', role: 'admin' },
  { id: 'user-2', email: 'player@tla.local', password: 'password', name: 'Mario Rossi', role: 'player' },
  { id: 'user-3', email: 'giulia@tla.local', password: 'password', name: 'Giulia Neri', role: 'player' },
  { id: 'user-4', email: 'carlo@tla.local', password: 'password', name: 'Carlo Mancini', role: 'player' },
]
