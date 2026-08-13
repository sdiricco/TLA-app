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

## Data flow

Views call Pinia actions, stores delegate HTTP access to services, and services
normalize API data into shared TypeScript types. When MSW is enabled, requests
stay in the browser. Integrated environments direct the same service calls to
Express via `VITE_API_URL`.

Schema changes are delivered as new Supabase migrations. Existing migrations
remain immutable so deployed environments share an auditable history.
