# Sideline Studio

AI-powered game day poster and asset workflow for school athletics. Built for designers, athletes, and students with role-based dashboards and a manager flow for creating match announcements and hype graphics.

## What’s in the app right now

- **Home** – Landing page with role entry (Designer, Athlete, Student) and sign in / sign up.
- **Auth** – Email/password and **Google OAuth** via Supabase. Role is stored in `profiles` and used for redirects.
- **Designer** – Dashboard and a create-asset flow (form + mock “generate” preview).
- **Athlete** – Feed of assets with like/feedback (mock data).
- **Student / Feed** – Public-style feed (mock data).
- **Manager workflow** (`/manager`) – Multi-step flow for building a post:
  1. **Team** – Pick a team (from Supabase, or mock if none).
  2. **Athletes** – Pick featured athletes for that team.
  3. **Schedule** – Import schedule via **CSV upload or paste**, map columns (date, time, opponent, location), then pick the matchup.
  4. **Post type** – Gameday, Hype, or Announcement.
  5. **Review** – Edit **image** and **caption** prompts (large text areas), add optional **reference images**, copy GenerationRequest JSON, then **Generate** (saves draft to Supabase and opens the editor).
- **Manager editor** (`/manager/editor`) – Canvas preview with editable text blocks (headline, match line, date/time, location, CTA, footer). Click to edit, drag to reposition. Layout and copy are saved to Supabase when signed in. “Regenerate” and “Export” are stubbed for later.

All manager data (teams, athletes, schedules, drafts) is stored in **Supabase** and scoped per manager (RLS). You must be **signed in** to save drafts and use the editor.

## Tech stack

- **Framework** – Next.js 16 (App Router), React 19, TypeScript.
- **Styling** – Tailwind CSS v4, shadcn-style components (Button, Card, Input, Tabs, etc.).
- **Auth & DB** – Supabase (Auth, Postgres, RLS). No separate backend; API route only for auth callback.
- **State** – React state and Supabase client; no Redux. Manager drafts are read/written via `src/lib/supabase/managerDraft.ts`.

## Getting started

1. **Install and run**

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

2. **Supabase** – Create a project and add to `.env.local`:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Schema and seed** – In the Supabase SQL Editor, run:
   - `supabase-schema.sql` (tables + RLS).
   - `supabase-seed-school.sql` after replacing `YOUR_MANAGER_USER_UID` with your user’s UUID (Authentication → Users).

   See `docs/SUPABASE_SETUP.md` for step-by-step instructions.

4. **Google sign-in** (optional) – In Supabase Dashboard → Authentication → Providers, enable Google and set redirect URL to `http://localhost:3000/auth/callback`.

## Project structure (high level)

- `src/app/` – Routes: `page.tsx` (home), `auth/`, `designer/`, `athlete/`, `feed/`, `manager/`, `manager/editor/`.
- `src/components/` – UI (brand, layout, schedule, pipeline wizard, editor canvas).
- `src/lib/` – Supabase client/server, pipeline types, prompt compilers, schedule CSV parsing, editor layout and `buildCopyFromRequest`.
- `supabase-schema.sql` – Full schema (profiles, schools, teams, athletes, schedules, logos, manager_drafts, RLS).
- `supabase-seed-school.sql` – One school + one team for your manager user.

## Not built yet (stubs / env placeholders)

- Real **image generation** (IMAGE_GEN_API_KEY) – “Generate” in the manager flow only saves the prompt and opens the editor.
- **Caption AI** (ANTHROPIC_API_KEY) – Not wired; caption prompt is editable text only.
- **File storage** (R2_ACCOUNT_ID, etc.) – Reference images in the review step are in-memory only; no upload to R2/Supabase Storage yet.
- **Email** (RESEND_API_KEY) – Not used.
