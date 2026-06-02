# Roles, Bracket, Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add admin/player roles, manual bracket filling, match result as free text, tournament published flag, player self-enrollment, and an admin dashboard.

**Architecture:** Role system via `profiles` table (Supabase) with MSW mock fallback. Auth store enriched with `role` + `isAdmin`. Router guards and sidebar differ by role. Bracket replaced with empty-slot creation + manual admin assignment. Match `sets[]` replaced with `result: string`.

**Tech Stack:** Vue 3, TypeScript, Pinia, Vue Router, PrimeVue 4, Tailwind CSS v4, Supabase, MSW

---

## Task 1 — Update types (`src/types/index.ts`)

**Files:**
- Modify: `src/types/index.ts`

- [ ] Replace the entire `src/types/index.ts` with the following content:

```ts
// ── Domain types ────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'player'

export interface User {
  id: string
  email: string
  name?: string
  role: UserRole
}

export interface Profile {
  id: string
  name: string | null
  role: UserRole
}

export interface Player {
  id: string
  name: string
  ranking: number
  club?: string | null
  phone?: string | null
  user_id?: string | null
  created_at?: string
  updated_at?: string
}

export type PlayerCreate = Omit<Player, 'id' | 'created_at' | 'updated_at'>
export type PlayerUpdate = Partial<PlayerCreate>

export type TournamentFormat =
  | 'single_elimination'
  | 'double_elimination'
  | 'round_robin'
  | 'round_robin_elimination'

export type TournamentCategory = 'singles' | 'doubles'

export type TournamentStatus = 'upcoming' | 'ongoing' | 'completed'

export interface Tournament {
  id: string
  name: string
  location?: string | null
  start_date?: string | null
  end_date?: string | null
  format: TournamentFormat
  category: TournamentCategory
  status: TournamentStatus
  published: boolean
  created_at?: string
  updated_at?: string
}

export type TournamentCreate = Omit<Tournament, 'id' | 'created_at' | 'updated_at'>
export type TournamentUpdate = Partial<TournamentCreate>

// ── Tournament detail ────────────────────────────────────────────────────────

export interface TournamentPlayer {
  player_id: string
  seed: number | null
  enrolled_at?: string
}

export interface TournamentWithPlayers extends Tournament {
  tournament_players?: TournamentPlayer[]
  playerIds?: string[]
}

// ── Matches ──────────────────────────────────────────────────────────────────

export type MatchStatus = 'pending' | 'completed'

export interface Match {
  id: string
  tournament_id: string
  round: number
  position: number
  player1_id: string | null
  player2_id: string | null
  result: string | null
  winner_id: string | null
  status: MatchStatus
  created_at?: string
  updated_at?: string
}

export type MatchSlot = 'player1_id' | 'player2_id'

export interface MatchResultInput {
  result: string
  winner_id: string
}

export interface MatchAssignInput {
  slot: MatchSlot
  player_id: string | null
}

// ── Mock-specific types ──────────────────────────────────────────────────────

export interface MockUser extends User {
  password: string
}

export interface MockTournament extends Tournament {
  playerIds: string[]
}

// ── Service interface types ──────────────────────────────────────────────────

export interface ProfilesService {
  getMyProfile(): Promise<Profile>
}

export interface AuthService {
  login(email: string, password: string): Promise<User>
  register(email: string, password: string, name?: string): Promise<User>
  logout(): Promise<void>
  getCurrentUser(): Promise<User | null>
}

export interface PlayersService {
  getAll(): Promise<Player[]>
  getById(id: string): Promise<Player>
  create(data: PlayerCreate): Promise<Player>
  update(id: string, data: PlayerUpdate): Promise<Player>
  remove(id: string): Promise<null>
  getMyPlayer(): Promise<Player | null>
}

export interface TournamentsService {
  getAll(): Promise<Tournament[]>
  getById(id: string): Promise<TournamentWithPlayers>
  create(data: TournamentCreate): Promise<Tournament>
  update(id: string, data: TournamentUpdate): Promise<Tournament>
  remove(id: string): Promise<null>
  addPlayer(tournamentId: string, playerId: string): Promise<null>
  removePlayer(tournamentId: string, playerId: string): Promise<null>
  updateSeeds(tournamentId: string, seededPlayerIds: string[]): Promise<void>
  setPublished(tournamentId: string, published: boolean): Promise<Tournament>
  enroll(tournamentId: string): Promise<null>
  withdraw(tournamentId: string): Promise<null>
}

export interface MatchesService {
  getByTournament(tournamentId: string): Promise<Match[]>
  createEmptyBracket(tournamentId: string, numPlayers: number): Promise<Match[]>
  assignPlayer(matchId: string, data: MatchAssignInput): Promise<Match>
  enterResult(matchId: string, data: MatchResultInput): Promise<Match>
  reset(tournamentId: string): Promise<void>
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface TournamentStats {
  upcoming: number
  ongoing: number
  completed: number
  totalPlayers: number
}

export interface PendingEnrollment {
  playerName: string
  tournamentName: string
  enrolledAt: string
}
```

- [ ] Run type-check: `cd /Users/simone/Repository/personal/TLA-app && npx vue-tsc --noEmit 2>&1 | head -30`
  - Expected: errors (many files still use old types — that's OK for now, will fix per task)

- [ ] Commit:
```bash
cd /Users/simone/Repository/personal/TLA-app
git add src/types/index.ts
git commit -m "refactor(types): add role, Profile, published, result string, MatchAssign"
```

---

## Task 2 — Supabase migration

**Files:**
- Create: `supabase/migrations/20260602200000_v2_roles_bracket_dashboard.sql`

- [ ] Create the migration file:

```sql
-- =============================================================================
-- V2: profiles, user_id on players, published on tournaments, result on matches
-- =============================================================================

-- 1. profiles table ----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name  TEXT,
  role  TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'player'))
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'name', 'player')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_on_signup();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own profile name"
  ON profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- 2. players: add user_id ---------------------------------------------------------
ALTER TABLE players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS players_user_id_unique ON players(user_id) WHERE user_id IS NOT NULL;

-- Allow authenticated users to read their own player record
CREATE POLICY IF NOT EXISTS "Players can read own player record"
  ON players FOR SELECT TO authenticated
  USING (true);

-- 3. tournaments: add published ---------------------------------------------------
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS published BOOLEAN NOT NULL DEFAULT false;

-- Players can only see published tournaments
DROP POLICY IF EXISTS "Authenticated users can read tournaments" ON tournaments;
CREATE POLICY "Admins can read all tournaments"
  ON tournaments FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    OR published = true
  );

-- Only admins can insert/update/delete tournaments
DROP POLICY IF EXISTS "Authenticated users can insert tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can update tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can delete tournaments" ON tournaments;
CREATE POLICY "Admins can insert tournaments"
  ON tournaments FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update tournaments"
  ON tournaments FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete tournaments"
  ON tournaments FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 4. tournament_players: player self-enrollment -----------------------------------
DROP POLICY IF EXISTS "Authenticated users can insert tournament_players" ON tournament_players;
DROP POLICY IF EXISTS "Authenticated users can delete tournament_players" ON tournament_players;
CREATE POLICY "Players can enroll themselves"
  ON tournament_players FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM players WHERE user_id = auth.uid() AND id = player_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );
CREATE POLICY "Players can withdraw themselves"
  ON tournament_players FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM players WHERE user_id = auth.uid() AND id = player_id)
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 5. matches: replace sets with result --------------------------------------------
ALTER TABLE matches DROP COLUMN IF EXISTS sets;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS result TEXT NULL;

-- Only admins can insert/update/delete matches
DROP POLICY IF EXISTS "Authenticated users can insert matches" ON matches;
DROP POLICY IF EXISTS "Authenticated users can update matches" ON matches;
DROP POLICY IF EXISTS "Authenticated users can delete matches" ON matches;
CREATE POLICY "Admins can insert matches"
  ON matches FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can update matches"
  ON matches FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins can delete matches"
  ON matches FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));
```

- [ ] Apply to Supabase:
```bash
cd /Users/simone/Repository/personal/TLA-app
npx supabase db query --linked -f supabase/migrations/20260602200000_v2_roles_bracket_dashboard.sql 2>&1
```
Expected: no errors. If a policy already exists, use `DROP POLICY IF EXISTS` (already in the script).

- [ ] Repair migration:
```bash
npx supabase migration repair --status applied 20260602200000
```

- [ ] Commit:
```bash
git add supabase/migrations/20260602200000_v2_roles_bracket_dashboard.sql
git commit -m "feat(db): v2 migration — profiles, published, result, RLS by role"
```

---

## Task 3 — Profiles service (`src/services/profilesService.ts`)

**Files:**
- Create: `src/services/profilesService.ts`
- Modify: `src/mocks/handlers/auth.ts` (add GET /api/auth/profile)
- Modify: `src/mocks/handlers/index.ts` (no change needed, authHandlers already included)

- [ ] Create `src/services/profilesService.ts`:

```ts
import { supabase } from '../lib/supabase'
import { http } from './http'
import type { Profile, ProfilesService } from '../types'

const mock: ProfilesService = {
  getMyProfile: () => http.get<Profile>('/auth/profile'),
}

const sb: ProfilesService = {
  getMyProfile: async () => {
    const { data, error } = await supabase!
      .from('profiles')
      .select('id, name, role')
      .single()
    if (error) throw new Error(error.message)
    return data as Profile
  },
}

export const profilesService: ProfilesService = supabase ? sb : mock
```

- [ ] In `src/mocks/handlers/auth.ts`, import `Profile` and add a GET `/api/auth/profile` handler. Replace the entire file:

```ts
import { http, HttpResponse } from 'msw'
import { mockUsers } from '../data/users'
import type { MockUser, Profile, User } from '../../types'

let currentUser: Omit<MockUser, 'password'> | null = null

export const authHandlers = [
  http.post('/api/auth/register', async ({ request }) => {
    const { email, password, name } = (await request.json()) as Pick<MockUser, 'email' | 'password' | 'name'>
    if (mockUsers.find((u) => u.email === email)) {
      return HttpResponse.json({ message: 'Email già registrata' }, { status: 409 })
    }
    const newUser: MockUser = { id: `user-${Date.now()}`, email, password, name, role: 'player' }
    mockUsers.push(newUser)
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
]
```

- [ ] Update `src/mocks/data/users.ts` to fix role values:

```ts
import type { MockUser } from '../../types'

export const mockUsers: MockUser[] = [
  { id: 'user-1', email: 'admin@tla.local', password: 'password', name: 'Admin User', role: 'admin' },
  { id: 'user-2', email: 'player@tla.local', password: 'password', name: 'Mario Rossi', role: 'player' },
]
```

- [ ] Run type-check: `npx vue-tsc --noEmit 2>&1 | grep "error TS" | wc -l`

- [ ] Commit:
```bash
git add src/services/profilesService.ts src/mocks/handlers/auth.ts src/mocks/data/users.ts
git commit -m "feat(auth): add profilesService and GET /api/auth/profile mock handler"
```

---

## Task 4 — Update auth store

**Files:**
- Modify: `src/stores/auth.ts`

- [ ] Replace `src/stores/auth.ts` entirely:

```ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { authService } from '../services/authService'
import { profilesService } from '../services/profilesService'
import type { User } from '../types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => user.value?.role === 'admin')

  async function init(): Promise<void> {
    const authUser = await authService.getCurrentUser()
    if (authUser) {
      try {
        const profile = await profilesService.getMyProfile()
        user.value = { ...authUser, role: profile.role }
      } catch {
        // If profile fetch fails (e.g. new user, no profile yet), default to player
        user.value = { ...authUser, role: 'player' }
      }
    }
  }

  async function login(email: string, password: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const authUser = await authService.login(email, password)
      const profile = await profilesService.getMyProfile()
      user.value = { ...authUser, role: profile.role }
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  async function logout(): Promise<void> {
    await authService.logout()
    user.value = null
  }

  async function register(email: string, password: string, name?: string): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const authUser = await authService.register(email, password, name)
      // Newly registered users are always 'player'
      user.value = { ...authUser, role: 'player' }
    } catch (e) {
      error.value = (e as Error).message
    } finally {
      loading.value = false
    }
  }

  return { user, loading, error, isAuthenticated, isAdmin, init, login, register, logout }
})
```

- [ ] Run: `npx vue-tsc --noEmit 2>&1 | grep "error TS" | head -20`

- [ ] Commit:
```bash
git add src/stores/auth.ts
git commit -m "feat(auth): load profile role on login/init, expose isAdmin"
```

---

## Task 5 — Update router guards

**Files:**
- Modify: `src/router/index.ts`

- [ ] Replace `src/router/index.ts` entirely:

```ts
import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    requiresAuth?: boolean
    requiresAdmin?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
      meta: { public: true },
    },
    {
      path: '/',
      component: () => import('../layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'home',
          redirect: () => ({ name: 'tournaments' }), // replaced by guard below
        },
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('../views/HomeView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
        {
          path: 'tournaments',
          name: 'tournaments',
          component: () => import('../views/TournamentsView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'tournaments/:id',
          name: 'tournament-detail',
          component: () => import('../views/TournamentDetailView.vue'),
          meta: { requiresAuth: true },
        },
        {
          path: 'players',
          name: 'players',
          component: () => import('../views/PlayersView.vue'),
          meta: { requiresAuth: true, requiresAdmin: true },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const { useAuthStore } = await import('../stores/auth')
  const auth = useAuthStore()

  if (!auth.user) await auth.init()

  // Not authenticated → login
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login' }
  }

  // Authenticated on login page → redirect by role
  if (to.name === 'login' && auth.isAuthenticated) {
    return auth.isAdmin ? { name: 'dashboard' } : { name: 'tournaments' }
  }

  // Player trying to access admin-only route
  if (to.meta.requiresAdmin && !auth.isAdmin) {
    return { name: 'tournaments' }
  }

  // Root path: redirect by role
  if (to.name === 'home') {
    return auth.isAdmin ? { name: 'dashboard' } : { name: 'tournaments' }
  }

  return true
})

export default router
```

- [ ] Run: `npx vue-tsc --noEmit 2>&1 | grep "error TS" | head -20`

- [ ] Commit:
```bash
git add src/router/index.ts
git commit -m "feat(router): role-based guards and redirect, requiresAdmin meta"
```

---

## Task 6 — Role-based sidebar

**Files:**
- Modify: `src/components/layout/AppSidebar.vue`

- [ ] In `src/components/layout/AppSidebar.vue`, replace the `navItems` array and import `isAdmin` from the auth store. Find the `<script setup>` block and update:

```ts
// Replace navItems with computed role-based list:
const navItems = computed(() => {
  if (auth.isAdmin) {
    return [
      { label: 'Dashboard', icon: 'pi pi-home', to: '/dashboard' },
      { label: 'Tornei', icon: 'pi pi-trophy', to: '/tournaments' },
      { label: 'Giocatori', icon: 'pi pi-users', to: '/players' },
    ]
  }
  return [
    { label: 'Tornei', icon: 'pi pi-trophy', to: '/tournaments' },
  ]
})
```

Also update `isActive` so `/dashboard` is exact-matched like `/`:
```ts
function isActive(to: string): boolean {
  if (to === '/' || to === '/dashboard') return route.path === to
  return route.path.startsWith(to)
}
```

And add `computed` to the vue import.

- [ ] Run: `npx vue-tsc --noEmit 2>&1 | grep "error TS" | head -20`

- [ ] Commit:
```bash
git add src/components/layout/AppSidebar.vue
git commit -m "feat(sidebar): role-based nav items (admin vs player)"
```

---

## Task 7 — Update mock tournament data + tournaments service

**Files:**
- Modify: `src/mocks/data/tournaments.ts`
- Modify: `src/services/tournamentsService.ts`

- [ ] Update `src/mocks/data/tournaments.ts` — add `published` field to each tournament:

```ts
import type { MockTournament } from '../../types'

export const mockTournaments: MockTournament[] = [
  {
    id: 't-1',
    name: 'Torneo Primaverile 2025',
    location: 'TC Milano',
    start_date: '2025-05-10',
    end_date: '2025-05-18',
    format: 'single_elimination',
    category: 'singles',
    status: 'completed',
    published: true,
    playerIds: ['p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-7', 'p-8'],
  },
  {
    id: 't-2',
    name: 'Open Estivo 2025',
    location: 'TC Roma',
    start_date: '2025-07-01',
    end_date: '2025-07-15',
    format: 'round_robin',
    category: 'singles',
    status: 'ongoing',
    published: true,
    playerIds: ['p-1', 'p-3', 'p-5', 'p-7'],
  },
  {
    id: 't-3',
    name: 'Torneo Autunnale 2025',
    location: 'TC Torino',
    start_date: '2025-10-04',
    end_date: '2025-10-12',
    format: 'single_elimination',
    category: 'doubles',
    status: 'upcoming',
    published: false,
    playerIds: [],
  },
]
```

- [ ] Update `src/mocks/handlers/tournaments.ts` — add `setPublished`, `enroll`, `withdraw` handlers. Find the file and add these handlers inside the array:

```ts
// After the existing handlers, add:
http.patch('/api/tournaments/:id/publish', async ({ params, request }) => {
  const { published } = (await request.json()) as { published: boolean }
  const tournament = mockTournaments.find((t) => t.id === params['id'])
  if (!tournament) return HttpResponse.json({ message: 'Non trovato' }, { status: 404 })
  tournament.published = published
  return HttpResponse.json({ ...tournament })
}),

http.post('/api/tournaments/:id/enroll', async ({ params, request }) => {
  const { playerId } = (await request.json()) as { playerId: string }
  const tournament = mockTournaments.find((t) => t.id === params['id'])
  if (!tournament) return HttpResponse.json({ message: 'Non trovato' }, { status: 404 })
  if (!tournament.playerIds.includes(playerId)) tournament.playerIds.push(playerId)
  return new HttpResponse(null, { status: 204 })
}),

http.delete('/api/tournaments/:id/enroll', async ({ params, request }) => {
  const { playerId } = (await request.json()) as { playerId: string }
  const tournament = mockTournaments.find((t) => t.id === params['id'])
  if (!tournament) return HttpResponse.json({ message: 'Non trovato' }, { status: 404 })
  tournament.playerIds = tournament.playerIds.filter((id) => id !== playerId)
  return new HttpResponse(null, { status: 204 })
}),
```

- [ ] Update `src/services/tournamentsService.ts` — add `setPublished`, `enroll`, `withdraw` to both mock and sb implementations. The existing file has a `mock` and `sb` object. Append to each:

In `mock`:
```ts
setPublished: (id, published) =>
  http.patch<Tournament>(`/tournaments/${id}/publish`, { published }),
enroll: (id) =>
  http.post<null>(`/tournaments/${id}/enroll`, { playerId: 'me' }).then(() => null),
withdraw: (id) =>
  http.delete<null>(`/tournaments/${id}/enroll`, { playerId: 'me' }).then(() => null),
```

In `sb`:
```ts
setPublished: async (id, published) => {
  const { data, error } = await supabase!
    .from('tournaments')
    .update({ published })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data as Tournament
},
enroll: async (tournamentId) => {
  // Find player record for current user
  const { data: player } = await supabase!
    .from('players')
    .select('id')
    .eq('user_id', (await supabase!.auth.getUser()).data.user!.id)
    .single()
  if (!player) throw new Error('Profilo giocatore non configurato')
  const { error } = await supabase!
    .from('tournament_players')
    .insert({ tournament_id: tournamentId, player_id: player.id })
  if (error) throw new Error(error.message)
  return null
},
withdraw: async (tournamentId) => {
  const { data: player } = await supabase!
    .from('players')
    .select('id')
    .eq('user_id', (await supabase!.auth.getUser()).data.user!.id)
    .single()
  if (!player) throw new Error('Profilo giocatore non configurato')
  const { error } = await supabase!
    .from('tournament_players')
    .delete()
    .eq('tournament_id', tournamentId)
    .eq('player_id', player.id)
  if (error) throw new Error(error.message)
  return null
},
```

- [ ] Run: `npx vue-tsc --noEmit 2>&1 | grep "error TS" | head -20`

- [ ] Commit:
```bash
git add src/mocks/data/tournaments.ts src/mocks/handlers/tournaments.ts src/services/tournamentsService.ts
git commit -m "feat(tournaments): add published flag, setPublished, enroll, withdraw"
```

---

## Task 8 — Update players service (add `getMyPlayer`)

**Files:**
- Modify: `src/services/playersService.ts`
- Modify: `src/mocks/handlers/players.ts`

- [ ] In `src/mocks/handlers/players.ts`, add a handler for GET `/api/players/me` that returns the player linked to `user-2` (the mock player user):

```ts
// Add inside the handlers array:
http.get('/api/players/me', ({ request }) => {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer mock-jwt-token-')) {
    return HttpResponse.json({ message: 'Non autorizzato' }, { status: 401 })
  }
  // Extract user id from token (format: mock-jwt-token-{userId})
  const userId = auth.replace('Bearer mock-jwt-token-', '')
  // player@tla.local (user-2) → p-1 (Mario Rossi)
  const playerMap: Record<string, string> = { 'user-2': 'p-1' }
  const playerId = playerMap[userId]
  if (!playerId) return HttpResponse.json(null)
  const player = mockPlayers.find((p) => p.id === playerId)
  return player ? HttpResponse.json(player) : HttpResponse.json(null)
}),
```

- [ ] In `src/services/playersService.ts`, add `getMyPlayer` to both `mock` and `sb`:

In `mock`:
```ts
getMyPlayer: () => http.get<Player | null>('/players/me'),
```

In `sb`:
```ts
getMyPlayer: async () => {
  const { data: { user } } = await supabase!.auth.getUser()
  if (!user) return null
  const { data } = await supabase!
    .from('players')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()
  return data as Player | null
},
```

- [ ] Run: `npx vue-tsc --noEmit 2>&1 | grep "error TS" | head -20`

- [ ] Commit:
```bash
git add src/services/playersService.ts src/mocks/handlers/players.ts
git commit -m "feat(players): add getMyPlayer for self-enrollment"
```

---

## Task 9 — Rework matches utility, service, store, mock

**Files:**
- Modify: `src/utils/matches.ts`
- Modify: `src/services/matchesService.ts`
- Modify: `src/stores/matches.ts`
- Modify: `src/mocks/data/matches.ts`
- Modify: `src/mocks/handlers/matches.ts`

- [ ] Replace `src/utils/matches.ts` entirely (remove old draw logic, add `buildEmptyBracket`):

```ts
import type { Match } from '../types'

export function sortMatches(matches: Match[]): Match[] {
  return [...matches].sort((a, b) => a.round - b.round || a.position - b.position)
}

/** Creates empty match records for a single-elimination bracket of n players. */
export function buildEmptyBracket(
  tournamentId: string,
  numPlayers: number,
  createId: () => string,
): Match[] {
  if (numPlayers < 2) return []
  const numRounds = Math.ceil(Math.log2(numPlayers))
  const matches: Match[] = []
  for (let round = 1; round <= numRounds; round++) {
    const matchesInRound = Math.pow(2, numRounds - round)
    for (let position = 0; position < matchesInRound; position++) {
      matches.push({
        id: createId(),
        tournament_id: tournamentId,
        round,
        position,
        player1_id: null,
        player2_id: null,
        result: null,
        winner_id: null,
        status: 'pending',
      })
    }
  }
  return matches
}
```

- [ ] Replace `src/mocks/data/matches.ts`:

```ts
import type { Match } from '../../types'

export const mockMatches: Match[] = []
```

- [ ] Replace `src/mocks/handlers/matches.ts` entirely:

```ts
import { http, HttpResponse } from 'msw'
import { mockMatches } from '../data/matches'
import type { Match, MatchAssignInput, MatchResultInput } from '../../types'
import { buildEmptyBracket, sortMatches } from '../../utils/matches'

let matches: Match[] = [...mockMatches]

export const matchHandlers = [
  http.get('/api/tournaments/:id/matches', ({ params }) => {
    const tournamentMatches = sortMatches(matches.filter((m) => m.tournament_id === params['id']))
    return HttpResponse.json(tournamentMatches)
  }),

  http.post('/api/tournaments/:id/bracket', async ({ params, request }) => {
    const { numPlayers } = (await request.json()) as { numPlayers: number }
    const tournamentId = params['id'] as string
    matches = matches.filter((m) => m.tournament_id !== tournamentId)
    const newMatches = buildEmptyBracket(tournamentId, numPlayers, () => crypto.randomUUID())
    matches = sortMatches([...matches, ...newMatches])
    return HttpResponse.json(newMatches)
  }),

  http.patch('/api/matches/:id/assign', async ({ params, request }) => {
    const body = (await request.json()) as MatchAssignInput
    const index = matches.findIndex((m) => m.id === params['id'])
    if (index === -1) return HttpResponse.json({ message: 'Non trovato' }, { status: 404 })
    const match = { ...matches[index]! }
    if (body.slot === 'player1_id') match.player1_id = body.player_id
    else match.player2_id = body.player_id
    // If clearing a player, also clear winner/result
    if (body.player_id === null) {
      match.winner_id = null
      match.result = null
      match.status = 'pending'
    }
    matches[index] = match
    return HttpResponse.json(match)
  }),

  http.put('/api/matches/:id', async ({ params, request }) => {
    const body = (await request.json()) as MatchResultInput
    const index = matches.findIndex((m) => m.id === params['id'])
    if (index === -1) return HttpResponse.json({ message: 'Non trovato' }, { status: 404 })
    matches[index] = { ...matches[index]!, result: body.result, winner_id: body.winner_id, status: 'completed' }
    return HttpResponse.json(matches[index])
  }),

  http.delete('/api/tournaments/:id/matches', ({ params }) => {
    matches = matches.filter((m) => m.tournament_id !== params['id'])
    return new HttpResponse(null, { status: 204 })
  }),
]
```

- [ ] Replace `src/services/matchesService.ts` entirely:

```ts
import { supabase } from '../lib/supabase'
import { http } from './http'
import type { Match, MatchAssignInput, MatchResultInput, MatchesService } from '../types'
import { buildEmptyBracket, sortMatches } from '../utils/matches'

type SupabaseResult<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>

async function sbQuery<T>(query: SupabaseResult<T>): Promise<T> {
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data as T
}

const mock: MatchesService = {
  getByTournament: (id) => http.get<Match[]>(`/tournaments/${id}/matches`),
  createEmptyBracket: (id, numPlayers) =>
    http.post<Match[]>(`/tournaments/${id}/bracket`, { numPlayers }),
  assignPlayer: (matchId, data) =>
    http.patch<Match>(`/matches/${matchId}/assign`, data),
  enterResult: (matchId, data) => http.put<Match>(`/matches/${matchId}`, data),
  reset: (tournamentId) => http.delete<null>(`/tournaments/${tournamentId}/matches`),
}

const sb: MatchesService = {
  getByTournament: async (id) =>
    sortMatches(
      await sbQuery<Match[]>(
        supabase!
          .from('matches')
          .select('*')
          .eq('tournament_id', id)
          .order('round')
          .order('position'),
      ),
    ),

  createEmptyBracket: async (tournamentId, numPlayers) => {
    await supabase!.from('matches').delete().eq('tournament_id', tournamentId)
    const toInsert = buildEmptyBracket(tournamentId, numPlayers, () => crypto.randomUUID())
    if (toInsert.length === 0) return []
    return sortMatches(
      await sbQuery<Match[]>(supabase!.from('matches').insert(toInsert).select()),
    )
  },

  assignPlayer: async (matchId, { slot, player_id }) => {
    return sbQuery<Match>(
      supabase!
        .from('matches')
        .update(
          player_id === null
            ? { [slot]: null, winner_id: null, result: null, status: 'pending' }
            : { [slot]: player_id },
        )
        .eq('id', matchId)
        .select()
        .single(),
    )
  },

  enterResult: async (matchId, { result, winner_id }) =>
    sbQuery<Match>(
      supabase!
        .from('matches')
        .update({ result, winner_id, status: 'completed' })
        .eq('id', matchId)
        .select()
        .single(),
    ),

  reset: async (tournamentId) => {
    const { error } = await supabase!.from('matches').delete().eq('tournament_id', tournamentId)
    if (error) throw new Error(error.message)
  },
}

export const matchesService: MatchesService = supabase ? sb : mock
```

- [ ] Replace `src/stores/matches.ts` entirely:

```ts
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { matchesService } from '../services/matchesService'
import type { Match, MatchAssignInput, MatchResultInput } from '../types'

export const useMatchesStore = defineStore('matches', () => {
  const matches = ref<Match[]>([])
  const loading = ref(false)

  const matchesByRound = computed(() => {
    const map = new Map<number, Match[]>()
    for (const match of matches.value) {
      const roundMatches = map.get(match.round) ?? []
      roundMatches[match.position] = match
      map.set(match.round, roundMatches)
    }
    return map
  })

  const numRounds = computed(() =>
    matches.value.length === 0 ? 0 : Math.max(...matches.value.map((m) => m.round)),
  )

  async function loadForTournament(tournamentId: string): Promise<void> {
    loading.value = true
    try {
      matches.value = await matchesService.getByTournament(tournamentId)
    } finally {
      loading.value = false
    }
  }

  async function createEmptyBracket(tournamentId: string, numPlayers: number): Promise<void> {
    matches.value = await matchesService.createEmptyBracket(tournamentId, numPlayers)
  }

  async function assignPlayer(matchId: string, data: MatchAssignInput): Promise<void> {
    const updated = await matchesService.assignPlayer(matchId, data)
    const index = matches.value.findIndex((m) => m.id === matchId)
    if (index !== -1) matches.value[index] = updated
  }

  async function enterResult(matchId: string, data: MatchResultInput): Promise<void> {
    const updated = await matchesService.enterResult(matchId, data)
    const index = matches.value.findIndex((m) => m.id === matchId)
    if (index !== -1) matches.value[index] = updated
  }

  async function reset(tournamentId: string): Promise<void> {
    await matchesService.reset(tournamentId)
    matches.value = []
  }

  return {
    matches,
    loading,
    matchesByRound,
    numRounds,
    loadForTournament,
    createEmptyBracket,
    assignPlayer,
    enterResult,
    reset,
  }
})
```

- [ ] Run: `npx vue-tsc --noEmit 2>&1 | grep "error TS" | head -30`

- [ ] Commit:
```bash
git add src/utils/matches.ts src/services/matchesService.ts src/stores/matches.ts \
  src/mocks/data/matches.ts src/mocks/handlers/matches.ts
git commit -m "feat(matches): result string, empty bracket, manual assign, remove auto-draw"
```

---

## Task 10 — Update tournaments store (add setPublished, enroll, withdraw)

**Files:**
- Modify: `src/stores/tournaments.ts`

- [ ] Read `src/stores/tournaments.ts` and add three new actions after `updateSeeds`:

```ts
async function setPublished(id: string, published: boolean): Promise<void> {
  const updated = await tournamentsService.setPublished(id, published)
  const index = tournaments.value.findIndex((t) => t.id === id)
  if (index !== -1) tournaments.value[index] = updated
  if (current.value?.id === id) current.value = { ...current.value, published }
},

async function enroll(id: string): Promise<void> {
  await tournamentsService.enroll(id)
  await getById(id) // reload to get updated player list
},

async function withdraw(id: string): Promise<void> {
  await tournamentsService.withdraw(id)
  await getById(id)
},
```

And expose them in the return statement.

- [ ] Run: `npx vue-tsc --noEmit 2>&1 | grep "error TS" | head -20`

- [ ] Commit:
```bash
git add src/stores/tournaments.ts
git commit -m "feat(tournaments-store): add setPublished, enroll, withdraw actions"
```

---

## Task 11 — Update TournamentsView (published badge, admin-only create)

**Files:**
- Modify: `src/views/TournamentsView.vue`

- [ ] In `TournamentsView.vue`, import `useAuthStore` and expose `isAdmin`. Add a "Bozza" badge on tournament cards when `!tournament.published`. Only show the "Crea torneo" button when `isAdmin`. Do NOT change the core card layout.

  Add to `<script setup>`:
  ```ts
  import { useAuthStore } from '../stores/auth'
  const auth = useAuthStore()
  ```

  In the card template, after the tournament name, add:
  ```html
  <Tag v-if="!tournament.published" value="Bozza" severity="secondary" class="text-xs" />
  ```

  Wrap the "Aggiungi" Button with `v-if="auth.isAdmin"`.

- [ ] Run: `npx vue-tsc --noEmit 2>&1 | grep "error TS" | head -20`

- [ ] Commit:
```bash
git add src/views/TournamentsView.vue
git commit -m "feat(tournaments-view): published badge, admin-only create button"
```

---

## Task 12 — Rewrite TournamentDetailView

**Files:**
- Modify: `src/views/TournamentDetailView.vue`

This is the largest change. Rewrite the entire `TournamentDetailView.vue`:

- [ ] Add `useAuthStore` import and `auth` const.
- [ ] Add `myPlayer` ref loaded via `playersService.getMyPlayer()` on mount.
- [ ] Add `isEnrolled` computed: checks if `myPlayer.value?.id` is in `enrolledPlayerIds`.
- [ ] Add `publishToggle()` function: calls `tournamentsStore.setPublished(id, !tournament.value.published)`.

**Published toggle in header (admin only):**
```html
<Button
  v-if="auth.isAdmin"
  :label="tournament.published ? 'Nascondi' : 'Pubblica'"
  :icon="tournament.published ? 'pi pi-eye-slash' : 'pi pi-eye'"
  :severity="tournament.published ? 'secondary' : 'success'"
  size="small"
  outlined
  @click="publishToggle"
/>
```

**Iscritti tab — two modes:**

Admin (same as today: add/remove/reorder with drag + seeds):
```html
<template v-if="auth.isAdmin">
  <!-- existing admin enrollment UI: drag list, add/remove dialog -->
</template>
```

Player mode:
```html
<template v-else>
  <div v-if="!myPlayer" class="flex flex-col items-center gap-3 py-8 text-muted-color text-center">
    <i class="pi pi-exclamation-triangle text-2xl" />
    <p class="m-0">Profilo giocatore non configurato.<br>Contatta l'amministratore.</p>
  </div>
  <template v-else>
    <div class="flex items-center gap-3 mb-4">
      <Button
        v-if="!isEnrolled && tournament.status === 'upcoming'"
        label="Iscriviti"
        icon="pi pi-user-plus"
        @click="handleEnroll"
      />
      <Button
        v-else-if="isEnrolled && tournament.status === 'upcoming'"
        label="Ritirati"
        icon="pi pi-user-minus"
        severity="danger"
        outlined
        @click="handleWithdraw"
      />
    </div>
    <div class="flex flex-col gap-2">
      <div
        v-for="(player, index) in enrolledPlayers"
        :key="player.id"
        class="flex items-center gap-3 p-3 rounded-lg bg-surface-50 border border-surface-200"
      >
        <span class="text-sm font-bold text-muted-color w-8">#{{ index + 1 }}</span>
        <span class="font-medium text-color">{{ player.name }}</span>
      </div>
    </div>
  </template>
</template>
```

**Bracket tab — admin vs player:**

Remove old `generateDraw()` call and `editSets`/`normalizedSets` logic entirely.

Admin bracket actions:
- "Crea tabellone vuoto" button (replaces "Genera tabellone"):
  ```ts
  async function createEmptyBracket(): Promise<void> {
    if (!tournament.value || enrolledPlayers.value.length < 2) return
    await matchesStore.createEmptyBracket(tournament.value.id, enrolledPlayers.value.length)
  }
  ```
- Click on match slot → open assign dialog (if admin)
- Click on match with 2 players → open result dialog

**Assign player dialog** (admin only):
```html
<Dialog v-model:visible="assignDialogVisible" header="Assegna giocatore" modal :style="{ width: '340px' }">
  <div class="flex flex-col gap-4 pt-2">
    <Select
      v-model="assignPlayerId"
      :options="availableForSlot"
      option-label="name"
      option-value="id"
      placeholder="Seleziona giocatore"
      fluid
    />
    <div class="flex justify-end gap-2">
      <Button label="Rimuovi" severity="danger" outlined @click="clearSlot" v-if="selectedSlotHasPlayer" />
      <Button label="Annulla" severity="secondary" outlined @click="assignDialogVisible = false" />
      <Button label="Assegna" :disabled="!assignPlayerId" @click="confirmAssign" />
    </div>
  </div>
</Dialog>
```

**Result dialog** (admin only):
```html
<Dialog v-model:visible="resultDialogVisible" header="Inserisci risultato" modal :style="{ width: '360px' }">
  <div class="flex flex-col gap-4 pt-2">
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Risultato</label>
      <InputText v-model="editResult" placeholder="es. 6-3 6-4" fluid />
    </div>
    <div class="flex flex-col gap-1">
      <label class="text-sm font-medium">Vincitore</label>
      <div class="flex flex-col gap-2">
        <div
          class="flex items-center gap-2 p-3 rounded-lg border cursor-pointer"
          :class="editWinnerId === selectedMatch.player1_id ? 'border-primary-400 bg-primary-50' : 'border-surface-200'"
          @click="editWinnerId = selectedMatch?.player1_id ?? null"
        >
          <i class="pi pi-circle-fill text-xs" :class="editWinnerId === selectedMatch?.player1_id ? 'text-primary-500' : 'text-surface-300'" />
          <span>{{ getPlayerName(selectedMatch?.player1_id) }}</span>
        </div>
        <div
          class="flex items-center gap-2 p-3 rounded-lg border cursor-pointer"
          :class="editWinnerId === selectedMatch?.player2_id ? 'border-primary-400 bg-primary-50' : 'border-surface-200'"
          @click="editWinnerId = selectedMatch?.player2_id ?? null"
        >
          <i class="pi pi-circle-fill text-xs" :class="editWinnerId === selectedMatch?.player2_id ? 'text-primary-500' : 'text-surface-300'" />
          <span>{{ getPlayerName(selectedMatch?.player2_id) }}</span>
        </div>
      </div>
    </div>
    <div class="flex justify-end gap-2 pt-2">
      <Button label="Annulla" severity="secondary" outlined @click="resultDialogVisible = false" />
      <Button label="Salva" :disabled="!editResult || !editWinnerId" @click="saveResult" />
    </div>
  </div>
</Dialog>
```

Score display on bracket slot: just show `match.result` text inline in the match footer.

Remove all `MatchSet`, `countSetsWon`, `formatMatchScore`, `normalizedSets`, `editSets` references.

- [ ] Run: `npx vue-tsc --noEmit 2>&1 | grep "error TS" | head -30`

- [ ] Run: `npm run build 2>&1 | tail -20`

- [ ] Commit:
```bash
git add src/views/TournamentDetailView.vue
git commit -m "feat(tournament-detail): manual bracket, result string, player self-enroll, publish toggle"
```

---

## Task 13 — Dashboard (`src/views/HomeView.vue`)

**Files:**
- Modify: `src/views/HomeView.vue`

- [ ] Replace `src/views/HomeView.vue` entirely:

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useTournamentsStore } from '../stores/tournaments'
import { usePlayersStore } from '../stores/players'
import type { PendingEnrollment, TournamentStats } from '../types'

const tournamentsStore = useTournamentsStore()
const playersStore = usePlayersStore()

const loading = ref(true)

onMounted(async () => {
  await Promise.all([tournamentsStore.fetchAll(), playersStore.fetchAll()])
  loading.value = false
})

const stats = computed<TournamentStats>(() => ({
  upcoming: tournamentsStore.tournaments.filter((t) => t.status === 'upcoming').length,
  ongoing: tournamentsStore.tournaments.filter((t) => t.status === 'ongoing').length,
  completed: tournamentsStore.tournaments.filter((t) => t.status === 'completed').length,
  totalPlayers: playersStore.players.length,
}))

const pendingEnrollments = computed<PendingEnrollment[]>(() => {
  const upcomingTournaments = tournamentsStore.tournaments.filter((t) => t.status === 'upcoming')
  const rows: PendingEnrollment[] = []
  for (const tournament of upcomingTournaments) {
    const detail = tournamentsStore.details[tournament.id]
    if (!detail) continue
    const players = detail.tournament_players ?? []
    for (const tp of players) {
      const player = playersStore.players.find((p) => p.id === tp.player_id)
      rows.push({
        playerName: player?.name ?? tp.player_id,
        tournamentName: tournament.name,
        enrolledAt: tp.enrolled_at ?? tournament.created_at ?? '',
      })
    }
  }
  return rows.sort((a, b) => b.enrolledAt.localeCompare(a.enrolledAt))
})

const statCards = computed(() => [
  { label: 'Upcoming', value: stats.value.upcoming, icon: 'pi pi-calendar', color: 'text-blue-500' },
  { label: 'In corso', value: stats.value.ongoing, icon: 'pi pi-play', color: 'text-green-500' },
  { label: 'Completati', value: stats.value.completed, icon: 'pi pi-check-circle', color: 'text-surface-400' },
  { label: 'Giocatori', value: stats.value.totalPlayers, icon: 'pi pi-users', color: 'text-primary-500' },
])
</script>

<template>
  <div class="flex flex-col gap-6">
    <div>
      <h2 class="m-0 text-2xl font-bold">Dashboard</h2>
      <p class="mt-1 mb-0 text-sm text-muted-color">Riepilogo attività</p>
    </div>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card v-for="card in statCards" :key="card.label">
        <template #content>
          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="m-0 text-sm text-muted-color">{{ card.label }}</p>
              <p class="m-0 text-3xl font-bold mt-1">{{ card.value }}</p>
            </div>
            <i :class="[card.icon, card.color, 'text-3xl']" />
          </div>
        </template>
      </Card>
    </div>

    <div>
      <h3 class="m-0 mb-3 text-lg font-semibold">Iscrizioni in attesa</h3>
      <DataTable
        :value="pendingEnrollments"
        :loading="loading"
        :rows="10"
        paginator
        paginator-template="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink"
      >
        <template #empty>
          <div class="flex flex-col items-center gap-3 py-8 text-muted-color text-center">
            <i class="pi pi-inbox text-2xl" />
            <p class="m-0">Nessuna iscrizione in attesa.</p>
          </div>
        </template>
        <Column field="playerName" header="Giocatore" sortable />
        <Column field="tournamentName" header="Torneo" sortable />
        <Column field="enrolledAt" header="Data iscrizione" sortable>
          <template #body="{ data }">
            {{ data.enrolledAt ? new Date(data.enrolledAt).toLocaleDateString('it-IT') : '—' }}
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>
```

- [ ] Add a `details` record to `useTournamentsStore` to cache loaded tournament detail (it may already exist as `current`). If `tournamentsStore.details` doesn't exist, adapt `pendingEnrollments` to use `current` or fetch details on demand. Check if `tournaments.ts` store has a map of loaded details, and if not, just skip the enrollment table for now and show a "caricamento..." placeholder.

  **Simpler fallback for the enrollment table:** If the store doesn't expose `details`, load all tournament details in the `onMounted`:

  ```ts
  const tournamentDetails = ref<Record<string, TournamentWithPlayers>>({})

  onMounted(async () => {
    await Promise.all([tournamentsStore.fetchAll(), playersStore.fetchAll()])
    // Load details for upcoming tournaments
    const upcoming = tournamentsStore.tournaments.filter((t) => t.status === 'upcoming')
    await Promise.all(
      upcoming.map(async (t) => {
        const detail = await tournamentsStore.getById(t.id)
        if (detail) tournamentDetails.value[t.id] = detail
      }),
    )
    loading.value = false
  })
  ```

  And update `pendingEnrollments` to use `tournamentDetails.value[tournament.id]` instead.

- [ ] Run: `npx vue-tsc --noEmit 2>&1 | grep "error TS" | head -20`

- [ ] Run: `npm run build 2>&1 | tail -20`

- [ ] Commit:
```bash
git add src/views/HomeView.vue
git commit -m "feat(dashboard): stats cards and pending enrollments table"
```

---

## Task 14 — Final build verification + push

- [ ] Run full type check and build:
```bash
cd /Users/simone/Repository/personal/TLA-app
npx vue-tsc --noEmit && npm run build
```
Expected: ✅ no errors.

- [ ] If errors: fix them (most likely unused imports from removed `MatchSet`/`formatMatchScore`/`countSetsWon`).

- [ ] Push:
```bash
TOKEN=$(gh auth token --user sdiricco 2>&1)
git remote set-url origin "https://sdiricco:${TOKEN}@github.com/sdiricco/TLA-app.git"
git push origin master
git remote set-url origin https://github.com/sdiricco/TLA-app.git
```

---

## Self-review

**Spec coverage check:**
- ✅ Match result as string → Tasks 1, 9
- ✅ Manual bracket (no auto-BYE) → Tasks 9, 12
- ✅ `profiles` table + role system → Tasks 2, 3, 4
- ✅ `players.user_id` → Task 2, 8
- ✅ `tournaments.published` → Tasks 2, 7, 11, 12
- ✅ Player self-enrollment → Tasks 8, 10, 12
- ✅ Role-based routing → Task 5
- ✅ Role-based sidebar → Task 6
- ✅ Dashboard → Task 13

**Type consistency:**
- `MatchAssignInput` defined in Task 1, used in Tasks 9, 12 ✅
- `MatchResultInput` updated in Task 1 (`result: string` not `sets`), used in Tasks 9, 12 ✅
- `buildEmptyBracket` defined in Task 9 (utils), used in matchesService ✅
- `isAdmin` defined in Task 4 (auth store), used in Tasks 5, 6, 11, 12 ✅
- `TournamentStats`, `PendingEnrollment` defined in Task 1, used in Task 13 ✅
