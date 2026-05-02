# Clasd E2E Tests

Light Playwright pass covering the major flows. Chromium-only.

## Setup (one-time)

1. **Install Playwright** (already in package.json devDependencies):
   ```bash
   npm install
   npx playwright install chromium
   ```

2. **Create a test account.** Sign up at `/signup` with these credentials (the defaults the helpers use):
   - Email: `playwright@clasd.test`
   - Password: `playwright-test-pw-123`

   Or set your own via env vars:
   ```bash
   export PLAYWRIGHT_TEST_EMAIL="your-test@email.com"
   export PLAYWRIGHT_TEST_PASSWORD="your-test-password"
   ```

3. **Make sure the test account is on the free plan** (the segment limit-check tests rely on this).

## Running

In one terminal, start the dev server:
```bash
npm run dev
```

In another terminal, run the tests:
```bash
# Run all
npm test

# Run a single file
npx playwright test e2e/auth.spec.ts

# Run with browser visible (slower but useful for debugging)
npm run test:headed

# Open the Playwright UI explorer
npm run test:ui
```

## Test inventory

- `auth.spec.ts` — marketing page, login, session persistence, redirects (5 tests)
- `classes.spec.ts` — create/archive/restore, calendar URL (2 tests)
- `students.spec.ts` — create + dedup, activity timeline (2 tests)
- `forms.spec.ts` — build + customise + public submit (1 test)
- `campaigns.spec.ts` — create from template, edit, delete (1 test)
- `segments.spec.ts` — builder structure, preview evaluation (2 tests)
- `settings-dashboard.spec.ts` — dashboard sections, settings + danger zone (3 tests)

Total: ~16 tests covering the major happy paths.

## Why no mocked external services

Resend, Polar, and Supabase Auth all run "for real" against your dev environment. We don't mock them because:
- The tests don't trigger real sends (no campaign sending in the suite)
- Polar isn't exercised at all (paywall checkout flow tested manually)
- Supabase Auth uses your local dev project and a dedicated test account

If you want to add tests that DO send emails or make Polar calls, use `page.route()` to intercept those network requests and return mock responses. Out of scope for this pass.

## Caveats

- Tests run **sequentially** (not parallel) because they share a single test user account.
- The test account accumulates data over runs — periodically delete its data via Settings → Danger Zone, or use SQL to clear `students`, `classes`, etc. for that user_id.
- The `forms.spec.ts` test creates a public submission; the resulting student persists in your test account.
- If a test fails partway through and leaves stale data, subsequent runs may hit unique-constraint errors on slugs. The `uniqueSuffix()` helper minimises this.
