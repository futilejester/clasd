# Deploying Clasd to Production

Step-by-step walkthrough. Plan for ~45 minutes the first time, mostly waiting on DNS propagation and clicking through dashboards.

## Prerequisites

- Working dev environment (you've got this — it's all of Chunks 1-7a)
- GitHub account with the Clasd repo pushed (private repo is fine)
- Vercel account (free tier works for everything we need)
- Resend account (the one you've been using in dev — Chunk 4 onwards)
- Polar account on the production dashboard (the one used for Mise en Place)
- Control panel access to a domain — we'll use `adaptableinnovation.co.uk` and set up `mail.adaptableinnovation.co.uk` as a sending subdomain

## Stage 1: Get the code into GitHub

1. From the project root:

   ```bash
   git status
   ```

   If you've been committing along the way, skip to the push step. If not, initialise:

   ```bash
   git init
   git add .
   git commit -m "Clasd initial commit"
   ```

2. Create a new private repo on GitHub. Don't initialise with a README. Then:

   ```bash
   git remote add origin git@github.com:futilejester/clasd.git
   git branch -M main
   git push -u origin main
   ```

   Confirm the repo on GitHub looks right — should see `app/`, `components/`, etc. **`.env.local` should NOT be in the repo** — `.gitignore` excludes it.

## Stage 2: Resend domain verification

This is what unblocks sending to anyone (not just your account email).

1. Log into Resend → **Domains** → **Add Domain**
2. Enter `mail.adaptableinnovation.co.uk` (NOT just the apex domain — we want the subdomain)
3. Pick **EU** as the region (you're UK-based — keeps latency low)
4. Resend shows you a list of DNS records to add. Should be 3-4 records:
   - 1× `MX` record (priority 10)
   - 1× `TXT` for SPF
   - 2× `TXT` for DKIM (one with "_domainkey" in the name)

5. Open your `adaptableinnovation.co.uk` DNS control panel in another tab.

6. For each record Resend shows, add it. Two important things:
   - The **Name** field varies by control panel. Some want the full subdomain (`mail.adaptableinnovation.co.uk`), some want just the prefix (`mail`). Both work; just pick whichever matches your panel's convention.
   - The **Value** field — paste exactly what Resend shows. No quotes around it (some panels add them automatically).

7. Save records. DNS propagation: usually 1-5 minutes for fresh records, occasionally up to a few hours.

8. Back in Resend, click **Verify**. Should turn green for each record. If a record fails, the panel might be displaying it differently from how the DNS server returns it — wait 5 minutes, hit Verify again. If still failing after 30 minutes, share the screenshot and we can debug.

9. Once verified, decide on a sender address. I'd suggest `hello@mail.adaptableinnovation.co.uk` or `notifications@mail.adaptableinnovation.co.uk`. You'll use this in the `RESEND_FROM_EMAIL` env var.

## Stage 3: Polar production product

Already have a polar.sh account from Mise en Place — reuse it.

1. Polar dashboard (production, NOT sandbox) → make sure you're in your organisation
2. **Products** → **New product** → recurring monthly subscription, set whatever price (£9 was our placeholder)
3. Save the **Product ID** somewhere
4. **Settings → API Keys** → **New** → copy the access token (starts `polar_oat_…`)

## Stage 4: Vercel deploy

1. Vercel dashboard → **Add New** → **Project** → import your `clasd` GitHub repo
2. Vercel detects Next.js automatically. Don't change build settings.
3. **Environment Variables** — paste these in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=<from your Supabase project>
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<from your Supabase project>
   SUPABASE_SERVICE_ROLE_KEY=<from your Supabase project, "service_role" key>
   NEXT_PUBLIC_APP_URL=<we'll come back to this — leave as a placeholder>
   RESEND_API_KEY=<from Resend dashboard>
   RESEND_FROM_EMAIL=hello@mail.adaptableinnovation.co.uk
   RESEND_FROM_NAME=Clasd
   POLAR_ACCESS_TOKEN=<production token from Polar>
   POLAR_PRODUCT_ID_PRO=<production product ID from Polar>
   POLAR_SERVER=production
   CRON_SECRET=<generate a random string — see below>
   ```

   Generate a `CRON_SECRET` value with:

   ```bash
   openssl rand -hex 32
   ```

   Or just use any 32+ character random string. This protects `/api/cron` from being called by random people.

4. Click **Deploy**. First build takes 2-3 minutes.

5. When it's done, you get a URL like `https://clasd-abc123.vercel.app`. **Copy this URL.**

6. Go back to Vercel → Project Settings → Environment Variables → edit `NEXT_PUBLIC_APP_URL` → set to your deployed URL → **Save**

7. **Redeploy** — Settings → Deployments → click latest → ⋯ menu → Redeploy. (The `NEXT_PUBLIC_APP_URL` change needs a fresh build to take effect because it's referenced in client-side bundles.)

## Stage 5: Vercel Cron sanity check

1. Vercel project → **Cron Jobs** tab
2. You should see one entry: `/api/cron` running every 5 minutes
3. Click into it to view recent executions. First execution might take up to 5 minutes after deploy. Once it runs, it'll show response status (should be 200).

If you don't see the Cron Jobs tab, it usually means Vercel didn't pick up `vercel.json`. Verify the file is in the repo root and redeploy.

## Stage 6: Smoke test

Open your deployed URL in a **fresh browser** (not signed-in dev session). Walk this list:

1. ✅ Marketing homepage loads at `/`
2. ✅ Sign up at `/signup` with a real email — should receive confirmation email (check Supabase Auth → Settings if email confirmation is on)
3. ✅ Log in successfully → lands on `/dashboard`
4. ✅ Create a class
5. ✅ Add a student with an email *that is not your Resend account email*
6. ✅ Compose a campaign linked to the class → "Test send to me" → check the inbox of the email used in step 2 → email arrives **(this is the moment Resend domain verification proves itself)**
7. ✅ Send a real campaign → student in step 5 receives the email
8. ✅ Subscribable calendar URL is on the class detail page → paste into Google Calendar → events appear (DOES work now because the URL is a real public HTTPS URL, unlike the localhost dev URL we couldn't test in Chunk 4)
9. ✅ Settings → upgrade to Pro (real charge — use a real card or skip if you'd rather not pay yet)
10. ✅ After upgrading, create a segment → segment-targeted campaign
11. ✅ Check Vercel Cron Jobs tab → see executions every ~5 min
12. ✅ Wait for the next cron run (or manually visit `https://your-app.vercel.app/api/cron` with `Authorization: Bearer YOUR_CRON_SECRET` header) — should process anything queued

## Common deploy issues

**Build fails with "Cannot find module"** — usually means a path import case mismatch. Local macOS is case-insensitive but Vercel's Linux containers are case-sensitive. If `import { foo } from '@/components/Foo'` works locally but fails on Vercel, check if the file is actually `foo.tsx`. Fix the import to match the file's exact case.

**`Request to api.resend.com failed`** — token typo or env var not set. Check the deploy's runtime logs.

**Polar checkout returns 401** — wrong server. `POLAR_SERVER` should be `production` for production, since you're using a production token from polar.sh.

**Cron route returns 401** — `CRON_SECRET` isn't matching what Vercel sends. Vercel sends the secret automatically; you don't need to configure it as a header source. If you set the env var in Vercel, the cron should authenticate. Check Vercel docs if it persists.

**`NEXT_PUBLIC_APP_URL` is wrong in emails** — env vars prefixed with `NEXT_PUBLIC_` get baked into the build at compile time. After changing one, you must redeploy.

**Custom domain** — once everything works on the `*.vercel.app` URL, you can attach a custom domain (e.g. `app.adaptableinnovation.co.uk`) in Project Settings → Domains. After it's set up, update `NEXT_PUBLIC_APP_URL` and redeploy. The vercel.app URL keeps working as a fallback.

## Bonus: Production Polar webhook (optional)

We've intentionally skipped Polar webhooks throughout this build (using poll-on-demand instead — works perfectly fine). If you want belt-and-braces "user pays elsewhere → plan flips" reliability, add a webhook now that Vercel has a real URL:

1. Polar dashboard → Settings → Webhooks → Add → URL: `https://your-app.vercel.app/api/webhooks/polar` (note: this route doesn't exist yet — you'd need to add it).

Honestly, skip this for now. The poll-on-demand approach already handles every case the spec required, and adding a webhook is a Chunk 8 enhancement, not a deploy blocker.

## What's NOT changing in production

- Database (same Supabase project as dev)
- Polar webhook (none, intentionally — see above)
- Resend webhook for delivery events (already exists at `/api/webhooks/resend`, just needs to be configured in Resend's dashboard — Settings → Webhooks → URL: `https://your-app.vercel.app/api/webhooks/resend`, subscribe to `email.delivered`, `email.opened`, `email.clicked`, `email.bounced`, `email.complained`)
