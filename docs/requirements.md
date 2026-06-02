# Requirements

## Functional Requirements

### Tournament Management
- Create, edit and delete tournaments
- Configure tournament details: name, date, location, category, format
- Support multiple tournament formats:
  - Single elimination (knockout)
  - Double elimination
  - Round robin (all-play-all)
  - Round robin + knockout (group stage + final bracket)
- Support singles and doubles categories

### Player Management
- Add, edit and remove players from the registry
- Player profile: name, ranking, club, contact info
- Associate players to a specific tournament

### Draw & Brackets
- Automatically generate a draw based on registered players
- Support seeding (place top-ranked players in non-overlapping bracket halves)
- Manual draw adjustment before the tournament starts
- Visual bracket/draw display

### Match Management
- Schedule matches with date, time and court
- Record match results (score by set)
- Mark walkovers and retirements
- Automatically advance winners through the bracket

### Standings & Rankings
- Show real-time standings for round-robin phases
- Display final rankings at the end of a tournament

---

## Non-Functional Requirements

| Area | Requirement |
|---|---|
| **Usability** | Responsive design — usable on desktop and tablet |
| **Performance** | Bracket and standings updates feel instant (< 100 ms) |
| **Offline** | Core features work without an internet connection (localStorage) |
| **Persistence** | Tournament data survives page reload |
| **Accessibility** | Keyboard-navigable UI, sufficient color contrast |

---

## Out of Scope (v1)

- User authentication / multi-user accounts
- Server-side data storage or sync
- Live scoring from a mobile device
- Umpire / referee workflows
- Payment or registration fees
