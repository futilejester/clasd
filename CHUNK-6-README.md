# Clasd — Chunk 6

Polar paywall, embeddable signup widget, marketing homepage. Plus two bug fixes carried forward from Chunk 5.

## How to apply this chunk

1. **`npm install`** — adds `@polar-sh/sdk` (one new dependency).
2. **Run the migration**: `supabase/migrations/00006_polar_pending_checkout.sql` (just adds one column).
3. **Set up Polar** (full walkthrough below).
4. **Drop the files in**, overwriting where prompted.

### Polar setup

The pattern is identical to what we did in Mise en Place (Week 7) — no webhooks needed, we look up subscription status on the success redirect.

1. Sign up at **sandbox.polar.sh** (the sandbox env, NOT production polar.sh, for dev testing)
2. Create an **Organization**
3. Settings → **API Keys** → "New" → copy the access token (starts `polar_oat_...`)
4. **Products** → "New product" → recurring monthly subscription, e.g. £9/month → copy the Product ID

Then in `.env.local`:

```
POLAR_ACCESS_TOKEN=polar_oat_yourSandboxToken
POLAR_PRODUCT_ID_PRO=your-product-uuid
POLAR_SERVER=sandbox
```

When you're ready for production (Chunk 7 deploy), create a real account at polar.sh, repeat the Product setup, swap the env vars, and unset `POLAR_SERVER` (or set to `production`).

### Files in this chunk

```
app/
├── page.tsx                                [REPLACES — marketing homepage for logged-out]
├── (app)/
│   ├── settings/                           [NEW]
│   │   ├── page.tsx
│   │   ├── upgrade-button.tsx
│   │   └── cancel-button.tsx
│   ├── students/actions.ts                 [REPLACES — adds limit check]
│   ├── classes/[id]/auto-remind-actions.ts [REPLACES — fixes toggle re-enable]
│   ├── campaigns/page.tsx                  [REPLACES — fixes Run queue badge]
│   └── forms/[id]/page.tsx                 [NEW — adds embed code section]
├── api/
│   ├── checkout/route.ts                   [NEW]
│   ├── checkout/success/route.ts           [NEW]
│   └── cancel-subscription/route.ts        [NEW]
└── f/[slug]/                               [REPLACES — supports embed mode]
    ├── page.tsx
    └── form-client.tsx

components/
├── sidebar.tsx                             [REPLACES — adds Settings + Pro badge]
├── embed-code-card.tsx                     [NEW]
└── copy-link-button.tsx                    [NEW]

lib/
├── polar.ts                                [NEW]
└── limits.ts                               [NEW]

middleware.ts                               [REPLACES — allows framing on /f/?embed=1]

public/embed.js                             [NEW — what users paste on their sites]

package.json                                [REPLACES — adds @polar-sh/sdk]
.env.local.example                          [REPLACES — adds Polar env vars]
supabase/migrations/00006_polar_pending_checkout.sql  [NEW]
```

## What's in this chunk

### Polar paywall (poll-on-demand)
- **Settings page** with current plan, upgrade button (free), or cancel button (Pro).
- **Usage panel** showing students / emails this month / active forms / segments with counts vs free-tier limits.
- **`POST /api/checkout`** creates a Polar checkout, stashes the checkout ID on `profiles.pending_checkout_id`, returns the URL.
- **`GET /api/checkout/success`** is Polar's redirect target — looks up the pending checkout, finds the resulting subscription (with fallback to listing customer subscriptions), flips `profiles.plan` to `pro`.
- **`POST /api/cancel-subscription`** sets `cancelAtPeriodEnd = true` on Polar.
- **Free tier limits** enforced via `lib/limits.ts`:
  - 50 students
  - 100 emails sent / calendar month
  - 1 active signup form
  - 0 segments (Pro-only feature)
- Limits checked at action layer, returning `{ error, upgrade: true }` so callers can show an upgrade prompt.

### Embeddable signup widget
- **`/embed.js`** — static script that finds `<div data-clasd-form="slug">` and mounts an iframe pointing at `/f/{slug}?embed=1`.
- **Auto-resize** — the iframe posts `clasd-form:resized` messages on layout changes, parent script adjusts iframe height to match content.
- **Submission events** — on success, posts `clasd-form:submitted` to parent, so embedding sites can react (analytics events, custom redirects, etc).
- **Embed code card** on every form's detail page with copy button.
- **Middleware** strips `X-Frame-Options` and sets `frame-ancestors *` CSP for embed routes only — your other pages still can't be framed.

### Marketing homepage
- New landing page at `/` for logged-out users (logged-in users still redirect to `/dashboard`).
- Hero, three feature cards, "How it works" section, pricing block, footer.
- Pricing is hard-coded as £9/month for the Pro tier in the marketing copy — adjust to match your Polar product price.

### Sidebar updates
- Settings link in the sidebar bottom section.
- Pro badge in the user info area when on Pro plan.
- "Upgrade to Pro" link in the user info area when on free.

### Bug fixes carried forward
- **Run queue badge** now counts only `send_at <= now()` rows, matching what the queue actually fires.
- **Auto-reminder toggle off** now DELETES pending reminder rows rather than marking them cancelled, so toggling back on regenerates fresh rows. (Fixes the "queue empty after re-enable" issue from Chunk 5.)

## Test the milestone

Setup:

1. ✅ Sign up at sandbox.polar.sh, create a recurring monthly product, grab token + product ID.
2. ✅ Add `POLAR_*` env vars to `.env.local`.
3. ✅ Run migration `00006`.
4. ✅ `npm install`
5. ✅ `npm run dev`

### Marketing homepage

6. ✅ Open an incognito window → `http://localhost:3000` → marketing page renders with hero, features, pricing.
7. ✅ Click "Try free" → goes to /signup.
8. ✅ Log in → /dashboard (homepage redirects you when authenticated).

### Free tier limits

9. ✅ Settings page → /settings → see current plan as "Free", usage stats showing your current counts.
10. ✅ Try to create a 51st student (if you have 50 already — or temporarily lower the limit in `lib/limits.ts` to test) → action returns the upgrade message.
11. ✅ Try to create a second active signup form → blocked.
12. ✅ Try to create a segment → blocked (Pro feature).

### Polar checkout flow

13. ✅ Settings → click "Upgrade to Pro" → redirects to Polar's hosted checkout.
14. ✅ Use Polar sandbox card details (`4242 4242 4242 4242`, any future expiry, any CVC).
15. ✅ Complete checkout → redirects back to /settings?upgraded=1 → success banner.
16. ✅ Page now shows "Pro" badge, plan card shows Pro features, usage stats show ∞ symbols.
17. ✅ Sidebar shows the Pro badge.
18. ✅ Try creating a segment → works now.
19. ✅ Try sending a campaign with 100+ recipients (if you have them) → no limit hit.

### Cancel flow

20. ✅ Settings → Cancel subscription → confirm → toast "Subscription cancelled. Pro access remains until period ends."
21. ✅ Verify in Polar sandbox dashboard → subscription shows `cancel_at_period_end: true`.
22. ✅ Profile still shows Pro until period ends (no immediate flip).

### Embeddable widget

23. ✅ Forms list → click a form → "Embed code" card visible → copy snippet.
24. ✅ Create a test HTML file on your machine:
    ```html
    <!DOCTYPE html>
    <html><body>
    <h1>Test page</h1>
    <div data-clasd-form="your-form-slug"></div>
    <script src="http://localhost:3000/embed.js" async></script>
    </body></html>
    ```
25. ✅ Open it in a browser (just `file://` works) → form renders inline.
26. ✅ Submit it → "You're in" confirmation in place, no redirect.
27. ✅ Open browser DevTools → Console → see no CORS errors.
28. ✅ The iframe height auto-adjusts to fit the form (resize the browser to verify).

### Bug-fix verification

29. ✅ On a class with auto-reminder toggled on, then off, then on again — Run queue picks up the new reminders. (The Chunk 5 issue.)
30. ✅ Run queue badge on Campaigns page only shows count of due-now messages, not all pending.

## Things to know

- **Polar sandbox vs production** — sandbox uses `sandbox.polar.sh` and the `POLAR_SERVER=sandbox` env. Switch to production when deploying — same code, different env.
- **The marketing page price (£9)** is hard-coded in `app/page.tsx`. Change it to match what you set in your Polar product.
- **Embed iframe height** — set to a sensible 420px minimum and auto-grows. If embedding sites complain about layout shift, you could add `aspect-ratio` or measure first then mount.
- **Limit enforcement is best-effort** — checks happen on creation, not retroactively. Existing data isn't deleted when you exceed limits; new additions just stop. Going from Pro back to Free with 200 students leaves them all there.

## What I cut for scope (deliberate)

- **Webhook endpoint for Polar.** Project spec doesn't require it, and the poll-on-demand pattern from Mise en Place works fine. If you need belt-and-braces "user pays elsewhere, plan auto-flips" reliability, add a webhook in Chunk 7 alongside deployment when localhost stops being a constraint.
- **Schedule-for-later UI.** Still deferred — infrastructure is there, no picker yet.
- **Customer portal link** on settings page. Polar has hosted portals for managing payment methods etc. Skipped for the demo; users see plan + cancel button only.
- **Per-route framing whitelist.** I've allowed framing on `*` for embed routes. A real production deploy might want to lock to specific known-customer domains. Acceptable for demo scope.

## Original spec re-check

When you're ready, paste back the original brief and we can verify everything required is in. From memory, the major requirements were class management, students/enrolments, signup forms, email campaigns with merge fields and ICS, segments, scheduled sends, free/paid tiers via Polar, embeddable widget, marketing homepage. Chunk 7 then handles tests + polish + deploy.

## Next chunk

**Chunk 7 — Tests, polish, deploy:**
- Playwright e2e tests covering all major flows
- Bug fixes and final polish from end-to-end manual testing
- Production deploy to Vercel
- Domain verification in Resend (real multi-recipient sending)
- Vercel Cron config (`vercel.json`)
- Production Polar product + webhook for belt-and-braces if wanted
