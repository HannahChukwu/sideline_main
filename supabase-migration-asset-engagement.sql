-- ============================================================
-- Sideline Studio — Cross-profile likes & views for posters
--
-- Why a separate, text-keyed table set?
--   The existing `asset_likes` table FK-references `public.assets(id)` (uuid),
--   which only works for posters created via the full Supabase pipeline.
--   The current Generator + mock feed assets use plain string ids
--   (`"1"`, `"2"`, or short uid strings) and aren't always persisted in
--   `assets`. To make likes/views work live across every profile for all
--   posters the UI shows today, we key engagement by a free-form `asset_key text`.
--
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor). Re-run safe.
-- ============================================================

create table if not exists public.asset_engagement_likes (
  asset_key   text        not null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (asset_key, user_id)
);

create index if not exists asset_engagement_likes_asset_key_idx
  on public.asset_engagement_likes (asset_key);

create index if not exists asset_engagement_likes_user_id_idx
  on public.asset_engagement_likes (user_id);

create table if not exists public.asset_engagement_views (
  asset_key   text        not null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  first_at    timestamptz not null default now(),
  last_at     timestamptz not null default now(),
  view_count  integer     not null default 1 check (view_count >= 0),
  primary key (asset_key, user_id)
);

create index if not exists asset_engagement_views_asset_key_idx
  on public.asset_engagement_views (asset_key);

alter table public.asset_engagement_likes enable row level security;
alter table public.asset_engagement_views enable row level security;

-- Likes: anyone authenticated can read all counts; users insert/delete only as themselves.
drop policy if exists "Authenticated can read engagement likes" on public.asset_engagement_likes;
create policy "Authenticated can read engagement likes"
  on public.asset_engagement_likes for select
  to authenticated
  using (true);

drop policy if exists "Users can like as themselves (engagement)" on public.asset_engagement_likes;
create policy "Users can like as themselves (engagement)"
  on public.asset_engagement_likes for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can unlike as themselves (engagement)" on public.asset_engagement_likes;
create policy "Users can unlike as themselves (engagement)"
  on public.asset_engagement_likes for delete
  to authenticated
  using (user_id = auth.uid());

-- Views: anyone authenticated can read; users can upsert/update their own row only.
drop policy if exists "Authenticated can read engagement views" on public.asset_engagement_views;
create policy "Authenticated can read engagement views"
  on public.asset_engagement_views for select
  to authenticated
  using (true);

drop policy if exists "Users can record own view" on public.asset_engagement_views;
create policy "Users can record own view"
  on public.asset_engagement_views for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "Users can bump own view" on public.asset_engagement_views;
create policy "Users can bump own view"
  on public.asset_engagement_views for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Convenience RPC: idempotent "I viewed this poster" — bumps the calling user's
-- per-asset view counter, creating the row on first view. The total view count
-- shown for an asset is SUM(view_count) across users (we keep multi-views).
create or replace function public.record_asset_view(p_asset_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    return;
  end if;
  if p_asset_key is null or length(p_asset_key) = 0 or length(p_asset_key) > 200 then
    return;
  end if;

  insert into public.asset_engagement_views (asset_key, user_id, first_at, last_at, view_count)
  values (p_asset_key, uid, now(), now(), 1)
  on conflict (asset_key, user_id)
  do update set
    last_at    = now(),
    view_count = public.asset_engagement_views.view_count + 1;
end;
$$;

revoke all on function public.record_asset_view(text) from public;
grant execute on function public.record_asset_view(text) to authenticated;
