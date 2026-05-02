# Clasd — Chunk 7a

Features + polish + Playwright tests. Chunk 7b will handle deploy + journey log.

## How to apply this chunk

1. **`npm install`** — adds `@playwright/test` (one new dev dependency).
2. **`npx playwright install chromium`** — downloads the browser binaries Playwright needs.
3. **Run the migration**: `supabase/migrations/00007_form_customization.sql` (adds button_text + success_title + success_message to signup_forms).
4. **Drop the files in**, overwriting where prompted.

### Files in this chunk

```
app/
├── (app)/
│   ├── dashboard/page.tsx                  [REPLACES — explicit subscriber/campaign/activity sections]
│   ├── forms/
│   │   ├── actions.ts                      [REPLACES — handles new fields + limit fix]
│   │   ├── form-builder.tsx                [NEW — full builder with customise section]
│   │   ├── new/page.tsx                    [REPLACES — uses new builder]
│   │   └── [id]/edit/page.tsx              [REPLACES — uses new builder]
│   ├── settings/
│   │   ├── page.tsx                        [REPLACES — adds danger zone]
│   │   └── danger-zone.tsx                 [NEW — delete account UI]
│   ├── students/[id]/page.tsx              [REPLACES — adds activity timeline]
│   └── layout.tsx                          [REPLACES — adds mobile nav]
├── api/delete-account/route.ts             [NEW — cascades user data delete]
└── f/[slug]/                               [REPLACES — uses new customisation fields]
    ├── page.tsx
    └── form-client.tsx

components/
└── mobile-nav.tsx                          [NEW — mobile drawer nav]

e2e/                                        [NEW — full Playwright suite]
├── README.md
├── _helpers.ts
├── auth.spec.ts
├── campaigns.spec.ts
├── classes.spec.ts
├── forms.spec.ts
├── segments.spec.ts
├── settings-dashboard.spec.ts
└── students.spec.ts

package.json                                [REPLACES — adds @playwright/test + test scripts]
playwright.config.ts                        [NEW]
types/database.ts                           [REPLACES — new SignupForm fields]
supabase/migrations/00007_form_customization.sql  [NEW]
```

## What's in this chunk

### Feature 1: Form customisation
- New "Customise appearance" section in the form builder
- **Primary color** picker (existing field, now with proper UI)
- **Button text** — defaults to "Sign up", configurable
- **Success title** + **success message** — what shows after a submission
- All four fields apply on the public form at `/f/[slug]`

### Feature 2: Subscriber activity timeline
- Student detail page now shows a chronological timeline merging:
  - Account created event
  - Enrolments (joined which class, when)
  - Emails sent (campaign or auto-reminder)
  - Email events from `delivery_events` (delivered, opened, clicked, bounced, complained)
  - Unsubscribe event
- Each entry has an icon, label, and "X minutes ago" timestamp
- Renders as a vertical timeline with connector line

### Feature 3: Account danger zone
- New section at the bottom of Settings page
- Two-step confirmation: click "Delete account" to expand → type your email to confirm → "Permanently delete" button (disabled until email matches) → final native confirm dialog
- `POST /api/delete-account` cascade-deletes:
  1. delivery_events, scheduled_messages, campaigns, segments
  2. attendance, enrolments, signup_forms
  3. class_sessions, classes, students
  4. profiles
  5. auth.users (via admin API — also revokes session)
- After deletion, user is bounced to `/?deleted=1`

### Feature 4: Dashboard polish
Now explicitly covers all three spec requirements:
- **Subscriber counts**: 4 stat cards (subscribed students, active classes, upcoming sessions, campaigns sent) with new-this-week sub-counts
- **Campaign stats**: aggregated card showing total recipients, delivered, open rate %, bounced
- **Recent activity**: two side-by-side cards (recent enrolments, recent campaigns) plus an "Coming up" sessions card
- Empty state for fresh accounts with no data
- Pending queue alert when there are messages ready to send

### Feature 5: Mobile responsiveness
- New mobile header at top of every authenticated page (only shows on screens <768px)
- Hamburger menu opens a left-side drawer with all nav items + sign-out
- Drawer auto-closes on navigation
- Body scroll locks when drawer is open
- Pre-existing responsive Tailwind classes throughout the app already handle the rest

### Feature 6: Playwright e2e tests (~16 tests)
Light pass covering the major happy paths:
- **Auth (5)**: marketing page, login, session persistence, redirect handling, invalid credentials
- **Classes (2)**: create + archive + restore, calendar URL
- **Students (2)**: dedup-on-resubmit, activity timeline visible
- **Forms (1)**: build + customise + public submit creates student
- **Campaigns (1)**: create from template + edit + delete
- **Segments (2)**: builder structure, preview evaluation
- **Settings/Dashboard (3)**: dashboard sections present, settings sections, danger zone interaction

Tests are sequential (single shared test user), run against your live dev server (no separate test DB), and Chromium-only.

## Setup needed for tests

1. Sign up at `/signup` with `playwright@clasd.test` / `playwright-test-pw-123` (or set your own via `PLAYWRIGHT_TEST_EMAIL` / `PLAYWRIGHT_TEST_PASSWORD` env vars)
2. Run `npx playwright install chromium` once

See `e2e/README.md` for full instructions.

## Test the milestone

### Manual feature tests

1. ✅ Run migration `00007_form_customization.sql`.
2. ✅ `npm install`.
3. ✅ `npm run dev`.

**Form customisation:**

4. ✅ Forms → New form → fill in name and slug → notice the "Customise appearance" card
5. ✅ Change "Button text" to "Count me in" → "Success title" to "Got it!" → save
6. ✅ Open the public form URL → button reads "Count me in" → submit → success page reads "Got it!"

**Activity timeline:**

7. ✅ Open any student's detail page → see the "Activity" card with at least "Added to your audience" event
8. ✅ For a student who's enrolled and received an email → see the enrolment event + email events ordered by time

**Danger zone:**

9. ✅ Settings → scroll to bottom → see red-bordered "Danger zone" card
10. ✅ Click "Delete account" → form expands with email confirmation → "Permanently delete account" button is disabled
11. ✅ Type your email → button enables → click → native confirm dialog → cancel (don't actually delete!)
12. ✅ Click "Cancel" instead → form collapses, your account is fine

**Dashboard:**

13. ✅ Dashboard shows 4 stat cards at top (subscribed students, classes, upcoming sessions, campaigns sent)
14. ✅ If you have sent campaigns, see the "Campaign performance" card with delivered / open rate / bounced
15. ✅ See "Recent enrolments" and "Recent campaigns" cards side-by-side
16. ✅ See "Coming up" card with next 5 sessions

**Mobile responsiveness:**

17. ✅ Open dev tools → toggle device toolbar → set to phone-width (e.g. 375px)
18. ✅ Top of page now shows mobile header with hamburger
19. ✅ Click hamburger → drawer slides in with all nav items
20. ✅ Click a nav item → drawer closes, navigates
21. ✅ Tap outside the drawer → drawer closes

### Playwright tests

22. ✅ Sign up at `/signup` with `playwright@clasd.test` / `playwright-test-pw-123`
23. ✅ `npx playwright install chromium` (one-time)
24. ✅ Keep `npm run dev` running in one terminal
25. ✅ In another terminal: `npm test`
26. ✅ All ~16 tests should pass. If any fail, check `e2e/README.md` for setup gotchas.

## Known issues / things to know

- **Tests share one user account** — they accumulate data each run. Periodically clear via Settings → Danger Zone (and re-create the account), or run a SQL cleanup. Not a problem for the test logic, just hygiene.
- **The student dedup test** creates two student records with the same email; if your test account already has a student with email matching `student-{suffix}@test.local` for some reason (unlikely with the unique suffix), the assertion may need an extra moment.
- **`segments.spec.ts` doesn't test full creation** — segments are a Pro feature so the create-action would fail on a Free account. Tests exercise the builder UI structure, which is plan-agnostic.
- **No tests for paid flow / Polar** — checkout requires real network calls to sandbox.polar.sh, mocking it out adds significant complexity for limited gain. Tested manually in Chunk 6 sign-off.

## What I cut for scope (deliberate)

- **Custom attributes in segments** — still deferred. Real Pro power-user feature; spec doesn't require it.
- **Schedule-for-later UI** — infrastructure exists, no picker. Same.
- **Email preview improvements** — current preview is functional; no scope to deepen.

## Up next: Chunk 7b

Deploy + journey log:
- `vercel.json` with cron schedule
- Production env vars walkthrough (Supabase prod project, Resend domain, Polar prod product)
- Vercel deploy walkthrough
- Resend domain verification — finally unblocks multi-recipient testing
- Smoke test on the deployed URL
- Journey log markdown for Flavio
