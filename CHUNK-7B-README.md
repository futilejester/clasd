# Clasd — Chunk 7b

The finishing line. Deploy to Vercel + journey log for Flavio.

## How to apply this chunk

Tiny chunk — three files only:

1. **Drop `vercel.json` into the project root** — tells Vercel to schedule the cron + sets function timeouts
2. **Replace `.gitignore`** at the project root — make sure env files don't end up in your GitHub repo
3. **Drop `DEPLOY.md`** — your step-by-step deployment walkthrough
4. **Drop `JOURNEY-LOG.md`** — the bootcamp submission for Flavio

No code changes. No migrations. No `npm install`.

## Deployment

The full walkthrough is in `DEPLOY.md`. Six stages:

1. **GitHub** — push the repo
2. **Resend domain verification** — add DNS records on `mail.adaptableinnovation.co.uk`
3. **Polar production product** — new product in your live Polar dashboard
4. **Vercel deploy** — connect repo, set env vars, deploy
5. **Cron sanity check** — confirm the every-5-minute schedule is live
6. **Smoke test** — 12-step verification on the deployed URL

Plan ~45 minutes start to finish, mostly waiting on DNS propagation.

## Journey log

`JOURNEY-LOG.md` is what you submit to Flavio. I drafted it in your voice based on the actual build — what you built, what broke, what you'd do differently, decisions worth defending. Read through it and tweak any phrasing that doesn't sound like you. The placeholders for live URL and GitHub URL need filling in once those exist.

Some specific bits to consider editing:

- **The "thanks" section** at the bottom — make it your own, or remove if it's not your style
- **"What I'm proudest of"** — feel free to swap in a different favourite if mine doesn't match yours
- **Anything that sounds too much like marketing copy** — Flavio probably reads more authentic voice better

## Final state

After this chunk:

✅ All 7 chunks built and tested
✅ Production deployed
✅ Journey log ready to submit
✅ Real Resend domain so emails actually deliver
✅ Polar production for real billing
✅ Vercel cron running every 5 minutes
✅ Custom domain (optional)

You're done.
