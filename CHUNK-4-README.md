# Clasd — Chunk 4

Email & ICS. The chunk where students can actually receive things.

## How to apply this chunk

1. **Drop files in** as usual, overwriting where prompted.
2. **`npm install`** — there are new dependencies this time (Resend, React Email, ical-generator, Tiptap).
3. **Run the new SQL migration** — `supabase/migrations/00002_calendar_token.sql` adds a `calendar_token` column to `classes` for unguessable subscribable feed URLs.
4. **Set Resend env vars** in `.env.local`:
   ```
   RESEND_API_KEY=your_key_here
   RESEND_FROM_EMAIL=onboarding@resend.dev
   RESEND_FROM_NAME=Clasd
   ```
   `onboarding@resend.dev` is Resend's sandbox sender — no domain verification needed in dev. Note that the sandbox **only delivers to the email address that owns your Resend account**. So when you "test send", make sure your account email matches what you're sending to.

### Files in this chunk

```
app/(app)/campaigns/
├── page.tsx                                    [REPLACES placeholder]
├── actions.ts                                  [NEW]
├── new/
│   ├── page.tsx                                [NEW]
│   └── template-picker.tsx                     [NEW]
└── [id]/
    ├── page.tsx                                [NEW]
    └── edit/
        ├── page.tsx                            [NEW]
        └── campaign-editor.tsx                 [NEW]

app/(app)/classes/[id]/page.tsx                 [REPLACES — adds calendar card]

app/cal/                                        [NEW — public calendar routes]
├── [classId]/calendar.ics/route.ts
└── session/[sessionId]/event.ics/route.ts

components/
├── calendar-subscribe-card.tsx                 [NEW]
└── rich-text-editor.tsx                        [NEW]

emails/email-shell.tsx                          [NEW]

lib/email/                                      [NEW]
├── merge.ts
├── render.tsx
├── resend.ts
├── templates.ts
└── ics.ts

types/database.ts                               [REPLACES — adds calendar_token]
package.json                                    [REPLACES — new deps]
.env.local.example                              [REPLACES — new env vars]
supabase/migrations/00002_calendar_token.sql    [NEW MIGRATION]
```

## What's in this chunk

### Campaign editor
- Template picker on the new-campaign page: 5 starter templates (enrolment confirmation, class reminder, homework/recap, term enrolment open, cancellation) plus blank.
- Tiptap-based rich text editor: bold/italic/strike, headings, bullet/numbered lists, blockquote, links, "Insert variable" picker.
- Merge fields: `{{student.name}}`, `{{class.title}}`, `{{session.datetime}}`, etc. Substituted per-recipient at send time.
- Live preview pane showing the email rendered with sample data.
- **Autosave** every 1.5s after edits. Status indicator under the heading.
- **Test send to me** — fires a single email to your account email with sample merge data, ICS attached if configured.
- **Send to recipients** — iterates the recipient set (all subscribed students enrolled in the linked class, or all subscribed students if no class), fires a personalised email per recipient.

### Email rendering
- React Email shell with brand colours, footer, and unsubscribe stub. (Real unsubscribe lands in Chunk 5 with the webhook.)
- HTML and plain-text versions of each email rendered automatically.

### ICS calendar
- **Per-session attachment**: campaign editor has "Attach a calendar invite for this session" with a session picker. Recipients can one-click add to Google/Apple/Outlook.
- **Subscribable class feed**: every class detail page shows a "Subscribable calendar" card with a public URL. Token-protected. When students subscribe, they automatically see all sessions including future changes.
- **Webcal one-click subscribe** link for clients that support `webcal://`.
- **Cancelled sessions** appear in the feed with `STATUS:CANCELLED` and `CANCELLED:` prefix on the title — calendar apps show them struck through.
- Stable UIDs (`session-<id>@clasd.app`) so updates overwrite rather than duplicating.

## Test the milestone

1. ✅ Run the migration in Supabase SQL Editor — `00002_calendar_token.sql`. (If you have existing classes, check that they all have a `calendar_token` populated.)
2. ✅ `npm install` (new deps will pull down).
3. ✅ `npm run typecheck` — clean.
4. ✅ `npm run lint` — clean.
5. ✅ `npm run dev` and log in.

### Subscribable calendar

6. ✅ Open a class detail page that has sessions. The new "Subscribable calendar" card should appear under the header.
7. ✅ Click **Copy** — toast "Calendar URL copied".
8. ✅ Paste the URL into a new browser tab → should download or display an .ics file with all your class's sessions.
9. ✅ **Real test:** open Google Calendar in the browser → left sidebar → "Other calendars" + → "From URL" → paste the URL → all your class sessions appear.
10. ✅ Back in Clasd, cancel one of the sessions → wait a few minutes → refresh Google Calendar → that session shows as cancelled in your subscribed feed. (Google syncs on its own schedule, often ~24h. For instant testing, paste the URL fresh and inspect: cancelled sessions have `STATUS:CANCELLED`.)
11. ✅ Try the URL **without** the `?token=...` query param → 401 Unauthorized.
12. ✅ Try the URL with a wrong token → 404 Not Found.

### Campaign editor

13. ✅ Click **Campaigns** in the sidebar → empty state → click **New campaign**.
14. ✅ Pick "Class reminder" template → name "Tomorrow's class" → link to one of your classes → Continue.
15. ✅ Lands on the editor. The body is pre-filled from the template.
16. ✅ The autosave indicator shows "Saving…" then "Saved" as you make changes.
17. ✅ Click "Insert variable" → pick "Class location" → `{{class.location}}` is inserted at the cursor.
18. ✅ Click **Preview** → sample data is substituted (Jane / Tuesday Yoga / 18:00 etc).
19. ✅ Toggle "Attach a calendar invite for this session" → pick a future session from the dropdown.
20. ✅ Click **Test send to me** → check your inbox (the email associated with your Resend account):
    - The email arrives with your composed body
    - Merge fields are replaced with sample data
    - The preheader shows in the inbox preview
    - The .ics is attached and named `<class-slug>-<short-id>.ics`
    - Click the .ics → calendar app opens with the event ready to add
21. ✅ Click **Send to recipients** → confirm dialog → toast shows "Sent to N/N delivered".
22. ✅ Lands on the campaign detail page. Status is "Sent". The body is locked.
23. ✅ Inbox should have a real email with merge fields filled in (since the recipient is your test student which is also you).

### Edge cases

24. ✅ Try to send a campaign with an empty subject or empty body → button is disabled.
25. ✅ Try to send a campaign with no recipients (link it to a class with no enrolments and toggle off "all subscribed") — actually the recipient set defaults to all-subscribed if no class, so for a true no-recipient test: link it to an empty class → click Send → see error "No subscribed recipients found for this campaign."
26. ✅ Refresh the campaigns list → both your sent campaign and any drafts are listed. Drafts link to the editor; sent campaigns link to the detail page.
27. ✅ Delete a draft from the editor → confirm → it's gone from the list.

## What I cut for scope (deliberate)

- **Open/click tracking.** The campaign detail shows "Opened" and "Bounced" stats but they stay at zero. The Resend webhook lands in **Chunk 5** alongside scheduled-message infrastructure, and that's what populates these.
- **Real unsubscribe link.** The email footer mentions one but the URL is a placeholder. Real unsubscribe with one-click opt-out arrives in Chunk 5 (it needs to be unauthenticated, with a per-student token).
- **Recipient queue.** Sends are inline (one HTTP call per recipient, in order). Fine for dev with 3-10 recipients. **Don't** test with 100+ in one go on the free Resend tier — you'll hit rate limits. Chunk 5 moves this to the cron queue with proper rate limiting.
- **Schedule for later.** Database columns are there (`scheduled_for`), but the UI just sends now. Schedule UI lands in Chunk 5 with the cron.
- **Attaching multiple sessions** to one campaign. Just one at a time. Use the subscribable feed if you want all.
- **Custom email templates.** Five starter templates are it for now.

## Things to know during testing

- **Resend sandbox limit.** `onboarding@resend.dev` only delivers to the email on your Resend account. If you "Send to recipients" and one of those recipients is a different email, that delivery is silently dropped by Resend. The campaign will show as "delivered" in our DB (Resend returns 200) but the recipient gets nothing. For real multi-recipient testing, verify a domain in Resend.
- **Calendar feeds cache aggressively.** Google Calendar typically syncs subscribed URLs every 24h or so. For instant feedback during testing, fetch the URL directly in your browser to see the raw .ics output rather than waiting for the calendar app to re-sync.
- **The webcal:// link** uses the same URL but with the `webcal:` scheme. macOS / iOS prompt to open in Calendar.app. Most desktop Outlook clients accept it. Web Outlook does not — it needs the `https://` URL pasted into "Subscribe from web" manually.
- **Tiptap autosaves the body as HTML.** The `body_html` column on `campaigns` is the source of truth. We could also store `body_json` for round-trips with formatting fidelity but for our needs HTML is enough.
- **`text` is generated by `@react-email/render`** with `{ plainText: true }`. Resend uses this for the plain-text alternative part of the multipart email.

## Next chunk

**Chunk 5 — Segments, scheduling, delivery tracking:**
- Segment rule engine + UI builder (the most technically interesting piece in the spec)
- Vercel Cron + `scheduled_messages` table for queued sends
- Automated 24h-before-session reminders
- Resend webhook for delivery tracking (open/click/bounce events)
- Real unsubscribe link with per-student token
