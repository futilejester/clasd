# Clasd — Chunk 3

Students, enrolments, and signup forms (with public submission).

## How to apply this chunk

Drop the contents into your existing `clasd/` directory, overwriting where prompted. **No package changes** — no `npm install` needed.

This chunk is the broadest yet. 29 files, including 4 updates to existing files.

### Files in this chunk

```
app/(app)/
├── students/
│   ├── page.tsx                                [REPLACES placeholder]
│   ├── actions.ts                              [NEW]
│   ├── new/
│   │   ├── page.tsx                            [NEW]
│   │   └── student-form.tsx                    [NEW]
│   └── [id]/
│       ├── page.tsx                            [NEW]
│       ├── student-actions-client.tsx          [NEW]
│       └── edit/page.tsx                       [NEW]
├── classes/[id]/
│   ├── page.tsx                                [REPLACES — adds enrolments section]
│   ├── enrol/
│   │   ├── page.tsx                            [NEW]
│   │   └── enrol-form.tsx                      [NEW]
│   └── enrolments/actions.ts                   [NEW]
└── forms/
    ├── page.tsx                                [NEW]
    ├── actions.ts                              [NEW]
    ├── form-builder.tsx                        [NEW]
    ├── new/page.tsx                            [NEW]
    └── [id]/
        ├── page.tsx                            [NEW]
        ├── form-share-card.tsx                 [NEW]
        ├── form-actions-client.tsx             [NEW]
        └── edit/page.tsx                       [NEW]

app/f/[slug]/                                   [NEW — public route]
├── page.tsx
├── actions.ts
├── public-form.tsx
└── thanks/page.tsx

components/
├── sidebar.tsx                                 [REPLACES — adds Forms nav]
├── mobile-nav.tsx                              [REPLACES — adds Forms nav]
├── enrolment-editor.tsx                        [NEW]
└── ui/tag-input.tsx                            [NEW]

lib/
├── slug.ts                                     [NEW]
└── supabase/middleware.ts                      [REPLACES — adds /forms to protected routes]
```

## What's in this chunk

### Students
- List page with search across name + email, plus a subscribed/unsubscribed filter
- Add student manually (email, name, phone, tags, notes)
- Edit student details
- Student detail page showing enrolments, custom attributes from forms, notes
- Unsubscribe / resubscribe / delete from a dropdown menu

### Enrolments
- "Enrol student" button on each class detail page
- Pick from existing students or enrol someone new by email (auto-creates student)
- Per-enrolment editor: status, payment status, skill level — visible on the student detail page
- Remove enrolment (keeps the student record)

### Signup forms
- List page with submission counts, live/paused state, and the public URL
- Form builder with custom questions: short text, long text, email, phone, choice (with options)
- Reorderable fields, configurable required-state, accent colour picker, optional class link
- Detail page with copy-to-clipboard public URL, basic embed iframe snippet
- Pause / resume / delete actions

### Public form route
- `/f/[slug]` is the public page anyone can submit
- Submissions auto-create or update a student (deduped by email)
- If a previously-unsubscribed student submits, they're resubscribed
- If the form is linked to a class, an enrolment is created (or reactivated if previously cancelled)
- Submission count increments
- Redirects to a `/f/[slug]/thanks` confirmation page

## Test the milestone

After dropping the files in:

1. ✅ `npm run typecheck` — clean.
2. ✅ `npm run lint` — clean.
3. ✅ `npm run dev`. The sidebar should now show **Forms** between Students and Campaigns.

### Students

4. ✅ Click **Students** → empty state with two CTAs.
5. ✅ Click **Add student** → fill in just an email → submit → see the student detail page.
6. ✅ Edit the student → add a name, two tags (use enter or comma to add), notes → save.
7. ✅ On the list page, search by part of the email → filtered correctly.
8. ✅ Use the dropdown menu on the detail page → Unsubscribe → status pill changes to "Unsubscribed".
9. ✅ Resubscribe → returns to subscribed.
10. ✅ Try to add a second student with the same email as the first → see error "A student with that email already exists".

### Enrolments

11. ✅ Go to a class detail page (one with no enrolments) → see "No students enrolled yet" empty state.
12. ✅ Click **Enrol student** → pick existing student → set skill level "Beginner", payment "Paid" → submit.
13. ✅ Back on the class detail page, see them listed with the badges showing.
14. ✅ Open the student detail page → see the enrolment with editable status/payment/skill.
15. ✅ Change skill level to "Intermediate" → click Save → toast confirms.
16. ✅ On the class enrol page again, switch to "New student" tab → enter a new email → enrol → both student and enrolment created.
17. ✅ Try to enrol the same student into the same class twice → error "That student is already enrolled in this class".

### Signup forms

18. ✅ Click **Forms** → empty state. Click **New form**.
19. ✅ Fill in name "Spring term", headline "Join Tuesday Yoga", link to your class, change the accent colour.
20. ✅ Add 3 custom questions: a required short-text "Emergency contact name", an optional phone "Emergency contact number", a required choice with 3 options like "Beginner / Intermediate / Advanced".
21. ✅ Reorder fields with the up/down arrows. Toggle one's required state.
22. ✅ Submit → land on the form detail page.
23. ✅ Copy the public URL → paste it in a new browser tab (or incognito to act anon).

### Public submission flow

24. ✅ The public form should render with your headline, description, accent colour applied to the submit button, and your custom questions.
25. ✅ Try to submit with empty email → browser blocks it (HTML5 validation).
26. ✅ Try to submit with email but missing the required custom question → see error message in red.
27. ✅ Submit fully → land on the "You're in" thanks page.
28. ✅ Back in your auth'd app, refresh the form detail → submissions count is 1.
29. ✅ Open the Students list → the new student is there with their custom field values shown on the detail page under "From signup forms".
30. ✅ The class detail page now shows them as enrolled.
31. ✅ Submit the **same email** again with a different name and different custom answers → submissions count goes up, but the student is updated (not duplicated). Custom attributes from the new submission merge in.
32. ✅ Pause the form (dropdown) → reload the public URL → 404.
33. ✅ Make the form live again → public URL works again.

### Mobile

34. ✅ Resize to ~400px wide → tables collapse cleanly, the form builder stays usable, the public form looks good.

## Notes / things to know

- **The public form uses the service-role Supabase client** to fetch and to write. Form submissions need to bypass RLS because the submitter is anonymous and is writing into the form-owner's data. The page-level fetch also uses service-role so the `classes(title)` join works (the `classes` table has no anon read policy). This is fine because the form is public by definition — only forms marked `active = true` are returned.
- **Email is the dedup key.** A student is unique per `(user_id, email)` — so if your friend submits with the same email twice, the second submission updates the existing record rather than creating a duplicate. This is why you don't get duplicate students from people retrying a form.
- **Resubscribe on resubmission** is intentional. If someone unsubscribes and later signs up via a public form again, that's a clear opt-in signal — we resubscribe them.
- **Custom field keys** must be lowercase, start with a letter, contain only letters/numbers/underscores. The builder auto-sanitises as you type.
- **Slug generation** uses a 6-char random suffix to avoid collisions and to make form URLs slightly unguessable. Pattern: `{slugified-name}-{abc123}`.

## Known limitations (deliberate)

- **No CSV import** for bulk-adding students. Could be added in Chunk 6 polish if there's time.
- **Custom attributes are display-only** when editing a student manually. They're populated via signup form submissions.
- **No drag-to-reorder** on form fields — up/down arrows only. The drag library would be 30KB+ for one tiny feature.
- **The "embed snippet"** on the form detail page is a basic iframe. The proper embeddable widget arrives in Chunk 6 with size/theme options.
- **No CAPTCHA** on the public form yet. Real production would want one. Chunk 7 polish if time.

## Next chunk

**Chunk 4 — Email & ICS:** Resend integration, React Email templates with merge fields, the campaign editor with Tiptap, ICS calendar attachments and subscribable calendar URLs (`/cal/[classId].ics`).
