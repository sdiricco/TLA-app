# Architecture

## Runtime overview

TLA is a Vue single-page application backed by an Express API and
Supabase/PostgreSQL. During frontend-only development, Mock Service Worker
(MSW) handles supported `/api/*` requests when `VITE_API_URL` is not set.

```text
Vue 3 application
  -> Pinia stores
  -> typed services / Axios
  -> MSW handlers (frontend-only development)
     or Express API (integrated environments)
        -> domain helpers
        -> Supabase Auth and PostgreSQL
```

The UI may hide actions based on role, but authorization is enforced again in
Express middleware and Supabase row-level security policies.

## Identity and capabilities

Authentication, personal identity, sports identity and organization access are
separate concerns:

- `auth.users` is owned by Supabase Auth and stores credentials and sessions.
- `profiles` is the application identity for an authenticated account. Its
  `name` is the canonical display name used by the UI.
- `players` stores sports records used by registrations, matches, rankings and
  statistics. A player may be linked to a profile, but standalone player rows
  are valid when a club manages athletes without accounts.
- `organization_memberships` grants an account a scoped `owner`, `admin` or
  `member` capability in one organization.
- `tournaments.organizer_profile_id` identifies the person who created and
  presents a tournament. This attribution is public inside the permitted
  tournament scope and grants administration privileges only on that tournament.

Any registered account can create a global tournament and becomes its scoped
organizer. Creating a tournament in an organization instead requires an
`owner` or `admin` membership in that organization. Guests cannot create
tournaments, and platform administrator privileges remain exceptional.

Player and organizer are therefore compatible capabilities, not mutually
exclusive account roles. `profiles.role` is retained for the exceptional
platform-wide administrator permission; ordinary organization permissions come
from memberships. `onboarding_intent` records the user's starting path and must
not be used for authorization.

### Platform administration and "login as"

Platform administrators (`profiles.role = 'admin'`) land after sign-in on the
backoffice at `/admin`: a standalone page outside the app shell (no app
navigation or in-app tools) that lists users and offers "Entra nell'app" to use
the app with the admin's own account. Tournament configuration stays in the
app's settings. The backoffice is backed by `/api/admin/*` (`requirePlatformAdmin`: club roles never
qualify). User creation and deletion go through the Supabase Auth Admin API and
need `SUPABASE_SECRET_KEY` on the server.

An administrator can use the app as another non-admin user. The client keeps
the target id in `sessionStorage` and sends it as the `X-Impersonate-User-Id`
header next to the admin's own bearer token. `requireAuth` verifies the token,
re-reads the caller's role from the database on every request, and only then
replaces `req.authUser` with the target, keeping the real caller in
`req.impersonator`. Every existing permission check therefore evaluates the
impersonated user. `/auth/me` returns the impersonator so the UI shows a
permanent banner; admin tools and account deletion are refused while
impersonating, and each start is logged by the server. Supabase Storage
uploads still forward the admin's token, so files uploaded during an
impersonation belong to the admin in Storage.

## Source boundaries

| Path | Responsibility |
|---|---|
| `src/views/` | Route-level orchestration and navigation. |
| `src/components/` | Reusable presentation and interaction blocks. |
| `src/stores/` | Pinia state and frontend domain coordination. |
| `src/services/` | Typed HTTP clients, authentication and token handling. |
| `src/mocks/` | Deterministic MSW data and request handlers for local development. |
| `server/src/routes/` | Express HTTP endpoints and request-level authorization. |
| `server/src/lib/` | Backend domain logic, serialization and Supabase integration. |
| `server/prisma/` | Prisma schema and generated-client metadata. |
| `supabase/migrations/` | Immutable ordered PostgreSQL schema changes and RLS policies. |
| `e2e/` | Playwright browser tests. |

## Frontend navigation

Vue Router defines public login and registration routes plus an authenticated
application shell. Guards initialize authentication, load organization context
and enforce guest/admin navigation rules. Feature routes cover organizations,
requests, tournaments, matches, players, profile and settings.
Organizers have a dedicated public profile route that lists the tournaments
attributed to them without exposing account email or private profile data.

## Data flow

Views call Pinia actions, stores delegate HTTP access to services, and services
normalize API data into shared TypeScript types. When MSW is enabled, requests
stay in the browser. Integrated environments direct the same service calls to
Express via `VITE_API_URL`.

Schema changes are delivered as new Supabase migrations. Existing migrations
remain immutable so deployed environments share an auditable history.
