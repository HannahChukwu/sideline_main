# Sideline Studio

AI-powered athletics marketing studio with **role-based portals**:

- **Designer**: create + publish game-day assets
- **Athlete**: review/like published assets
- **Student**: browse the live feed

Auth + data is backed by **Supabase** (Auth + Postgres + RLS).

## Product overview

- **Landing** (`/`): simple entry point for sign up / sign in (role routing happens after auth).
- **Auth** (`/auth`): email/password + Google OAuth. During **signup**, users choose a role (Designer / Athlete / Student). A profile row is auto-created in `public.profiles`.
- **Role routing**: after login/signup/callback, users are redirected based on `profiles.role`:
  - `designer` → `/designer`
  - `athlete` → `/athlete`
  - `student` → `/feed`
- **Navbar**: role badge is **dynamic** (pulled from `profiles`). Clicking the logo goes to **Profile**.
- **Profile / Settings** (`/settings`): edit basic profile info (currently `full_name`). Role is read-only/locked after signup.

### Portals

- **Designer** (`/designer`): dashboard listing your assets.
- **Create asset** (`/designer/create`): create/publish an asset (currently a mocked “AI generation” preview).
- **Athlete** (`/athlete`): feed of published assets with like/feedback UX.
- **Student** (`/feed`): live feed of published assets.

### Manager flow (still in repo)

The repo still includes a manager pipeline/editor under:
- `/manager`
- `/manager/editor`

These routes use Supabase tables like `schools`, `teams`, `athletes`, `schedules`, `manager_drafts`. (There is no longer a “Manager Demo” entry point on the landing page.)

## Tech stack

- **Next.js** (App Router), **React**, **TypeScript**
- **Tailwind CSS** + shadcn-style components
- **Supabase**: Auth, Postgres, RLS (`@supabase/supabase-js`, `@supabase/ssr`)

## Local development

1) Install + run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

2) Configure Supabase env

Create/update `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3) Set up database schema + seed

In Supabase SQL Editor, run:
- `supabase-schema.sql`
- `supabase-seed-school.sql` (replace `YOUR_MANAGER_USER_UID` first)

4) (Optional) Google sign-in

Enable Google in Supabase → Authentication → Providers and set redirect URL to:
- `http://localhost:3000/auth/callback`

## Repo structure (high level)

- `src/app/`: routes (`auth`, `designer`, `athlete`, `feed`, `settings`, plus `manager/*`)
- `src/components/`: UI, navbar, editor/pipeline components
- `src/lib/`: supabase clients, types, feed/assets helpers, pipeline/editor helpers
- `supabase-schema.sql`: schema + RLS + auth trigger for profile creation
- `supabase-seed-school.sql`: seed data for manager/designer workflows

## Status / known gaps

- **Route protection**: portals are not fully locked down by role yet (recommended next).
- **Real AI generation**: “generation” is mocked/stubbed; API keys/providers exist but aren’t fully wired end-to-end.
- **Storage**: reference image uploads are not fully implemented.
