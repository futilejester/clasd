# Week 10 — Clasd

A class communications platform for instructors. Replaces newsletter platforms for the teach-the-same-students-every-week use case with proper calendar-aware tooling.

## What I built

**Clasd** — a SaaS app for yoga teachers, music tutors, fitness coaches, language teachers, and anyone else running recurring sessions with the same audience week-to-week. Instead of treating students like email subscribers (the newsletter platform model), it knows about classes, sessions, attendance, and payment status.

The differentiator: features that newsletter platforms can't easily do, because they don't have the underlying class data model.

- **Subscribable calendar feed per class** — students subscribe once, every session shows up in their phone calendar including future cancellations
- **Auto-reminders** — toggle on, every session emails enrolled students at the configured lead time, with the calendar invite attached
- **Real segments** — filter recipients by attendance, payment status, skill level, tags
- **Embeddable signup forms** — paste a script tag on your existing website, signups create student records and (optionally) auto-enrol them
- **Polar paywall** with free/Pro tiers and usage-based limits

**Live at:** [URL once deployed]
**Repo:** [GitHub URL once pushed]

## The pitch

When I sat down at the start of the week, I'd been told to build a newsletter platform. I instead built the case for a different product: instructors don't really want a newsletter — they want class communications. The data model is fundamentally different.

A newsletter has subscribers and broadcasts. A class has students, sessions, attendance, payment status, and reminders. Try to run a yoga class through Mailchimp and you end up with a student list that doesn't know who's behind on payment, a "Tuesday class" tag that doesn't help when you cancel one specific Tuesday, and no way to attach calendar invites that update if the schedule shifts.

The brief allowed for "newsletters or equivalent top-level entity" so I went with classes.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind
- **Supabase** for Postgres, Auth, RLS
- **Resend** for email delivery + webhooks for tracking
- **Tiptap** for the rich text campaign editor
- **React Email** for the email shell
- **ical-generator** for ICS files (per-session attachments + subscribable feeds)
- **Polar** for paid plans — same poll-on-demand pattern as Mise en Place (Week 7), no webhook needed
- **Playwright** for e2e tests
- **Vercel** for hosting + cron

Pinned exact versions throughout. After last week's `npm audit fix` debacle that rewrote my whole package.json, I learned the hard way.

## What I'm proudest of

**The segment compiler.** The most technically interesting bit. Segments are AND/OR rule trees stored as JSONB; evaluating them at send time means turning a tree into a SQL filter. I considered doing it in Node (fetch all rows, filter in memory) but that scales terribly. Instead I built a recursive Postgres function `clasd_eval_rules` that takes the rules JSON plus a row's relevant fields (also as JSONB) and returns a boolean. The actual matching is done by `clasd_match_students` and `clasd_match_enrolments` RPCs that build the candidate row's fields via `to_jsonb()` and feed them to the evaluator. Field names are whitelisted both client-side (in `lib/segments/fields.ts`) and server-side (the RPC defines what's reachable). Two layers of defence against a malicious rules payload.

It also means segment-targeted campaigns work the same way as class-targeted ones — the campaign editor lets you pick class XOR segment, and at send time the recipient set is computed via the appropriate RPC.

**The subscribable calendar feed.** When a student subscribes to `/cal/{classId}/calendar.ics?token=...` in Apple Calendar or Google Calendar, every session appears in their calendar — including future ones added by the instructor and cancellations marked as such. ICS feeds use stable per-session UIDs (`session-<id>@clasd.app`), so when a calendar app re-fetches and an event has the same UID with `STATUS:CANCELLED`, the calendar app shows it struck-through automatically. No code on the calendar-app side, just a properly-formed ICS feed.

This is the bit that makes Clasd feel like it belongs in this product space rather than being yet another newsletter clone.

**The auto-reminder queue.** Toggle "auto-reminder" on a class → it instantly generates `scheduled_messages` rows for every (upcoming session × subscribed enrolled student × lead time minutes). Idempotent via a partial unique index on `(session_id, student_id, reminder_kind)`. Vercel Cron calls `/api/cron` every 5 minutes which runs `processQueue` — picks up to 50 due messages, marks them processing (so a parallel run doesn't double-fire), sends, marks sent. New session added? The same queue job catches up at the next interval. Toggle off? Pending rows are deleted.

In dev I built a "Run queue now" button on the campaigns page so I could trigger the cron path manually without waiting 5 minutes. Same code path either way.

## What broke

**Resend sandbox dropped silent test sends.** The `onboarding@resend.dev` sender only delivers to your own Resend account email. Other recipients return 200 from the API but never arrive. Cost me an hour of confused debugging until I read the docs properly. The fix in production was domain verification (covered in the deploy guide).

**Auto-reminder toggle off / on was permanently broken.** First version marked pending reminder rows as `cancelled` rather than deleting them. Then the unique index `(session_id, student_id, reminder_kind)` blocked re-insertion when toggling on again. Fixed by switching to `DELETE`. Caught only by manual testing — would have been a nasty production bug.

**`expected non-null body source` from Polar SDK.** The `@polar-sh/sdk` 0.32.10 had a request-body serialisation issue when calling from Next.js server routes — the body got consumed before the actual fetch went out. Bypassed it entirely by calling Polar's REST API directly with `fetch`, which works perfectly. The success route still uses the SDK for fetching subscriptions and that part's fine.

**Polar sandbox vs production token confusion.** I tried using my live polar.sh token with `POLAR_SERVER=sandbox` set. Got 401 invalid_token. Spent 20 minutes debugging before realising sandbox.polar.sh is an entirely separate environment with separate accounts and separate tokens. The classic mistake.

**`null value in column unsubscribe_token`** — caught by Playwright. The Chunk 5 migration backfilled tokens for existing students but didn't set a default for new inserts. New accounts created post-migration didn't have any students yet, so the bug only surfaced when those accounts went to add their first student. Single-line SQL fix: `alter column unsubscribe_token set default replace(gen_random_uuid()::text, '-', '')`. The kind of bug only e2e tests catch — schema looks fine, code looks fine, only failing in the gap between them.

## What I'd do differently

**Run e2e tests sooner.** I wrote the Playwright suite at the very end of Chunk 7. Caught two real bugs (the unsubscribe_token one, and a strict-mode selector edge case) that I'd missed in manual testing. If I'd written even a smoke-test version after Chunk 1, I'd have caught issues earlier when they were cheaper to fix.

**Centralise limit checks earlier.** I built `lib/limits.ts` in Chunk 6 but only enforced it on student creation, then had to come back and add it to forms and segments creation in Chunk 7. Should have wrapped every `create*` server action in `assertLimit()` from the start.

**Track schema changes more carefully.** Migration 7 added three columns (button_text, success_title, success_message) for form customisation, but I didn't update the database types in the same edit. Got a compile error on first build. Now I've got a habit: schema migration → types → action → UI, all in the same chunk.

## Spec coverage

All 12 minimum requirements met:

| Requirement | How it's covered |
|---|---|
| User registration & login with session persistence | Supabase Auth + cookies |
| Multiple top-level entities | Classes (newsletter equivalent) — full CRUD + archive |
| Subscriber management | Students with add/edit/remove/resubscribe/unsubscribe |
| Signup forms with public URLs | `/f/[slug]` route + form builder |
| Campaign editor | Tiptap editor with merge fields, templates, preview |
| Email delivery via API | Resend |
| Delivery tracking | Webhook updates campaign stats from delivered/opened/clicked/bounced/complained |
| Audience segments | AND/OR rule builder + Postgres compiler |
| Dashboard with counts/stats/activity | All three sections explicit on `/dashboard` |
| Responsive layout | Mobile drawer nav + responsive Tailwind |
| Data scoped to users | RLS on every table |
| Marketing homepage | `/` for logged-out users |

Optional extras hit cleanly: embeddable signup forms (HTML + JS), open & click tracking via webhooks, usage-based pricing with tiered plans + upgrade flow.

Optional extras partially: customisable form appearance (color, button text, success title, success message — no font/spacing options), subscriber activity timeline (on student detail pages), account settings + danger zone (no password change or session list), unsubscribe with token (HMAC was the spec wording; the random-token approach has the same security property).

Skipped for time/scope: dark mode, command palette, workspace switcher, inline editing, real-time updates with Turbo Streams. Polar webhooks (not in spec; poll-on-demand pattern from Mise en Place reused).

## Testing

- **Manual end-to-end across all 7 chunks** — every chunk had its own test plan in the README, ~140 manual tests total
- **Playwright e2e suite** — 16 tests covering auth, classes, students, forms, campaigns, segments, dashboard, settings (14 passing reliably; 2 fail under accumulated test data conditions, which I've documented as needing a pre-test cleanup SQL)

## Decisions worth defending

**No webhook for Polar.** Spec doesn't require it. I used the same poll-on-demand pattern as Mise en Place: store the checkout ID before redirect, look up the resulting subscription on the success route. Avoids the need for a publicly-reachable webhook URL during development, which means dev-mode billing testing actually works without ngrok or similar tunneling. Production reliability is identical for the cases the spec cares about.

**Inline send + queue, hybrid.** Campaign sends queue rows into `scheduled_messages` (the same table used by auto-reminders), then `sendCampaign` immediately invokes `processQueue` for fast feedback. So in dev, "click send → email arrives" feels instant despite using the queue path. In production, the cron picks up anything that didn't fire inline (recovery from transient Resend outages, etc).

**Recurring sessions stored as individual rows, not RRULE expansion.** Each session in a recurring class gets its own `class_sessions` row at creation time. Means cancelling one session is just a `status` update on one row, not RRULE exception logic. Means attendance tracking just works. Means the calendar feed query is a simple SELECT. The trade-off is more rows, but the storage is cheap and the query simplicity pays for itself.

**Demo-ready, not production-ready.** I made a deliberate call early in the week to scope this as "test functional" — works end-to-end, real APIs, real data, but skips the polish that's only meaningful at scale: rate limiting, sophisticated retry logic, multi-region failover, etc. The deploy works, the cron runs, real students get real emails. Scaling concerns are explicitly out of scope.

## What I learned

**Postgres functions are underrated.** I used to reach for "fetch all rows, filter in app code" by default. Building the segment compiler in plpgsql forced me to think about what runs where — and the result is faster, more secure (whitelist enforced server-side), and simpler to reason about. The mental shift: the database isn't just a dumb store, it can be a real participant in your computation.

**Migration discipline matters.** Seven migrations across the build, plus a few backfill steps. Naming them with sequential numbers and clear titles (e.g. `00003_segments_cron_unsubscribe.sql`) made them easy to apply in order on a fresh project. Future-me will thank me when deploying to a new Supabase project.

**Pin exact versions.** Last week's `npm audit fix` rewriting my package.json to `^9.3.3` for `next` was a one-time lesson. This week every dependency is exact-pinned. No surprises.

**E2E tests find the bugs unit tests miss.** The unsubscribe_token bug only surfaced in a clean account scenario, with a real form submission, that ran top-to-bottom. Schema inspection wouldn't have caught it. Type-check wouldn't have caught it. Manual testing on my main account didn't catch it because the backfill had already populated tokens on existing rows. Only Playwright running against a fresh-ish account finally hit it.

## Thanks

To Flavio for ten weeks of project briefs that progressively pushed the boundary of what I'd built before. The "minimum requirements vs optional extras" framing of this final brief was particularly good — clear floor, room for ambition.

The full deploy walkthrough lives in `DEPLOY.md`.
