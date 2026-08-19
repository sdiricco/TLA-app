# Product requirements

Status: initial baseline
Last reviewed: 2026-08-17

## Product goal

TLA helps tennis communities administer organizations, players and tournaments
from registration through draws, matches and final results. It serves public
visitors, registered players and organization administrators through the same
responsive application.

## Actors

| Actor | Primary needs |
|---|---|
| Guest | Explore public organizations, tournaments, draws and results without an account. |
| Player | Maintain an account, participate in organizations and view tournament activity. |
| Organization admin | Manage organization data, players, tournaments, phases, draws and results. |

Actors are capabilities rather than exclusive personas: the same authenticated
account can have a linked player profile and administer one or more
organizations.

Authorization in the UI is a usability aid only. Every protected mutation must
also be authorized by the API and database policies.

## Functional requirements

### Identity and access

| ID | Requirement | Acceptance criteria | Status | Verification |
|---|---|---|---|---|
| AUTH-001 | A user can register, sign in and sign out. | Invalid credentials show an actionable error; authenticated sessions survive navigation; logout removes local credentials. | Implemented | `e2e/auth.spec.ts` covers the public login form and registration entry. |
| AUTH-002 | A visitor can enter in guest mode. | Guest access requires no credentials and cannot use member-only or admin-only actions. | Implemented | `e2e/auth.spec.ts` covers entry and tournament navigation. |
| AUTH-003 | Admin-only operations are protected. | Non-admin users are redirected or denied in the UI, and the API independently rejects unauthorized mutations. | Partial | Add API authorization tests and route-level E2E coverage. |
| AUTH-004 | A new account selects a non-exclusive starting path. | A user can begin as player, organizer or explorer and later add the other capabilities without losing existing organization permissions. | Implemented | `e2e/onboarding.spec.ts` and `e2e/profile-capabilities.spec.ts`. |
| AUTH-005 | An authenticated user can delete their account. | Deletion requires explicit email confirmation, removes the Auth identity and personal content, anonymizes retained competition history and prevents organizations from becoming ownerless. | Implemented | `e2e/profile-capabilities.spec.ts` and `server/src/lib/supabaseAuth.test.ts`. |

### Organizations

| ID | Requirement | Acceptance criteria | Status | Verification |
|---|---|---|---|---|
| ORG-001 | Users can create or select an organization context. | The selected organization persists across reloads and scopes organization-owned data. | Implemented | Manual; automate selection persistence. |
| ORG-002 | Visitors can discover public organizations. | Search results expose only discoverable organizations and support joining or requesting access according to visibility. | Implemented | Manual; add API and E2E coverage. |
| ORG-003 | Organization admins can manage organization details and access requests. | Protected fields and request decisions are available only to authorized roles. | Partial | Manual; add permission matrix tests. |

### Players and tournaments

| ID | Requirement | Acceptance criteria | Status | Verification |
|---|---|---|---|---|
| PLAYER-001 | Admins can create, edit and browse player records. | A player can include ranking, club, contact and profile information; invalid input is rejected. | Implemented | Manual; add CRUD E2E coverage. |
| PLAYER-002 | An authenticated user can create a personal player profile. | The sports profile is linked to the account, preserves existing organization permissions and can be used for tournament enrollment. | Implemented | `e2e/profile-capabilities.spec.ts`. |
| PLAYER-003 | A user can maintain their own profile data. | Name, photo, date of birth, club and phone are editable without granting access to ranking or other players’ records. | Implemented | `e2e/profile-capabilities.spec.ts`. |
| TOUR-001 | Registered accounts can create global tournaments; club owners and admins can create club tournaments. | The creator becomes the scoped organizer; guests and ordinary club members cannot create competitions in contexts they do not administer. | Implemented | `e2e/auth.spec.ts` and server permission tests. |
| TOUR-002 | Admins can register players in a tournament. | Duplicate registration is prevented and the tournament roster reflects changes. | Implemented | Manual; add roster API tests. |
| TOUR-003 | Users can browse tournament information. | Guests and members can view permitted tournament lists, details, players and published results. | Implemented | Guest list entry is covered by `e2e/auth.spec.ts`. |
| TOUR-004 | Every tournament identifies its organizer. | The creator is stored as organizer, links to a public profile with their organized tournaments, can be used as a list filter and receives administration privileges scoped to that tournament. | Implemented | `e2e/tournament-organizer.spec.ts`. |

### Competition and matches

| ID | Requirement | Acceptance criteria | Status | Verification |
|---|---|---|---|---|
| DRAW-001 | Admins can configure tournament phases. | Supported phase settings are validated and stored in a deterministic order. | Implemented | Manual; add phase API tests. |
| DRAW-002 | Admins can generate round-robin groups and elimination brackets. | Generation uses the registered players and preserves seeds and phase constraints. | Implemented | Manual; add deterministic domain tests. |
| MATCH-001 | Admins can schedule matches and record outcomes. | Date, time, court, set scores, walkovers and retirements are represented consistently. | Implemented | Manual; add match API tests. |
| MATCH-002 | Completed matches advance competition state. | Winners and dependent matches update exactly once; invalid or conflicting results are rejected. | Partial | Add domain and API regression tests. |

### Community requests

| ID | Requirement | Acceptance criteria | Status | Verification |
|---|---|---|---|---|
| REQ-001 | Members can create and follow organization requests. | Requests support status, importance, descriptions, images and comments according to role. | Implemented | Manual; add request workflow tests. |

## Non-functional requirements

| ID | Area | Requirement | Target |
|---|---|---|---|
| NFR-001 | Accessibility | Core workflows are keyboard usable and expose accessible names, labels and focus states. | WCAG 2.2 AA for new or changed UI. |
| NFR-002 | Responsive UI | Core workflows work on mobile, tablet and desktop layouts. | No horizontal overflow at 360 px; primary actions remain reachable. |
| NFR-003 | Security | Secrets remain server-side; API authorization and Supabase RLS enforce the same access model. | No privileged operation relies only on frontend checks. |
| NFR-004 | Reliability | Critical user journeys have automated regression coverage. | E2E smoke tests on Chromium initially; expand by risk. |
| NFR-005 | Performance | Navigation and common list interactions remain responsive on representative data. | Define measurable budgets after production telemetry is available. |
| NFR-006 | Offline/PWA | The app is installable and static assets can be cached safely. | Offline mutations and conflict resolution are not promised yet. |

## Current exclusions

- Payments and tournament registration fees.
- Live chair-umpire scoring workflows.
- Automated federation ranking synchronization.
- Guaranteed offline data mutation and later conflict resolution.

These exclusions describe the current product boundary, not permanent product
decisions. Moving one into scope requires acceptance criteria and an owner.
