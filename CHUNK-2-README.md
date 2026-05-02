# Clasd — Chunk 2

Classes CRUD, recurring session generation, and the sessions UI.

## How to apply this chunk

This zip contains **only the new and changed files**. Drop them into your existing `clasd/` directory, overwriting where prompted. No package changes — no `npm install` needed.

The files in this chunk:

```
app/(app)/
├── classes/
│   ├── actions.ts                              [NEW]
│   ├── new/page.tsx                            [NEW]
│   ├── page.tsx                                [REPLACES placeholder]
│   └── [id]/
│       ├── page.tsx                            [NEW]
│       ├── session-actions-client.tsx          [NEW]
│       ├── edit/
│       │   ├── page.tsx                        [NEW]
│       │   └── edit-form.tsx                   [NEW]
│       └── sessions/
│           ├── actions.ts                      [NEW]
│           ├── new/
│           │   ├── page.tsx                    [NEW]
│           │   └── session-form.tsx            [NEW]
│           └── [sessionId]/edit/page.tsx       [NEW]
├── dashboard/page.tsx                          [REPLACES — now shows real data]
components/
├── schedule-builder.tsx                        [NEW]
└── ui/
    ├── badge.tsx                               [NEW]
    ├── checkbox.tsx                            [NEW]
    ├── empty-state.tsx                         [NEW]
    ├── select.tsx                              [NEW]
    └── textarea.tsx                            [NEW]
lib/
├── dates.ts                                    [NEW]
└── recurrence.ts                               [NEW]
```

## What's in this chunk

- **Classes list** with cards showing upcoming session count and next session.
- **New class form** with the recurrence builder — pick frequency, weekdays, end mode (count / date / never), with a live preview of generated sessions.
- **Class detail page** with sessions grouped by upcoming/past, status pills, per-session actions menu (edit, mark complete, cancel/restore, delete).
- **Class edit page** for updating class metadata.
- **One-off session creation and editing** — for ad-hoc additions to a class outside the recurring pattern.
- **Archive / restore** classes (soft delete using the `archived` flag).
- **Updated dashboard** — stats cards now show real counts, plus a list of the next 5 upcoming sessions across all classes.

## Test the milestone

After dropping the files in:

1. ✅ `npm run typecheck` — clean.
2. ✅ `npm run lint` — clean.
3. ✅ `npm run dev` and log in.
4. ✅ Click **Classes** in the sidebar → empty state with a Create button.
5. ✅ Click **New class**, fill in:
   - Title: "Tuesday evening yoga"
   - Instructor: your name
   - Duration: 60 minutes
   - Capacity: 12
   - First session: pick next Tuesday at 18:00 (using the date/time picker)
   - Frequency: Weekly
   - Ends: After 8 sessions
   - **Watch the preview update live** — should show 8 dated sessions, all on Tuesday at 18:00.
6. ✅ Submit → redirected to the class detail page → 8 upcoming sessions visible, all status "scheduled".
7. ✅ On the dashboard, "Active classes" should now read 1 and "Upcoming sessions" should read 8. The "Upcoming sessions" list should show the next 5.
8. ✅ Back on the class page, click the `⋯` menu on a session → "Mark completed" → it moves to the Past sessions section.
9. ✅ On a different session, click `⋯` → "Cancel" → status pill changes to "Cancelled" but session stays in the list.
10. ✅ "Restore" the cancelled session → goes back to scheduled.
11. ✅ Click "Add session" → create a one-off session that doesn't match the recurring pattern — e.g. a Saturday workshop.
12. ✅ Edit the class → change the title → save → see the new title on the detail page and on the list page.
13. ✅ Archive the class → redirected to classes list → empty state, because it's archived.
14. ✅ Click "Archived" → see your class. Click into it. Click "Restore" → back to active.
15. ✅ **Recurrence edge cases worth trying:**
    - Frequency = "Doesn't repeat" → should generate just 1 session.
    - Frequency = Custom days each week, select Mon + Wed + Fri, count = 9 → should generate 9 sessions across 3 weeks.
    - Frequency = Biweekly, count = 4 → sessions should be 14 days apart.
    - Frequency = Weekly, end mode = On a date, end date = 4 weeks from now → should generate 4 or 5 sessions depending on day.
16. ✅ On mobile (resize to ~400px), classes cards stack to a single column and all forms remain usable.

## Notes for testing / debugging

- **Date/time pickers:** `<input type="datetime-local">` displays in the user's browser local timezone, which is what we want. The form converts to UTC ISO strings before saving.
- **Recurrence preview** is computed client-side from the same `generateSessions()` function the server action uses, so what you see is what you get.
- **Capacity** is set per-session at creation. Editing the class default duration won't retroactively change existing session durations or capacities — that's intentional.
- **Archive is reversible.** Delete (on individual sessions only) is not — it confirms before destroying.
- **The server action redirect pattern**: server actions throw `NEXT_REDIRECT` on success, which is normal — it surfaces as a thrown error in dev tools but is handled by Next. Real errors come back via the `result.error` return value.

## Known limitations (deliberate)

- **No "edit recurrence" flow.** Once a class is created, individual sessions can be edited but the recurrence pattern itself can't be edited. To change the pattern, archive the class and create a new one. This is a deliberate scoping decision — adding "edit all future sessions" / "edit this and following" semantics is a tar pit for a 7-day build.
- **Cover image** is a URL field, not a file upload. Storage upload widget is Chunk 7 polish if there's time.
- **Time zones** rely on the browser's local zone. A user travelling abroad would see times shifted; storing a per-class or per-user TZ is a future improvement.

## Next chunk

**Chunk 3 — Students, enrolments, signup forms:** student CRUD, enrolling students into classes with class-specific attributes (skill level, payment status), and public signup forms with shareable URLs that anyone can submit without an account.
