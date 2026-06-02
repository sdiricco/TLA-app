# TLA-App v2 — Roles, Bracket, Dashboard

**Date:** 2026-06-02  
**Status:** Approved

---

## 1. Overview

This spec covers five interconnected changes to TLA-App:

1. Match result stored as a free-text string instead of structured sets
2. Manual bracket filling (no auto-BYE or seeding logic)
3. Admin role via `profiles` table
4. Player role: registered users can view published tournaments and self-enroll
5. Admin dashboard with tournament stats and pending enrollments

---

## 2. Data Model Changes

### 2.1 New table: `profiles`

Links every Supabase auth user to an application role.

```sql
CREATE TABLE profiles (
  id    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name  TEXT,
  role  TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('admin', 'player'))
);
```

A trigger on `auth.users` INSERT creates the profile automatically with `role = 'player'`. Admins are promoted manually via the Supabase dashboard (set `role = 'admin'`).

RLS:
- Any authenticated user can read their own profile (`id = auth.uid()`)
- Only the service role (admin dashboard) can update `role`

### 2.2 `players` table — add `user_id`

```sql
ALTER TABLE players ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
```

When a user registers, a player record is created and linked via `user_id`. The admin can also link existing player records to a user manually. A user can have at most one linked player record.

### 2.3 `tournaments` table — add `published`

```sql
ALTER TABLE tournaments ADD COLUMN published BOOLEAN NOT NULL DEFAULT false;
```

Only tournaments with `published = true` are visible to players. Admins see all tournaments regardless.

### 2.4 `matches` table — replace `sets` with `result`

```sql
ALTER TABLE matches DROP COLUMN sets;
ALTER TABLE matches ADD COLUMN result TEXT NULL;
```

`result` is a free-text string entered by the admin (e.g. `"6-3 6-4"`, `"6-4 3-6 10-8"`). No format validation. The `winner_id` field remains for tracking advancement.

### 2.5 Frontend types (`src/types/index.ts`)

```ts
// Remove MatchSet interface
// Update Match:
interface Match {
  id: string
  tournament_id: string
  round: number
  position: number
  player1_id: string | null
  player2_id: string | null
  result: string | null        // replaces sets: MatchSet[]
  winner_id: string | null
  status: 'pending' | 'completed'
  created_at?: string
  updated_at?: string
}

// Remove MatchResultInput.sets, replace with:
interface MatchResultInput {
  result: string
  winner_id: string
}

// Add to User:
interface User {
  id: string
  email: string
  name?: string
  role: 'admin' | 'player'
}
```

---

## 3. Role System

### 3.1 Auth store

`useAuthStore` loads the user's profile from `profiles` after login/init and stores `role` on the `user` object.

```ts
async function init(): Promise<void> {
  const authUser = await authService.getCurrentUser()
  if (authUser) {
    const profile = await profilesService.getMyProfile()
    user.value = { ...authUser, role: profile.role }
  }
}
```

A computed helper `isAdmin` is exported from the store for use in components and guards.

### 3.2 Router guards

Each protected route carries `meta`:

```ts
{ path: '/',          meta: { requiresAuth: true } }
{ path: '/dashboard', meta: { requiresAuth: true, requiresAdmin: true } }
{ path: '/players',   meta: { requiresAuth: true, requiresAdmin: true } }
{ path: '/tournaments', meta: { requiresAuth: true } }   // both roles
{ path: '/tournaments/:id', meta: { requiresAuth: true } } // both roles
```

Guard logic:
- Not authenticated → `/login`
- `requiresAdmin` and role is `player` → `/tournaments`
- Root `/` redirects to `/dashboard` for admin, `/tournaments` for player

### 3.3 Sidebar per role

**Admin:** Dashboard · Tornei · Giocatori  
**Player:** Tornei only

---

## 4. Tournament: Published Flag

### Admin view
- Tournament cards show a "Bozza" badge when `published = false`
- Detail header shows a "Pubblica" / "Nascondi" toggle button (admin only)

### Player view
- Only `published = true` tournaments are returned by the API/service
- Player can see tournament detail and their enrollment status

---

## 5. Player Self-Enrollment

A player can enroll/withdraw from a published tournament if:
- The tournament status is `upcoming`
- They have a linked player record (`user_id` matches)

The "Iscritti" tab on the tournament detail page:
- **Admin:** shows full player management (add any player, remove, reorder seeds)
- **Player:** shows a single "Iscriviti" / "Ritirati" button plus the current enrollee list (read-only)

If a player account has no linked `players` record, a warning is shown: "Profilo giocatore non configurato, contatta l'amministratore."

---

## 6. Bracket (Manual Fill)

The automatic draw generation (`generateDraw`) is removed. The bracket is filled entirely by the admin.

### Structure
The bracket grid is `round × position` slots. The number of rounds is derived from the number of enrolled players (`ceil(log2(n))`). Match records (with no players assigned) are created when the admin clicks **"Crea tabellone vuoto"** (replaces the old "Genera tabellone" button). This button is disabled if matches already exist.

### Admin bracket interactions
1. **Assign player to slot:** Admin clicks an empty slot → dropdown list of enrolled players not yet placed in that round → select to assign.
2. **Enter result:** Admin clicks a match with both players assigned → dialog with:
   - Free-text `result` input (e.g. `"6-3 6-4"`)
   - Radio/select for winner (Player 1 or Player 2)
   - Save → match status = `completed`, `winner_id` set
3. **Clear slot:** Admin can remove a player from a slot (reverts match to pending, clears winner if set).
4. **Reset bracket:** Existing "Azzera tabellone" button removes all matches for the tournament.

### Player bracket view
Read-only. Sees assigned players and results. Cannot interact.

### No auto-BYE logic
BYE slots are not auto-generated. If a player has no opponent, the admin leaves the slot empty and manually advances the player by assigning them to the next round slot.

---

## 7. Dashboard (Admin Only)

### Tournament stats — 4 cards
| Card | Value |
|------|-------|
| Upcoming | count of tournaments with `status = 'upcoming'` |
| In corso | count with `status = 'ongoing'` |
| Completati | count with `status = 'completed'` |
| Totale giocatori | count of rows in `players` |

### Pending enrollments table
Columns: Giocatore · Torneo · Data iscrizione  
Filter: only enrollments in tournaments with `status = 'upcoming'`  
Sorted by date descending.

---

## 8. Mock Support

All changes are mirrored in the MSW mock layer:
- `profiles` mock: hardcoded admin user gets `role = 'admin'`, all others `role = 'player'`
- `tournaments` mock: adds `published` field; player requests filter by `published = true`
- `matches` mock: `sets` replaced with `result: string | null`

---

## 9. Supabase Migrations

New migration file: `20260602200000_v2_roles_bracket_dashboard.sql`

Contents:
1. Create `profiles` table + trigger
2. `ALTER TABLE players ADD COLUMN user_id`
3. `ALTER TABLE tournaments ADD COLUMN published`
4. `ALTER TABLE matches DROP COLUMN sets; ADD COLUMN result TEXT`
5. Update RLS policies for role-based access

---

## 10. Out of Scope

- Email verification flow (Supabase handles this natively; no custom UI needed)
- Password reset UI
- Admin UI to promote users to admin (done via Supabase dashboard)
- Double elimination and round-robin bracket logic (unchanged)
