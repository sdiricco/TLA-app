# AGENTS.md

Instructions for coding agents working in this repository. This file applies to
the whole repository; a more deeply nested `AGENTS.md` overrides it for that
subtree.

## Project overview

TLA is a tennis league and tournament administration application.

- Frontend: Vue 3, TypeScript, Vite, Pinia, Vue Router, PrimeVue and Tailwind CSS.
- Backend: Express 5 and TypeScript under `server/`.
- Data and authentication: Supabase/PostgreSQL, with Prisma metadata under
  `server/prisma/`.
- Local frontend development uses MSW when `VITE_API_URL` is not set.
- PWA/mobile packaging uses Vite PWA and Capacitor.

Use `README.md` for setup and `docs/` for product and architecture context.
Some older documentation may lag behind the implementation, so confirm claims
against the current code before relying on them.

## Repository map

- `src/views/`: route-level Vue components.
- `src/components/`: reusable UI components.
- `src/stores/`: Pinia state and domain logic.
- `src/services/`: frontend API clients.
- `src/mocks/`: MSW handlers and mock data.
- `src/types/`: shared frontend types.
- `server/src/routes/`: Express API routes.
- `server/src/middleware/`: authentication and authorization middleware.
- `server/src/lib/`: backend domain logic and Supabase integration.
- `server/prisma/`: Prisma schema.
- `supabase/migrations/`: ordered database migrations.
- `docs/`: architecture, requirements, specifications and implementation plans.

## Setup and commands

Use npm as the default package manager because the documented workflow and
scripts use npm. Do not update `yarn.lock` unless the task explicitly targets
Yarn.

```bash
npm install
npm run dev
npm run dev:server
npm run build
npm run build:server
npm run build:all
npm run commitlint -- --from HEAD~1 --to HEAD --verbose
npm run prisma:generate
npm run prisma:format
npm run release:dry-run
```

There is currently no dedicated application test or code-lint script. For
ordinary changes, run the narrowest relevant build; run `npm run build:all`
when a change crosses the frontend/backend boundary. Report any validation that
could not be run.

## Commits and releases

- Use Conventional Commits: `type(scope?): concise description`.
- Allowed types are `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`,
  `refactor`, `revert`, `style` and `test`.
- Keep the subject imperative, concise and lowercase; use a scope when it adds
  useful domain context, for example `feat(tournaments): add doubles brackets`.
- Mark breaking changes with `type(scope)!:` or a `BREAKING CHANGE:` footer.
- Husky runs Commitlint through `.husky/commit-msg`. Do not bypass the hook
  unless the user explicitly requests it and the reason is reported.
- Pull request titles must also follow Conventional Commits because squash
  merges may make the title the release commit.
- Semantic Release runs only from `master`, after `npm run build:all`, and
  creates `v<version>` Git tags and GitHub Releases. It does not publish to npm
  or commit generated version files.
- Release impact is `fix` = patch, `feat` = minor and breaking change = major.
  Other allowed types do not create a release by default.
- Do not manually create release tags, edit versions for a release or publish a
  GitHub Release unless the user explicitly asks to override the automated
  workflow.

## Working conventions

- Keep TypeScript strict and leave no unused locals or parameters.
- Follow the style of the file being edited; avoid unrelated formatting churn.
- Prefer the `@/` alias for imports from `src/`.
- Keep route components in `views`, reusable presentation in `components`,
  shared state in Pinia stores and HTTP access in `services`.
- Preserve HTML comments that label sections in Vue templates: they are used to
  scan and navigate long templates quickly. When adding or restructuring a
  multi-section template, add concise `<!-- Section: ... -->` comments for its
  major blocks, update them when sections move and remove them only when the
  corresponding section no longer exists.
- Keep API authorization enforcement on the server even when the UI also hides
  or disables an action.
- Reuse existing domain types, serializers and API helpers before introducing
  parallel representations.
- Update relevant documentation when behavior, setup or architecture changes.
- Do not edit generated PWA files in `dev-dist/` by hand.
- Preserve unrelated working-tree changes and do not commit, push or deploy
  unless explicitly requested.

## Frontend conventions

- Prefer Tailwind utility classes directly in Vue templates for layout,
  spacing, typography, responsive behavior and visual states. Add scoped CSS
  only when utilities cannot express the requirement clearly, such as complex
  animations or unavoidable third-party component internals.
- Prefer Tailwind's standard responsive variants (`sm`, `md`, `lg`, `xl`) and
  stepped spacing/type utilities over arbitrary breakpoints or fluid `clamp()`
  expressions. Use arbitrary values only for genuine geometry, safe-area or
  viewport constraints that the design system cannot represent clearly.
- Use the existing theme tokens and Tailwind/PrimeVue color utilities instead
  of introducing component-local color values or parallel design tokens.
- Prefer PrimeVue primitives for standard controls such as buttons, chips,
  badges, drawers and form fields instead of rebuilding equivalent controls
  with native markup.
- Prefer established VueUse composables for common reactive behaviors such as
  debouncing, throttling, event listeners and lifecycle-aware browser APIs
  instead of maintaining equivalent timers or cleanup logic manually.
- Use Moment for application date parsing and formatting instead of manual
  `Date` field extraction or scattered locale formatting. Keep API formats and
  user-facing locales explicit at the call site.
- Structure long `<script setup>` blocks with concise section comments for
  imports, types, state, derived state, helpers, actions and lifecycle effects.
  Explain non-obvious intent and behavior, but avoid comments that merely
  restate the following line of code.
- Keep route views focused on orchestration, store access, filtering and
  navigation. Extract substantial or reusable presentation blocks, especially
  list items, filter drawers, loading skeletons and empty states, into focused
  components with typed props, models and events.
- Avoid extracting tiny one-off fragments when doing so would obscure the
  template rather than make it easier to scan and maintain.

## Supabase and database safety

- Follow the repository skills in `.agents/skills/` for every Supabase or
  PostgreSQL task.
- Never expose service-role or secret keys to frontend code. Frontend variables
  must use the intended publishable credentials.
- Enable and review RLS for tables in exposed schemas. Policies must enforce
  ownership or the actual access model, not authentication alone.
- Treat existing migration files as immutable. Create a new migration for
  schema changes using the installed Supabase CLI workflow; discover CLI syntax
  with `--help` rather than guessing.
- Review both `USING` and `WITH CHECK` for update policies, and avoid using
  `SECURITY DEFINER` merely to bypass permission failures.
- Verify schema/auth changes against the relevant current Supabase
  documentation and with a focused query or check.

## Change checklist

Before handing work back:

1. Inspect the diff and remove accidental or generated changes.
2. Run the relevant frontend/backend build and any focused checks available.
3. Check that secrets, credentials and local environment files are not included.
4. Summarize changed files, user-visible behavior and validation results.
