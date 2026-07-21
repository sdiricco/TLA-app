# TLA App — Tennis League Administration

TLA App is a client-side web application for **organising and managing tennis tournaments**. The current frontend is built with Vue and Vite; a separate Node/Express backend can now be introduced for auth and business APIs.

## Features at a glance

- 🎾 Create and manage tournaments (knockout, round-robin, or mixed formats)
- 👤 Player registry with seeding support
- 🏆 Automatic draw generation with manual adjustment
- 📊 Real-time standings and bracket visualisation
- 💾 Offline-capable — data persists via `localStorage`

## Getting started

```bash
npm install
npm run dev
```

## Backend

The backend entrypoint lives under `server/` and currently exposes:

- `GET /api/health`
- `POST /api/auth/login`
- `POST /api/auth/register`
- `POST /api/auth/logout`
- `GET /api/auth/me` with a Supabase bearer token
- `GET /api/auth/profile`
- `GET /api/health/db` when `DATABASE_URL` is configured

Run it with:

```bash
npm run dev:server
```

The frontend reads `VITE_API_URL` to send auth traffic to Express, while the existing mock layer still covers the remaining `/api/*` data routes until we migrate them one by one.

## Fly.io Deploy

The backend is prepared for Fly.io with:

- `Dockerfile`
- `fly.toml`
- server listening on `PORT` when present

Before deploying, set these Fly secrets:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `DATABASE_URL`
- `CORS_ORIGIN` is optional while we keep CORS open during this phase

Then deploy with:

```bash
fly launch
fly secrets set SUPABASE_URL=... SUPABASE_ANON_KEY=... DATABASE_URL=...
fly deploy
```

## Database

The backend is prepared to use Prisma with PostgreSQL. The current schema covers:

- `Profile`
- `Player`
- `Tournament`
- `TournamentPlayer`
- `Match`

User roles are stored in `profiles.role` and resolved by the backend.

Generate the Prisma client with:

```bash
npm run prisma:generate
```

## Releases

Commit messages and pull request titles follow
[Conventional Commits](https://www.conventionalcommits.org/):

```text
feat(tournaments): add doubles brackets
fix(auth): refresh expired sessions
docs: explain the release workflow
```

Husky and Commitlint validate new commits locally, while GitHub Actions validates
pull request titles and commits. Pushes to `master` run a full build and then
Semantic Release determines the next version:

- `fix` produces a patch release.
- `feat` produces a minor release.
- `BREAKING CHANGE` in the footer, or `!` after the type/scope, produces a major
  release.

Releases are published as Git tags and GitHub Releases with generated notes.
This private application is not published to npm. Run `npm run release:dry-run`
with a suitable GitHub token when release analysis must be tested locally.

## Documentation

| Document | Description |
|---|---|
| [Technologies](docs/technologies.md) | Frontend stack and build tooling |
| [Architecture](docs/architecture.md) | Folder structure, layers and routing |
| [Requirements](docs/requirements.md) | Functional and non-functional requirements |
