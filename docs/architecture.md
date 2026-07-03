# Architecture

## Overview

TLA App is a **Single Page Application (SPA)** built with Vue 3. All logic runs on the client; there is no backend server. Data persistence is handled via `localStorage` (or a future API integration).

## Folder Structure

```
src/
├── assets/          # Static assets (images, fonts, global styles)
├── components/      # Reusable UI components
├── views/           # Page-level components, one per route
├── router/          # Vue Router configuration and route definitions
├── stores/          # Pinia stores (global state)
└── style.css        # Global stylesheet
```

## Layers

```
┌─────────────────────────────────────┐
│              Views (pages)          │
│   route-level components            │
├─────────────────────────────────────┤
│            Components               │
│   reusable, stateless UI blocks     │
├─────────────────────────────────────┤
│          Pinia Stores               │
│   shared state & business logic     │
├─────────────────────────────────────┤
│         Vue Router                  │
│   client-side navigation            │
└─────────────────────────────────────┘
```

## State Management

Each domain area has its own Pinia store, keeping concerns separated:

| Store | Responsibility |
|---|---|
| `tournaments` | Tournament list, active tournament, creation/deletion |
| `players` | Player registry, stats |
| `matches` | Match results, scheduling |
| `draws` | Bracket/draw generation and state |

## Routing

Routes are organized by feature area:

| Path | View | Description |
|---|---|---|
| `/` | redirect | Landing route, forwards to `/tournaments` |
| `/tournaments` | `TournamentsView` | List of all tournaments |
| `/tournaments/:id` | `TournamentDetailView` | Single tournament detail |
| `/tournaments/:id/draw` | `DrawView` | Bracket/draw for a tournament |
| `/players` | `PlayersView` | Player registry |

> Routes will be added incrementally as features are implemented.
