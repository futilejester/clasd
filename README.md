# Clasd

Class communications for independent instructors. Final-week SaaS project for the AI bootcamp.

## Stack

- **Next.js 14** (App Router) + TypeScript + Tailwind
- **Supabase** — Postgres, Auth, RLS
- **Vercel** — hosting + cron (Chunk 5)
- **Resend** + **React Email** — transactional sending (Chunk 4)
- **Polar** — paid tier paywall (Chunk 6)
- **Playwright** — end-to-end tests (Chunk 7)

## Chunk 1 — what's in this drop

- Project scaffold (Next.js, TypeScript, Tailwind)
- Full Supabase schema for all 11 tables with RLS policies
- Auth flow — email/password signup + login, session persistence, protected routes
- Marketing homepage (placeholder, real one comes in Chunk 6)
- Authenticated app layout with sidebar nav (mobile responsive)
- Dashboard with empty-state stats cards
- Settings page showing account info
- Placeholder pages for Classes, Students, Campaigns, Segments

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project. Pick a region close to you (London/Frankfurt for UK).

### 3. Run the schema migration

In your Supabase project dashboard, open the **SQL Editor** and run the contents of `supabase/migrations/00001_initial_schema.sql`.

This creates all 11 tables, indexes, RLS policies, and the trigger that auto-creates a profile row when a user signs up.

### 4. Disable email confirmation (dev only)

In your Supabase dashboard:

- **Authentication** → **Providers** → **Email**
- Toggle **Confirm email** OFF

This means signup completes instantly — no email round-trip needed during development. Turn this back on before going to production.

### 5. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in from **Project Settings** → **API**:

- `NEXT_PUBLIC_SUPABASE_URL` — Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — service_role key (keep secret)
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3000` for now

### 6. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000

## Test the milestone

You should be able to:

1. ✅ Land on the marketing homepage
2. ✅ Click "Get started" → sign up with email + password → land on dashboard
3. ✅ See the greeting use your name (from sign-up)
4. ✅ Stats cards all show 0 (no data yet)
5. ✅ Click any sidebar item — Classes, Students, etc. show "Coming soon" placeholders, no 404s
6. ✅ Settings page shows your email, name, plan (`FREE`), and join date
7. ✅ Log out → land on `/login`
8. ✅ Log back in → land on dashboard
9. ✅ Try to visit `/dashboard` while logged out → redirected to `/login?next=/dashboard`
10. ✅ Resize browser to ~400px width → sidebar collapses to a hamburger menu
11. ✅ Run `npm run typecheck` — passes
12. ✅ Run `npm run lint` — passes

## Project structure

```
clasd/
├── app/
│   ├── (app)/                    # Auth-protected route group
│   │   ├── layout.tsx            # Sidebar + main layout, redirects if no session
│   │   ├── dashboard/
│   │   ├── classes/              # Chunk 2
│   │   ├── students/             # Chunk 3
│   │   ├── campaigns/            # Chunk 4
│   │   ├── segments/             # Chunk 5
│   │   └── settings/
│   ├── auth/
│   │   ├── callback/route.ts     # Email confirmation handler
│   │   └── logout/route.ts
│   ├── login/
│   ├── signup/
│   ├── layout.tsx                # Root: fonts, toaster
│   └── page.tsx                  # Marketing homepage
├── components/
│   ├── ui/                       # Button, Input, Label, Card
│   ├── sidebar.tsx
│   └── mobile-nav.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Browser client
│   │   ├── server.ts             # Server + service-role clients
│   │   └── middleware.ts         # Session refresh + redirect logic
│   └── utils.ts
├── supabase/
│   └── migrations/
│       └── 00001_initial_schema.sql
├── types/
│   └── database.ts
└── middleware.ts
```

## What to look out for during testing

- **Cookie/session issues** were what bit Mise en Place. The pattern in
  `lib/supabase/server.ts` and `lib/supabase/middleware.ts` is the current
  recommended `@supabase/ssr` setup. If you get stuck in a redirect loop on
  login, that's almost always a cookie-handling issue.
- **The auth callback route** at `/auth/callback` only matters if you turn
  email confirmation back on. Safe to ignore for now.
- **The `handle_new_user` trigger** in the schema is what creates the
  profile row automatically when you sign up. If signup succeeds but the
  dashboard says profile is null, check that the trigger exists in your
  Supabase project (run the migration again).

## Next chunk

**Chunk 2 — Classes & sessions:** Classes CRUD, recurring session generation (e.g. "every Tuesday 6pm for 8 weeks"), session list/edit/cancel UI. The clean version we agreed on: when you create a recurring class, individual `class_sessions` rows are generated immediately rather than expanded from an RRULE at read time.
