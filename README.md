# Sideline Studio

AI-powered athletics creative studio with role-based portals, Supabase auth/data, and AI image generation. The app is deployed on **Vercel**. Instagram posting via Meta’s API is **not working yet** (see below)—designers can generate and download assets, but there is no reliable way to connect an Instagram account and publish from the app today.

**Production landing page:** [https://sideline-main.vercel.app/](https://sideline-main.vercel.app/)

## What Is Implemented

### Core platform

- **Role-based auth + routing** with Supabase Auth and `profiles.role`.
  - `designer` -> `/designer`
  - `athlete` -> `/athlete`
  - `student` -> `/feed`
- **Route protection and role guard** in `src/proxy.ts`:
  - Unauthenticated users are redirected from protected routes to `/auth`
  - Authenticated users are redirected away from wrong-role portals
  - Authenticated users hitting `/auth` are sent to their role home
  - Protected routes now include `/settings`, and protected paths fail closed if auth config is missing
- **Server-side role layouts** for defense in depth:
  - `src/app/designer/layout.tsx` (designer-only)
  - `src/app/athlete/layout.tsx` (athlete-only)
  - `src/app/feed/layout.tsx` (student-only)
  - `src/app/settings/layout.tsx` (signed-in users only)
- **Profile bootstrap on signup** via DB trigger in `supabase-schema.sql` (`public.profiles` auto-created).

### Portals and pages

- **Landing** (`/`): branded entry page with sign in/sign up links. Live at [sideline-main.vercel.app](https://sideline-main.vercel.app/).
- **Auth** (`/auth` + `/auth/callback`): email/password + OAuth callback handling.
- **Designer dashboard** (`/designer`): asset grid and stats.
- **Designer Team** (`/designer/team`): **Teams, players & schedules** (add teams like “Trinity · Men’s Squash”, roster players, one-time CSV/Excel schedule import per team); full schedule preview; **Copy athlete invite link**.
- **Designer nav** (signed-in designers): **Dashboard**, **Team**, **Generator**, **Scores** — program data is edited on **Team**, not the asset dashboard.
- **Generator** (`/designer/create`): when you have teams, **team → featured athlete(s) → match** (from your schedule), then the full AI flow:
  - asset types (`gameday`, `final-score`, `poster`, `highlight`), style, format, refinement chat, reference images (up to 14 URLs from the app’s reference bucket)
  - shows the active **Replicate image model** in the header (see `src/lib/imageGen/replicateImageModel.ts`; currently **`google/nano-banana-pro`**)
  - save/publish; Instagram UI (stub)
- **Athlete portal** (`/athlete`): published content consumption and interaction; header can show the **official linked team** name when `profiles.team_id` is set.
- **Athlete join** (`/athlete/join?t=…`): redeems a **signed invite** (after sign-in) and sets `profiles.team_id`; unauthenticated users are sent through `/auth` with `next` preserved (see **API routes**).
- **Student feed** (`/feed`): poster feed + grouped designer updates.
- **Live scores** (`/scores`): NCAA-backed scoreboard with fallback simulation.
- **Settings** (`/settings`): profile editing.
- Legacy **`/designer/program`** redirects to **`/designer/team`**; **`/designer/editor`** is the layout editor stub.

### API routes

- **`POST /api/generate`**
  - Requires a **signed-in designer user** (401 if anonymous, 403 if non-designer)
  - **Rate limits** per user via **Supabase Postgres** (`consume_generation_rate_limit` RPC; fixed hour/day buckets). **503** if the migration is not applied (see [`docs/GENERATION_RATE_LIMIT_SETUP.md`](docs/GENERATION_RATE_LIMIT_SETUP.md))
  - Validates request body with Zod
  - Generates prompt/copy with Anthropic when configured (fallback prompt builder otherwise)
  - Generates the poster image via Replicate **`google/nano-banana-pro`** (`prompt`, `image_input`, `aspect_ratio` from format, **`2K`** resolution, PNG output, `safety_filter_level: block_only_high`, optional fallback model if Replicate routes at capacity)
  - Enforces strict sanitization for reference image URLs (must come from this app's Supabase public **`generation-references`** bucket)
- **Instagram API (scaffold only—not production-ready)**  
  Route handlers exist (`/api/instagram/connect`, `/oauth/callback`, `/status`, `/publish`) for Meta OAuth, token storage, and Graph publish. **The Meta app / API flow is not wired through successfully yet**, so users cannot complete “Connect Instagram” or post generated images to Instagram from this app. Treat this as future work once Meta app review, redirect URLs, and permissions are sorted.
  - Security hardening in place now:
    - `/api/instagram/connect`, `/api/instagram/teams`, `/api/instagram/publish`, `/api/instagram/oauth/callback` require `designer` role
    - team-scoped operations require school-owner authorization (`schools.manager_id`) for the target `teamId`
- **`POST /api/auth/password-signin`**
  - Email + password sign-in with session cookies; enforces failed-attempt lockout via Redis (see **Security features**)
- **`GET /api/live-scores`**
  - Fetches NCAA scoreboard data across sports
  - Normalizes, deduplicates, and sorts live/upcoming/final games
  - Falls back to simulated data when NCAA source is unavailable
- **`POST /api/team-invite`** (authenticated **school owner** / designer account only)
  - Body: `{ "team_id": "<uuid>" }` for a team under the caller’s school
  - Returns `{ "url", "expires_in_days" }` pointing at `/athlete/join?t=…`
  - Signs tokens with **`TEAM_INVITE_SECRET`** (HMAC-SHA256; **16+ characters**). In production, missing/short secret yields **503**.
- **`POST /api/team-invite/redeem`**
  - Body: `{ "token": "<signed token>" }`; requires a signed-in user whose **`profiles.role`** is **`athlete`** or **`student`**
  - Sets **`profiles.team_id`** when the token is valid and not expired (default **14-day** TTL)

## Security features

- **Authentication and route gating**  
  Supabase Auth backs sign-in. [`src/proxy.ts`](src/proxy.ts) refreshes sessions and redirects unauthenticated users away from protected routes; signed-in users are kept in the correct role portal (`designer` / `athlete` / `student`). Optional `DEV_BYPASS_AUTH` is for local debugging only and only honored in non-production. For protected paths, missing auth config now fails closed (redirect) instead of allowing access.

- **Defense in depth for forced browsing**  
  Role checks are enforced at three layers:
  1) edge route gating in `src/proxy.ts`  
  2) server layouts per portal (`src/app/designer/layout.tsx`, `src/app/athlete/layout.tsx`, `src/app/feed/layout.tsx`, `src/app/settings/layout.tsx`)  
  3) route-handler authorization (`/api/generate`, `/api/team-invite`, `/api/instagram/*`) with team ownership checks where applicable.

- **Email/password sign-in lockout (brute-force slowdown)**  
  - **Flow**: The auth UI does **not** call `signInWithPassword` on the browser for email/password. It **`POST`s to [`/api/auth/password-signin`](src/app/api/auth/password-signin/route.ts)** so the server validates credentials, applies lockout logic, and **sets Supabase session cookies** on success.  
  - **Rules** (see [`src/lib/auth/loginLockout.ts`](src/lib/auth/loginLockout.ts)): Failed attempts are counted per **normalized email** (trim + lowercase). Redis keys use **SHA-256 of that email**, not the raw address in the key. After **5** failed attempts within a **15-minute** rolling window, the account identifier is **locked for 10 minutes**. While locked, the API returns **429** with a **`Retry-After`** header (seconds). A **successful** sign-in **clears** both the failure counter and any lock.  
  - **Infrastructure**: Optional **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`**. If those are missing, **lockout is disabled** (email/password still works; production may still want Upstash for lockout).  
  - **OAuth**: **Google sign-in is unchanged** and does not go through this route or counter.  
  - **Limitation**: The public Supabase **anon** key can still be used to call Supabase Auth APIs directly outside this app; this lockout protects users going through **your** sign-in path and aligns sessions with the server route. Stronger guarantees require provider/network-level controls.

- **Database and storage access**  
  **Row Level Security (RLS)** on Postgres tables limits who can read/write rows (see [`supabase-schema.sql`](supabase-schema.sql)). **Storage** policies scope uploads to the authenticated user’s folder (`auth.uid()` as the first path segment). Reference images for AI live in **`generation-references`**; archived generated posters (stable URLs on save) use **`generated-posters`** so reference uploads stay separate from finished assets.  
  **Schedules and team linking**: designers (school owners via `schools.manager_id`) own `schedules` for their teams; athletes/students with **`profiles.team_id`** set can **read** matching `schedules` rows and the corresponding **`teams`** / **`schools`** rows (for display names)—see policies *Athletes can view own team schedule*, *Members can read linked team*, *Members can read school for linked team* in the schema.

- **Athlete invite links**  
  Invite URLs contain a **signed payload** (team id + expiry); only the server mints tokens (school-owner–gated) and verifies them on redeem. This avoids exposing long-lived secrets in the link beyond the token itself; **rotate `TEAM_INVITE_SECRET`** if you believe it was leaked (old links become invalid).

- **Post-login redirects**  
  The **`next`** query parameter is validated as a same-origin path (no `//…` open redirects) on email sign-in/sign-up and OAuth callback before redirect.

- **AI generation endpoint (`POST /api/generate`)**  
  - **401** for anonymous callers, **403** for non-designer roles—Replicate and Anthropic are not invoked without valid authorization.
  - **Per-user rate limits** via **Supabase** table `generation_rate_buckets` and RPC **`consume_generation_rate_limit`** (hourly + daily caps; tune with `GENERATE_RL_PER_HOUR` and `GENERATE_RL_PER_DAY`). **429** when limits are exceeded (`Retry-After` set when available).  
  - **503** if the RPC/table is missing (run [`supabase-migration-generation-rate-limit.sql`](supabase-migration-generation-rate-limit.sql) or full [`supabase-schema.sql`](supabase-schema.sql)).  
  - **`SKIP_GENERATE_RATE_LIMIT=1`** bypasses limits for trusted local testing only (never on public deployments).  
  - **Reference image URLs** in the JSON body must point at this project’s Supabase public **`generation-references`** objects only—reduces open-proxy and SSRF risk.  
  - Request bodies are validated with **Zod** before any external AI calls.

- **Secrets**  
  `REPLICATE_API_TOKEN`, `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, **`TEAM_INVITE_SECRET`** (invite signing), and Meta/Instagram secrets belong only in **server** environment variables (e.g. Vercel project settings, `.env.local`), not in `NEXT_PUBLIC_*` keys.

For more detail, see [`ARCHITECTURE.md`](ARCHITECTURE.md) (API table and security model).

## Tech Stack

- **Framework**: Next.js App Router, React 19, TypeScript
- **Styling/UI**: Tailwind CSS 4, shared UI primitives under `src/components/ui`
- **Data/Auth**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **Validation**: Zod
- **State**: Zustand
- **Rate limiting**: `/api/generate` uses **Supabase Postgres**; optional **Upstash Redis** for email login lockout (`@upstash/redis`, `@upstash/ratelimit`)
- **AI/Integrations**: Replicate (**Nano Banana Pro** / `google/nano-banana-pro`), Anthropic; Meta Graph API code paths exist for Instagram but are **not functional** yet
- **Testing**: Vitest

## Local Setup

### 1) Install and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 2) Create `.env.local`

Add the required variables below (fill with your own values):

```env
# Required app + auth/data
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Required for image generation API
REPLICATE_API_TOKEN=your-replicate-token

# Optional — email/password login lockout only (not used for /api/generate).
# UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
# UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# Optional: trusted local tests only — bypasses Supabase generate rate limits
# SKIP_GENERATE_RATE_LIMIT=1

# Optional caps (defaults: 15/hour, 50/day per authenticated user)
# GENERATE_RL_PER_HOUR=15
# GENERATE_RL_PER_DAY=50

# Optional but recommended for stronger prompt/copy generation
ANTHROPIC_API_KEY=your-anthropic-api-key

# Optional local dev bypass for auth/role checks in proxy.ts
# DEV_BYPASS_AUTH=true

# Signed athlete team invite links (POST /api/team-invite). Min 16 chars; use a long random value in production.
# openssl rand -hex 32
TEAM_INVITE_SECRET=your-random-secret-at-least-16-chars

# Instagram / Meta (needed only when IG integration is fixed and enabled)
# INSTAGRAM_META_APP_ID=your-meta-app-id
# INSTAGRAM_META_APP_SECRET=your-meta-app-secret
# INSTAGRAM_TOKEN_ENCRYPTION_KEY=base64-encoded-32-byte-key
```

When Instagram is enabled later, generate an encryption key with:

```bash
openssl rand -base64 32
```

### 3) Set up Supabase schema and seed data

In Supabase SQL Editor:

1. Run `supabase-schema.sql`
2. Run `supabase-seed-school.sql` after replacing `YOUR_MANAGER_USER_UID`
3. If your database already existed before `assets.schedule_id` was added, run `supabase-migration-assets-schedule-id.sql` to add the optional FK + index safely.

Detailed step-by-step instructions live in `docs/SUPABASE_SETUP.md`.

### 4) (Optional) Enable Google OAuth in Supabase

If using Google sign-in, set callback URL:

- `http://localhost:3000/auth/callback`
- In production, add `https://sideline-main.vercel.app/auth/callback` (and any preview deployment URLs you use)

## Deployment (Vercel)

The production build runs on [Vercel](https://vercel.com) as a standard **Next.js** project. The default deployment URL is [https://sideline-main.vercel.app/](https://sideline-main.vercel.app/).

1. **Connect the repo** in the Vercel dashboard and import this app. If the Git root is the monorepo folder above `sideline_main`, set **Root Directory** to `sideline_main` so Vercel runs `npm run build` from the correct package.

2. **Framework**: Vercel should detect Next.js automatically. Both **`npm run dev`** and **`npm run build`** use **`--webpack`** (see `package.json`) so dependencies like `@supabase/ssr` resolve cleanly; production runs the same webpack-based Next build on Vercel’s Node runtime.

3. **Environment variables**: Add the same keys you use locally in **Project → Settings → Environment Variables** (Production / Preview as needed):  
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `REPLICATE_API_TOKEN`, **`TEAM_INVITE_SECRET`** (required for **Copy athlete invite link** in production—without a valid 16+ char secret, `/api/team-invite` returns 503), and optionally `ANTHROPIC_API_KEY`, `GENERATE_RL_PER_HOUR`, `GENERATE_RL_PER_DAY`, **`UPSTASH_REDIS_REST_URL`** / **`UPSTASH_REDIS_REST_TOKEN`** (login lockout only), `SKIP_GENERATE_RATE_LIMIT` (never on production). Ensure Supabase has the **generation rate limit** migration applied so `/api/generate` does not return 503.  
   Do **not** assume Instagram env vars are required until Meta integration is complete.

4. **Supabase auth URLs**: In the Supabase dashboard, add **Site URL** `https://sideline-main.vercel.app` (or your custom domain) under **Authentication → URL configuration**, and put `https://sideline-main.vercel.app/auth/callback` in the redirect allow list along with `http://localhost:3000/auth/callback` for local dev and any preview URLs you use.

5. **Domain**: Assign a custom domain in Vercel if desired; update Supabase redirects to match.

After deploy, smoke-test sign-in, protected routes, and `/api/generate` (Replicate must be able to reach your deployed API).

### Instagram / Meta status

- **There is no working path today** to link an Instagram Business account and publish a generated image from the app. The UI and API stubs are in the codebase for when Meta app credentials, OAuth redirects, and Graph API publishing are fully configured and tested.
- Until then, designers should **download** generated assets and post manually to Instagram (or any channel).

## NPM Scripts.

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm run start` - run built app
- `npm run lint` - run ESLint
- `npm run test` - run unit tests once
- `npm run test:watch` - run tests in watch mode
- `npm run test:coverage` - run tests with coverage

## Testing and Coverage

- Tests run with **Vitest** and currently focus on core app utilities and route logic.
- Use `npm run test` for a quick validation pass during development.
- Use `npm run test:coverage` before opening a PR when behavior changes, so you can review impact in the local `coverage/` output.
- Coverage should be treated as a quality signal, not the only release gate; prioritize meaningful assertions around auth, role access, generation flow, and schedule/team data handling.

## Project Map

- `src/app` - App Router pages and API route handlers
- `src/components` - feature and UI components
- `src/lib` - Supabase helpers, auth helpers (`auth/loginLockout`), prompt builders, rate limiting (`rate-limit/`), schedule parsing (`schedule/**`, including **CSV** and **Excel** via `parseExcel.ts` + `xlsx`), **team invite signing** (`team-invite/token.ts`), **Replicate image model id** shared by API + Generator UI (`imageGen/replicateImageModel.ts`), editor utilities, store
- `src/proxy.ts` - session refresh + route access control
- `supabase-schema.sql` - schema, RLS, triggers, storage bucket setup
- `supabase-migration-assets-schedule-id.sql` - idempotent migration adding optional `assets.schedule_id` -> `schedules.id` linkage and index
- `supabase-seed-school.sql` - seed records for school/team/athlete schedule flows
- `docs/SUPABASE_SETUP.md` - guided Supabase setup
- `ARCHITECTURE.md` - deeper architecture and system notes

## Notes / Known Gaps

- **Meta / Instagram**: OAuth and publish routes exist but the integration does not work end-to-end yet—no dependable “connect account → post to IG” flow.
- Some flows still use local store/demo-style state in UI while the backend model continues to evolve.
- Teams, rosters, schedule import, and athlete invites live under **`/designer/team`** (navbar **Team**). Legacy **`/designer/program`** redirects there.
- Dependencies like `next-auth`, Prisma, and React Query exist in `package.json` but are not the primary app path today.
