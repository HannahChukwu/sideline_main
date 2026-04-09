# Supabase setup: schema + first school/team

## Part 1 — Run the full schema

1. Open [Supabase Dashboard](https://supabase.com/dashboard) and select your project (the one whose URL/keys are in your `.env.local`).

2. In the left sidebar, go to **SQL Editor**.

3. Click **New query**.

4. Open your project’s `supabase-schema.sql` (repo root), copy its **entire** contents, and paste into the SQL Editor.

5. Click **Run** (or press Cmd/Ctrl+Enter).

6. Confirm it succeeds (no red errors). You should see “Success. No rows returned.” Tables created: `profiles`, `schools`, `teams`, `athletes`, `schedules`, `logos`, `manager_drafts`, `draft_reference_images`, **`generation_rate_buckets`** (for `/api/generate` rate limits), plus RLS policies and RPC **`consume_generation_rate_limit`**. The schema also defines Storage bucket **`generation-references`** (public read, authenticated upload to `/{user_id}/…`) for designer reference images used with AI generation. If you added the bucket SQL in a later edit, re-run the full `supabase-schema.sql` or the storage block at the end of that file so uploads from `/designer/create` succeed.

---

## Part 2 — Get your designer user ID

You need the UUID of the user who will own the school data (designer account).

1. In the Supabase Dashboard left sidebar, go to **Authentication** → **Users**.

2. Find the user you use to sign in (e.g. your Google account or email). Click the row to open details.

3. Copy the **User UID** (a UUID like `a1b2c3d4-e5f6-7890-abcd-ef1234567890`).  
   If you haven’t created a user yet, sign up once in your app (e.g. via Google or email), then come back and copy that user’s UID.

4. (Optional) Ensure that user has role **designer** so they can use the designer portal:
   - In **Table Editor** → **profiles**, find the row with `id` = that User UID and set `role` to `designer` if it isn’t already.

---

## Part 3 — Create one school and one team

1. In the SQL Editor, click **New query** again.

2. Paste the contents of `supabase-seed-school.sql` (see below or the file in the repo).

3. In that SQL, **replace** the placeholder `YOUR_DESIGNER_USER_UID` with the actual User UID you copied (keep the single quotes).

4. Click **Run**.

5. You should see “Success” and 1 row for `schools` and 1 row for `teams`. Optionally run the athletes seed as well (see `supabase-seed-school.sql`).

---

## Part 4 — Verify in the app

1. Start your app (`npm run dev`) and sign in as that designer user.

2. Open **Team** (`/designer/team`) — under **Teams, players & schedules** you should see your school’s team (e.g. “Ridgeline High — Lions • Football • 2025-2026”) from Supabase.

3. Use **Generator** (`/designer/create`) to pick that team, athletes, and a match after you’ve imported a schedule.

If you still see only mock teams, double-check:
- The user you’re signed in as has the same User UID you used in the seed.
- RLS is enabled and the policies ran (Part 1). You can inspect tables in **Table Editor** and confirm the `schools` and `teams` rows exist.

### “Add team” fails (RLS / permission)

If the Team page shows a database or RLS error when adding a school or team, re-apply the **`WITH CHECK`** clauses from the latest `supabase-schema.sql` (policies **Managers can manage own school**, **Managers can manage teams for own school**, **athletes**, **schedules**). In the SQL Editor, run the `DROP POLICY` / `CREATE POLICY` blocks for those four names so **inserts** are explicitly allowed for the school owner.

Also confirm you are **signed in** as a designer; expired sessions produce RLS denials. Sign out and back in if needed.

### Schedule import: “Could not find the 'updated_at' column of 'schedules'”

Your `schedules` table may predate an `updated_at` column. The app **does not send** `updated_at` on import anymore (defaults apply when the column exists). If you still want the column, run **`supabase-migration-schedules-updated-at.sql`** once.

### “Infinite recursion detected in policy for relation schools”

That happens when policies on `schools` and `teams` reference each other through subqueries under RLS. Run **`supabase-fix-rls-recursion.sql`** once in the SQL Editor (it adds `school_managed_by_user` / `team_managed_by_user` and updates the **teams**, **athletes**, **schedules**, and **logos** manager policies). Fresh installs already include this in `supabase-schema.sql` section 5.

### Storage upload fails for large AI images (e.g. “exceeds storage limit”)

Reference and generated-poster buckets allow **20MB** per file in current `supabase-schema.sql`. If your project was created with the old **5MB** limit, run **`supabase-migration-storage-image-size-20mb.sql`** once in the SQL Editor.

### `/api/generate` returns 503 about rate limiting / migration

The app uses Postgres for generate caps. If you created the project before that was added to `supabase-schema.sql`, run **`supabase-migration-generation-rate-limit.sql`** once in the SQL Editor. Step-by-step: [`GENERATION_RATE_LIMIT_SETUP.md`](GENERATION_RATE_LIMIT_SETUP.md).
