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
- **Profile bootstrap on signup** via DB trigger in `supabase-schema.sql` (`public.profiles` auto-created).

### Portals and pages

- **Landing** (`/`): branded entry page with sign in/sign up links. Live at [sideline-main.vercel.app](https://sideline-main.vercel.app/).
- **Auth** (`/auth` + `/auth/callback`): email/password + OAuth callback handling.
- **Designer dashboard** (`/designer`): asset list, status filtering, basic personal stats.
- **Designer create** (`/designer/create`): AI generation form with:
  - asset types (`gameday`, `final-score`, `poster`, `highlight`)
  - style, format, optional refinement chat
  - reference image upload (athlete/home logo/away logo)
  - save/publish flow
  - UI for Instagram connect/publish (not functional until Meta integration is complete—see **Instagram / Meta status**)
- **Athlete portal** (`/athlete`): published content consumption and interaction.
- **Student feed** (`/feed`): poster feed + grouped designer updates.
- **Live scores** (`/scores`): NCAA-backed scoreboard with fallback simulation.
- **Settings** (`/settings`): profile editing.
- **Manager flow still present** (`/manager`, `/manager/editor`) and backed by Supabase manager tables.

### API routes

- **`POST /api/generate`**
  - Requires a **signed-in Supabase user** (401 if anonymous)
  - **Rate limits** per user via **Upstash Redis** in production (hourly + daily caps; 503 if Redis env is missing in production)
  - Validates request body with Zod
  - Generates prompt/copy with Anthropic when configured (fallback prompt builder otherwise)
  - Generates image via Replicate FLUX.2 Pro
  - Enforces strict sanitization for reference image URLs (must come from this app's Supabase public references bucket)
- **Instagram API (scaffold only—not production-ready)**  
  Route handlers exist (`/api/instagram/connect`, `/oauth/callback`, `/status`, `/publish`) for Meta OAuth, token storage, and Graph publish. **The Meta app / API flow is not wired through successfully yet**, so users cannot complete “Connect Instagram” or post generated images to Instagram from this app. Treat this as future work once Meta app review, redirect URLs, and permissions are sorted.
- **`POST /api/auth/password-signin`**
  - Email + password sign-in with session cookies; enforces failed-attempt lockout via Redis (see **Security features**)
- **`GET /api/live-scores`**
  - Fetches NCAA scoreboard data across sports
  - Normalizes, deduplicates, and sorts live/upcoming/final games
  - Falls back to simulated data when NCAA source is unavailable

## Security features

- **Authentication and route gating**  
  Supabase Auth backs sign-in. [`src/proxy.ts`](src/proxy.ts) refreshes sessions and redirects unauthenticated users away from protected routes; signed-in users are kept in the correct role portal (`designer` / `athlete` / `student`). Optional `DEV_BYPASS_AUTH` is for local debugging only.

- **Email/password sign-in lockout (brute-force slowdown)**  
  - **Flow**: The auth UI does **not** call `signInWithPassword` on the browser for email/password. It **`POST`s to [`/api/auth/password-signin`](src/app/api/auth/password-signin/route.ts)** so the server validates credentials, applies lockout logic, and **sets Supabase session cookies** on success.  
  - **Rules** (see [`src/lib/auth/loginLockout.ts`](src/lib/auth/loginLockout.ts)): Failed attempts are counted per **normalized email** (trim + lowercase). Redis keys use **SHA-256 of that email**, not the raw address in the key. After **5** failed attempts within a **15-minute** rolling window, the account identifier is **locked for 10 minutes**. While locked, the API returns **429** with a **`Retry-After`** header (seconds). A **successful** sign-in **clears** both the failure counter and any lock.  
  - **Infrastructure**: Uses the same **`UPSTASH_REDIS_REST_URL`** and **`UPSTASH_REDIS_REST_TOKEN`** as AI rate limiting. If those are missing, **lockout is disabled** (local dev without Redis still works; production should set Upstash for both features).  
  - **OAuth**: **Google sign-in is unchanged** and does not go through this route or counter.  
  - **Limitation**: The public Supabase **anon** key can still be used to call Supabase Auth APIs directly outside this app; this lockout protects users going through **your** sign-in path and aligns sessions with the server route. Stronger guarantees require provider/network-level controls.

- **Database and storage access**  
  **Row Level Security (RLS)** on Postgres tables limits who can read/write rows (see [`supabase-schema.sql`](supabase-schema.sql)). **Storage** policies scope uploads to the authenticated user’s folder (`auth.uid()` as the first path segment). Reference images for AI live in **`generation-references`**; archived generated posters (stable URLs on save) use **`generated-posters`** so reference uploads stay separate from finished assets.

- **AI generation endpoint (`POST /api/generate`)**  
  - **401** for anonymous callers—Replicate and Anthropic are not invoked without a valid Supabase session.  
  - **Per-user rate limits** in production using **Upstash Redis** (sliding windows: hourly and daily caps; tune with `GENERATE_RL_PER_HOUR` and `GENERATE_RL_PER_DAY`). **429** when limits are exceeded (`Retry-After` set when available).  
  - **Fail closed in production** if Upstash env vars are missing (**503**) so the endpoint cannot run uncapped paid jobs.  
  - In local/non-production dev, rate limiting is **skipped** when Upstash is not configured.  
  - **Reference image URLs** in the JSON body must point at this project’s Supabase public **`generation-references`** objects only—reduces open-proxy and SSRF risk.  
  - Request bodies are validated with **Zod** before any external AI calls.

- **Secrets**  
  `REPLICATE_API_TOKEN`, `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, and Meta/Instagram secrets belong only in **server** environment variables (e.g. Vercel project settings, `.env.local`), not in `NEXT_PUBLIC_*` keys.

For more detail, see [`ARCHITECTURE.md`](ARCHITECTURE.md) (API table and security model).

## Tech Stack

- **Framework**: Next.js App Router, React 19, TypeScript
- **Styling/UI**: Tailwind CSS 4, shared UI primitives under `src/components/ui`
- **Data/Auth**: Supabase (`@supabase/supabase-js`, `@supabase/ssr`)
- **Validation**: Zod
- **State**: Zustand
- **Rate limiting (production AI)**: Upstash Redis (`@upstash/redis`, `@upstash/ratelimit`)
- **AI/Integrations**: Replicate, Anthropic; Meta Graph API code paths exist for Instagram but are **not functional** yet
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

# Required in production for /api/generate rate limits (Upstash Redis REST)
# Local dev works without these (limits skipped). Create a Redis database at https://upstash.com
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-upstash-token

# Optional caps (defaults: 15/hour, 50/day per authenticated user)
# GENERATE_RL_PER_HOUR=15
# GENERATE_RL_PER_DAY=50

# Optional but recommended for stronger prompt/copy generation
ANTHROPIC_API_KEY=your-anthropic-api-key

# Optional local dev bypass for auth/role checks in proxy.ts
# DEV_BYPASS_AUTH=true

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

Detailed step-by-step instructions live in `docs/SUPABASE_SETUP.md`.

### 4) (Optional) Enable Google OAuth in Supabase

If using Google sign-in, set callback URL:

- `http://localhost:3000/auth/callback`
- In production, add `https://sideline-main.vercel.app/auth/callback` (and any preview deployment URLs you use)

## Deployment (Vercel)

The production build runs on [Vercel](https://vercel.com) as a standard **Next.js** project. The default deployment URL is [https://sideline-main.vercel.app/](https://sideline-main.vercel.app/).

1. **Connect the repo** in the Vercel dashboard and import this app. If the Git root is the monorepo folder above `sideline_main`, set **Root Directory** to `sideline_main` so Vercel runs `npm run build` from the correct package.

2. **Framework**: Vercel should detect Next.js automatically. The dev script uses `next dev --webpack`; production uses the default `next build` / Node runtime for App Router and API routes.

3. **Environment variables**: Add the same keys you use locally in **Project → Settings → Environment Variables** (Production / Preview as needed):  
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `REPLICATE_API_TOKEN`, **`UPSTASH_REDIS_REST_URL`**, **`UPSTASH_REDIS_REST_TOKEN`** (required for production generate rate limits—without them, `/api/generate` returns 503), and optionally `ANTHROPIC_API_KEY`, `GENERATE_RL_PER_HOUR`, `GENERATE_RL_PER_DAY`.  
   Do **not** assume Instagram env vars are required until Meta integration is complete.

4. **Supabase auth URLs**: In the Supabase dashboard, add **Site URL** `https://sideline-main.vercel.app` (or your custom domain) under **Authentication → URL configuration**, and put `https://sideline-main.vercel.app/auth/callback` in the redirect allow list along with `http://localhost:3000/auth/callback` for local dev and any preview URLs you use.

5. **Domain**: Assign a custom domain in Vercel if desired; update Supabase redirects to match.

After deploy, smoke-test sign-in, protected routes, and `/api/generate` (Replicate must be able to reach your deployed API).

### Instagram / Meta status

- **There is no working path today** to link an Instagram Business account and publish a generated image from the app. The UI and API stubs are in the codebase for when Meta app credentials, OAuth redirects, and Graph API publishing are fully configured and tested.
- Until then, designers should **download** generated assets and post manually to Instagram (or any channel).

## NPM Scripts

- `npm run dev` - start local dev server
- `npm run build` - production build
- `npm run start` - run built app
- `npm run lint` - run ESLint
- `npm run test` - run unit tests once
- `npm run test:watch` - run tests in watch mode
- `npm run test:coverage` - run tests with coverage

## Project Map

- `src/app` - App Router pages and API route handlers
- `src/components` - feature and UI components
- `src/lib` - Supabase helpers, auth helpers (`auth/loginLockout`), prompt builders, rate limiting (`rate-limit/`), schedule parsing, editor utilities, store
- `src/proxy.ts` - session refresh + route access control
- `supabase-schema.sql` - schema, RLS, triggers, storage bucket setup
- `supabase-seed-school.sql` - seed records for school/team/athlete schedule flows
- `docs/SUPABASE_SETUP.md` - guided Supabase setup
- `ARCHITECTURE.md` - deeper architecture and system notes

## Notes / Known Gaps

- **Meta / Instagram**: OAuth and publish routes exist but the integration does not work end-to-end yet—no dependable “connect account → post to IG” flow.
- Some flows still use local store/demo-style state in UI while the backend model continues to evolve.
- Manager experience remains in the repo but is no longer highlighted on landing.
- Dependencies like `next-auth`, Prisma, and React Query exist in `package.json` but are not the primary app path today.
