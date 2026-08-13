# End-to-end testing

TLA uses Playwright for browser-level regression tests. The initial suite runs
against Chromium and starts the Vite development server automatically. With no
`VITE_API_URL`, the frontend uses MSW, so the smoke suite needs neither the
Express server nor Supabase credentials.

## First-time setup

Install JavaScript dependencies and the Chromium binary:

```bash
npm install
npx playwright install chromium
```

Linux CI images may instead need `npx playwright install --with-deps chromium`.

## Commands

```bash
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:report
```

The standard command starts Vite on `127.0.0.1:4173`. Failed tests retain a
trace, screenshot and video under `test-results/`; the HTML report is written to
`playwright-report/`. Both directories are ignored by Git.

## Test design

- Keep specs under `e2e/` and name files after user-facing capabilities.
- Prefer accessible locators such as roles and labels over CSS selectors.
- Reset browser storage before scenarios that depend on authentication state.
- Test outcomes visible to a user, not Vue component internals.
- Use MSW for deterministic frontend journeys. Add a separate integration
  project before testing the real Express/Supabase stack so the environments
  cannot be confused.

The first suite covers `AUTH-001`, `AUTH-002` and the guest entry to `TOUR-003`.
