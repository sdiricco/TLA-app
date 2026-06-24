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

## Documentation

| Document | Description |
|---|---|
| [Technologies](docs/technologies.md) | Frontend stack and build tooling |
| [Architecture](docs/architecture.md) | Folder structure, layers and routing |
| [Requirements](docs/requirements.md) | Functional and non-functional requirements |
