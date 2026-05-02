# Clasd — Chunk 5

Segments, scheduled queue, auto-reminders, delivery tracking, real unsubscribe. The most technically interesting chunk.

## How to apply this chunk

Order matters — install first (no new deps), then migrations, then file drop.

1. **No new dependencies** — `npm install` not strictly needed but harmless.
2. **Run the three new migrations** in this order (Supabase SQL Editor):
   - `supabase/migrations/00003_segments_cron_unsubscribe.sql`
   - `supabase/migrations/00004_segment_functions.sql`
   - `supabase/migrations/00005_counter_functions.sql`
3. **Drop the files in**, overwriting the prompts.

### Files in this chunk

```
app/(app)/segments/                      [NEW — entire feature]
├── page.tsx
├── actions.ts
├── segment-editor.tsx
├── new/page.tsx
├── [id]/page.tsx
├── [id]/members-client.tsx
└── [id]/edit/page.tsx

app/(app)/campaigns/
├── page.tsx                             [REPLACES — adds Run queue button + segment column]
├── actions.ts                           [REPLACES — segment targeting + queues sends]
├── run-queue-button.tsx                 [NEW]
└── [id]/edit/
    ├── page.tsx                         [REPLACES — fetches segments]
    └── campaign-editor.tsx              [REPLACES — class XOR segment targeting]

app/(app)/classes/[id]/
├── page.tsx                             [REPLACES — adds AutoRemindCard]
├── auto-remind-actions.ts               [NEW]
└── auto-remind-card.tsx                 [NEW]

app/api/                                 [NEW]
├── cron/route.ts                        — Bearer-auth, processes queue + reminders
└── webhooks/resend/route.ts             — Resend delivery events

app/u/[token]/                           [NEW — public unsubscribe]
├── page.tsx
└── actions.ts

components/rule-builder.tsx              [NEW — recursive AND/OR builder]

lib/
├── segments/fields.ts                   [NEW — STUDENT_FIELDS + ENROLMENT_FIELDS]
├── segments/compiler.ts                 [NEW — TS compiler for defence in depth]
├── email/queue.ts                       [NEW — processQueue, ensureRemindersForUpcomingSessions]
└── supabase/middleware.ts               [REPLACES — adds /segments]

middleware.ts                            [REPLACES — excludes /api/, /cal/, /f/, /u/]
types/database.ts                        [REPLACES — adds auto_remind, unsubscribe_token]

supabase/migrations/                     [NEW]
├── 00003_segments_cron_unsubscribe.sql
├── 00004_segment_functions.sql
└── 00005_counter_functions.sql
```

## What's in this chunk

### Segments
- **Rule builder UI** — AND/OR groups (one level of nesting), per-data-type operators, live debounced preview showing match count + first 10 students.
- **Whitelisted fields** — students target gets name/email/tags/subscribed/created_at/last_active_at; enrolments target gets enrolment status/payment/skill/attendance + joined student fields.
- **Server-side compilation** — rules JSON is evaluated by Postgres functions (`clasd_match_students`, `clasd_match_enrolments`) called via `supabase.rpc`. Field names whitelisted server-side as defence in depth.
- **Segment-targeted campaigns** — campaign editor offers class XOR segment targeting. Recipient set is computed at send time.

### Scheduled queue + cron
- **`scheduled_messages` is now the send path.** Inline send is gone — `sendCampaign` queues rows and immediately calls `processQueue` for fast dev feedback.
- **`ensureRemindersForUpcomingSessions`** — called on auto-remind toggle, generates reminder rows for every active enrolled subscribed student × every future session × the lead time. Idempotent via the partial unique index (`session_id`, `student_id`, `reminder_kind`).
- **Cron route** at `/api/cron` — Bearer-auth via `CRON_SECRET`. Refreshes reminders + processes 50 messages per call. Vercel Cron config lands in Chunk 7 deploy.
- **Run queue button** on the Campaigns page with a pending-count badge, so dev testing doesn't need a real cron.

### Auto-reminders
- Per-class toggle on the class detail page, alongside the calendar subscribe card.
- Lead time picker: 1h / 3h / 6h / 12h / 24h / 2d / 3d / 1 week.
- Toggling on generates rows for upcoming sessions immediately.
- Toggling off cancels pending reminders for the class's sessions.
- Auto-reminder template is hard-coded for now (matches the "Class reminder" template in Chunk 4) and always attaches the session ICS.

### Delivery tracking
- **Resend webhook** at `/api/webhooks/resend` accepts `email.delivered/opened/clicked/bounced/complained`.
- Logs every event to `delivery_events` for forensics.
- Atomically increments `campaigns.opened_count` / `clicked_count` / `bounced_count` via the new RPC functions.
- **Spam complaints unsubscribe the student.** Pragmatic decision — anyone marking an email as spam should not get more.

### Real unsubscribe
- Every student row gets a unique `unsubscribe_token` (32-char hex, backfilled by migration).
- Public route `/u/[token]` — confirmation page, then a one-click unsubscribe.
- Email shell footer link now points to a real URL.
- Sends include the `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers, so Gmail / Apple Mail show their built-in unsubscribe button.

### Hardening
- `sendCampaign` now resilient to mid-send errors — campaign moves to `failed` status, can be re-sent.
- Status check accepts `draft` OR `failed` for resend (was only `draft`).

## Test the milestone

Set up first:

1. ✅ Run the three migrations in order.
2. ✅ `npm run typecheck` — clean.
3. ✅ `npm run dev` and log in.

### Segment builder

4. ✅ **Sidebar** — "Segments" link now appears.
5. ✅ Click Segments → empty state → "New segment".
6. ✅ Pick target "Students", give it a name like "Active subscribers", add condition: `Subscribed` `is` `true`. Live preview should show your subscribed students.
7. ✅ Add a second condition: `Tags` `contains` `vip` (assuming you have a student tagged `vip`). Switch to "Any" combinator → preview count should grow. Back to "All" → narrows.
8. ✅ Click "Add group" → adds a nested AND/OR group → add a condition inside it. Verify nesting renders correctly.
9. ✅ Try a leaf with `is empty` operator → no value field shown.
10. ✅ Try `Email` `contains` "@gmail" → preview narrows to gmail addresses.
11. ✅ Save → redirects to the segment detail page → shows full member list.
12. ✅ "Refresh" button on detail page re-evaluates and updates `member_count` + `last_evaluated_at`.
13. ✅ Edit segment → change a condition → live preview updates → save → redirect back.
14. ✅ Switch target to "Enrolments" → field list changes (status, payment_status, attendance_count, etc) → save a segment like "Beginners with paid status" using `Skill level` `is` `beginner` AND `Payment status` `is` `paid`.

### Campaigns with segments

15. ✅ Campaigns → New campaign → pick a template → leave class blank → continue.
16. ✅ In editor, **Segment dropdown** lists the segments you created → pick one → class dropdown disables. Conversely picking a class disables segment.
17. ✅ "Test send to me" still works.
18. ✅ "Send to recipients" → resolves recipients via segment → toast shows queued/sent counts.
19. ✅ Campaign detail page now reflects opened/bounced as zeros (will populate via webhook when available).

### Auto-reminders

20. ✅ Open a class with at least one upcoming session and one enrolled subscribed student.
21. ✅ Toggle "Automatically email enrolled students" → toast: "Auto-reminders on · N reminders queued" (where N = sessions × students).
22. ✅ Lead time selector → switch to "1 hour before" → reminders re-queue.
23. ✅ In Supabase Table Editor, check `scheduled_messages` → see the pending rows with `reminder_kind = 'session_24h'` and `send_at` in the future.
24. ✅ Add a new session to the class → click Run queue button on Campaigns page → reminders generated for the new session too.
25. ✅ Toggle off → pending reminders for this class get `status = 'cancelled'`.

### The queue + manual run

26. ✅ Create a session in the **near future** (say 30 minutes from now), enable auto-reminder with lead time "1 hour before" → reminder row's `send_at` is in the past → click Run queue → toast "Sent N · …" → check inbox.
27. ✅ Cancel a session that has a queued reminder → run queue → reminder fails with "Session was cancelled — skipping reminder", row marked `failed`.

### Resend webhook (simulated)

28. ✅ Quick sanity check — Run queue once with at least one campaign send → check `delivery_events` table → no rows yet (we don't have a real webhook posting to localhost).
29. ✅ Simulate a webhook locally:
    ```bash
    curl -X POST http://localhost:3000/api/webhooks/resend \
      -H "Content-Type: application/json" \
      -d '{"type":"email.opened","data":{"email_id":"PASTE_RESEND_ID_FROM_DB"}}'
    ```
    Replace `PASTE_RESEND_ID_FROM_DB` with the `resend_id` of one of your sent `scheduled_messages` rows (visible in the Supabase Table Editor). Refresh the campaign detail page → Opened count = 1.
30. ✅ Repeat with `email.bounced` → bounced count goes up.
31. ✅ Repeat with `email.complained` → student gets unsubscribed.

### Unsubscribe flow

32. ✅ Open a sent email in your inbox. Click the "Unsubscribe" link in the footer → lands on `/u/{token}` → confirmation page.
33. ✅ Click "Unsubscribe" button → success page.
34. ✅ Check the student in Clasd → `subscribed = false`, `unsubscribed_at` set.
35. ✅ Try sending another campaign that includes that student → they're skipped (queue throws "Student is unsubscribed").

## Things to know during testing

- **Cron auth in dev.** `CRON_SECRET` is optional in `.env.local` — if unset, `/api/cron` is open. Fine for dev; production should set it.
- **Resend webhook auth.** Same deal — `RESEND_WEBHOOK_SECRET` is optional in dev. Production verification (Svix signing) lands in Chunk 7.
- **Segment evaluation is at send time.** A segment whose rules match 50 students at 9am may match 52 at 10am. The recipient_count on the campaign is the snapshot at send.
- **`processQueue` is single-threaded.** It picks up to 50 pending messages and sends them in series, marking each `processing` first. Two concurrent calls are safe — the timestamp + status check prevents double-fire — but throughput is constrained by Resend's per-second limits on the free tier.
- **Reminder template is hard-coded** in `lib/email/queue.ts`. Future enhancement: pluggable templates per class.

## What I cut for scope (deliberate)

- **Custom attributes in segments.** Students have `custom_attributes JSONB` populated from form submissions. The compiler doesn't reach into it yet — it'd need a different query path. Noted for Chunk 7 if there's slack.
- **Schedule-for-later UI.** `scheduled_for` exists on campaigns and `send_at` on scheduled_messages, but the UI doesn't expose a "send at X time" picker yet. The infrastructure is all there — just no UI. Chunk 6 polish if wanted.
- **Webhook signature verification.** Skipped for dev; lands in Chunk 7.
- **Per-recipient rate limiting.** Resend's free tier is 100/day, 10/sec. We don't currently throttle. For a demo with realistic volumes (10-50 students per send) this is fine.

## Next chunk

**Chunk 6 — embeddable widgets, Polar paywall, marketing homepage:**
- Embeddable signup form widget for instructors' own websites
- Polar integration for paid plans (free tier limits to come into effect)
- Public marketing homepage with pricing + signup flow
