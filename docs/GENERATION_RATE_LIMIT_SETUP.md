# Generation rate limits (Supabase Postgres)

`/api/generate` enforces **per-user** caps using Postgres, not Redis:

- Table: **`generation_rate_buckets`**
- RPC: **`consume_generation_rate_limit(p_per_hour, p_per_day)`** (defaults 15 / 50; overridden by env `GENERATE_RL_PER_HOUR` and `GENERATE_RL_PER_DAY`)

The slot is consumed **after** the request passes auth and body validation and **before** Claude/Replicate run. A **failed** image generation still counts (same as the previous Upstash behavior).

Buckets use `date_trunc('hour', now())` and `date_trunc('day', now())` in the database (Supabase projects usually use **UTC**).

---

## What you must do manually (the app / agent cannot do this for you)

### A) If this is a **new** Supabase project

1. In [Supabase Dashboard](https://supabase.com/dashboard) → your project → **SQL Editor**.
2. Paste and run the full **`supabase-schema.sql`** from the repo (as in [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md)).  
   That file now includes **`generation_rate_buckets`** and **`consume_generation_rate_limit`**.

### B) If you **already** ran an older `supabase-schema.sql` (before this feature)

1. Open **SQL Editor** in the same project that your app’s `NEXT_PUBLIC_SUPABASE_URL` points to.
2. Open the repo file **`supabase-migration-generation-rate-limit.sql`**.
3. Copy its **entire** contents, paste into a new query, click **Run**.
4. Confirm **Success** (no red errors).

### C) Deploy on **Vercel** (or any host)

1. You do **not** need `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` for `/api/generate`.
2. You **do** need valid **`NEXT_PUBLIC_SUPABASE_URL`** and **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** so the API route can call the RPC with the user’s session.
3. Redeploy after the SQL migration is applied.

### D) Verify

1. Sign in to the app as any user.
2. Trigger a generation from **Generator**. If the migration is missing, the API returns **503** with a message about applying the migration.
3. Optional: in Supabase **Table Editor**, open **`generation_rate_buckets`** — after a successful generation you should see rows for that `user_id` with `bucket_kind` **`hour`** and **`day`**.

### E) Optional escape hatch (local only)

- Set **`SKIP_GENERATE_RATE_LIMIT=1`** in `.env.local` only on a **trusted** machine.  
- **Do not** set this in Vercel production.

---

## What the codebase already does for you

- `src/lib/rate-limit/generateRateLimit.ts` calls `supabase.rpc('consume_generation_rate_limit', …)`.
- `src/app/api/generate/route.ts` returns **429** + `Retry-After` when the RPC reports the hourly or daily cap.

If anything fails, check the **`detail`** field on the **503** JSON response for the raw PostgREST / Postgres error (e.g. undefined function → migration not run).
