-- ============================================================
-- Sideline Studio — Supabase Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. PROFILES TABLE
--    Stores role + display info for every user.
--    Linked to auth.users via foreign key.
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  role        text        not null check (role in ('designer', 'athlete', 'student')),
  full_name   text,
  email       text,
  created_at  timestamptz not null default now()
);



-- 2. ROW LEVEL SECURITY
--    Users can only read/update their own profile.
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 3. AUTO-CREATE PROFILE ON SIGNUP
--    Reads `role` and `full_name` from user metadata set during signUp().
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, role, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    new.raw_user_meta_data ->> 'full_name'
  );
  return new;
end;
$$;

-- Drop trigger if it already exists (safe for re-runs)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure public.handle_new_user();

-- ============================================================
-- 4. MANAGER DATA MODEL (SCHOOLS, TEAMS, ATHLETES, SCHEDULES)
--    These power the manager workflow (teams, rosters, schedules).
-- ============================================================

create table if not exists public.schools (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  manager_id  uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.teams (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid        not null references public.schools(id) on delete cascade,
  team_name   text        not null,
  sport       text        not null,
  season      text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.athletes (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid        not null references public.teams(id) on delete cascade,
  full_name   text        not null,
  number      text,
  position    text,
  created_at  timestamptz not null default now()
);

create table if not exists public.schedules (
  id          uuid primary key default gen_random_uuid(),
  team_id     uuid        not null references public.teams(id) on delete cascade,
  opponent    text        not null,
  date_time   timestamptz,
  date_text   text,
  time_text   text,
  location    text,
  home_away   text        check (home_away in ('home','away','neutral')),
  home_score  integer,
  away_score  integer,
  final       boolean     not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Logos for schools/teams (stored in Supabase Storage; this table tracks paths)
create table if not exists public.logos (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid references public.schools(id) on delete cascade,
  team_id       uuid references public.teams(id) on delete cascade,
  storage_path  text        not null,
  mime_type     text        not null,
  original_name text,
  created_at    timestamptz not null default now()
);

alter table public.logos drop constraint if exists logos_ref_check;
alter table public.logos add constraint logos_ref_check
  check ((school_id is not null) or (team_id is not null));

-- Drafts for the manager workflow (replaces local-only draft store)
create table if not exists public.manager_drafts (
  id                       uuid primary key default gen_random_uuid(),
  manager_id               uuid        not null references auth.users(id) on delete cascade,
  generation_request       jsonb       not null,
  compiled_image_prompt    text,
  compiled_caption_prompt  text,
  reference_image_ids      jsonb       not null default '[]'::jsonb,
  editor_copy              jsonb,
  editor_layout            jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create table if not exists public.draft_reference_images (
  id            uuid primary key default gen_random_uuid(),
  draft_id      uuid        not null references public.manager_drafts(id) on delete cascade,
  storage_path  text        not null,
  mime_type     text        not null,
  original_name text,
  created_at    timestamptz not null default now()
);

-- ============================================================
-- 5. ROW LEVEL SECURITY FOR MANAGER ENTITIES
--    Each manager (designer) only sees their own school/teams/data.
-- ============================================================

alter table public.schools enable row level security;

drop policy if exists "Managers can manage own school" on public.schools;
create policy "Managers can manage own school"
  on public.schools for all
  using (manager_id = auth.uid());

alter table public.teams enable row level security;

drop policy if exists "Managers can manage teams for own school" on public.teams;
create policy "Managers can manage teams for own school"
  on public.teams for all
  using (
    school_id in (
      select id from public.schools where manager_id = auth.uid()
    )
  );

alter table public.athletes enable row level security;

drop policy if exists "Managers can manage athletes for own school" on public.athletes;
create policy "Managers can manage athletes for own school"
  on public.athletes for all
  using (
    team_id in (
      select t.id
      from public.teams t
      join public.schools s on t.school_id = s.id
      where s.manager_id = auth.uid()
    )
  );

alter table public.schedules enable row level security;

drop policy if exists "Managers can manage schedules for own school" on public.schedules;
create policy "Managers can manage schedules for own school"
  on public.schedules for all
  using (
    team_id in (
      select t.id
      from public.teams t
      join public.schools s on t.school_id = s.id
      where s.manager_id = auth.uid()
    )
  );

alter table public.logos enable row level security;

drop policy if exists "Managers can manage logos for own school" on public.logos;
create policy "Managers can manage logos for own school"
  on public.logos for all
  using (
    (school_id is not null and school_id in (
      select id from public.schools where manager_id = auth.uid()
    ))
    or
    (team_id is not null and team_id in (
      select t.id
      from public.teams t
      join public.schools s on t.school_id = s.id
      where s.manager_id = auth.uid()
    ))
  );

alter table public.manager_drafts enable row level security;

drop policy if exists "Managers can manage own drafts" on public.manager_drafts;
create policy "Managers can manage own drafts"
  on public.manager_drafts for all
  using (manager_id = auth.uid());

alter table public.draft_reference_images enable row level security;

drop policy if exists "Managers can manage reference images for own drafts" on public.draft_reference_images;
create policy "Managers can manage reference images for own drafts"
  on public.draft_reference_images for all
  using (
    draft_id in (
      select id from public.manager_drafts where manager_id = auth.uid()
    )
  );

-- ============================================================
-- 6. PUBLISHED ASSETS + LIKES (FEEDS)
--    Canonical feed content for student/athlete + designer library.
-- ============================================================

create table if not exists public.assets (
  id                  uuid primary key default gen_random_uuid(),
  designer_id          uuid        not null references auth.users(id) on delete cascade,
  school_id            uuid        references public.schools(id) on delete set null,
  team_id              uuid        references public.teams(id) on delete set null,
  schedule_id          uuid        references public.schedules(id) on delete set null,
  title                text        not null,
  type                 text        not null check (type in ('gameday','final-score','poster','highlight')),
  status               text        not null default 'draft' check (status in ('draft','published','archived')),
  sport                text        not null,
  home_team            text        not null,
  away_team            text        not null,
  home_score           integer,
  away_score           integer,
  event_date           date        not null,
  image_url            text,
  image_storage_path   text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  published_at         timestamptz
);

-- Needed for PostgREST embeds like: profiles:designer_id(full_name)
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assets_designer_profile_fkey'
  ) then
    alter table public.assets
      add constraint assets_designer_profile_fkey
      foreign key (designer_id)
      references public.profiles(id)
      on delete cascade;
  end if;
end $$;

create index if not exists assets_published_at_idx on public.assets (published_at desc);
create index if not exists assets_status_idx on public.assets (status);
create index if not exists assets_designer_id_idx on public.assets (designer_id);
create index if not exists assets_school_id_idx on public.assets (school_id);
create index if not exists assets_team_id_idx on public.assets (team_id);

create table if not exists public.asset_likes (
  asset_id    uuid not null references public.assets(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (asset_id, user_id)
);

create index if not exists asset_likes_asset_id_idx on public.asset_likes (asset_id);
create index if not exists asset_likes_user_id_idx on public.asset_likes (user_id);

alter table public.assets enable row level security;
alter table public.asset_likes enable row level security;

-- ============================================================
-- 7. INSTAGRAM CONNECTIONS (designer only)
--    Stores the connected Instagram user id + encrypted token.
-- ============================================================
create table if not exists public.instagram_accounts (
  user_id                 uuid primary key references auth.users(id) on delete cascade,
  ig_user_id              text not null,
  access_token_encrypted text not null,
  connected_at            timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.instagram_accounts enable row level security;

drop policy if exists "Users can view own Instagram account" on public.instagram_accounts;
create policy "Users can view own Instagram account"
  on public.instagram_accounts for select
  using (user_id = auth.uid());

drop policy if exists "Users can upsert own Instagram account" on public.instagram_accounts;
create policy "Users can upsert own Instagram account"
  on public.instagram_accounts for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Assets policies:
-- - Everyone authenticated can read published assets.
-- - Designers can read their own drafts/archived.
-- - Designers can insert/update/delete their own assets.
drop policy if exists "Authenticated can read published assets" on public.assets;
create policy "Authenticated can read published assets"
  on public.assets for select
  using (status = 'published');

drop policy if exists "Designers can read own assets" on public.assets;
create policy "Designers can read own assets"
  on public.assets for select
  using (designer_id = auth.uid());

drop policy if exists "Designers can insert own assets" on public.assets;
create policy "Designers can insert own assets"
  on public.assets for insert
  with check (designer_id = auth.uid());

drop policy if exists "Designers can update own assets" on public.assets;
create policy "Designers can update own assets"
  on public.assets for update
  using (designer_id = auth.uid())
  with check (designer_id = auth.uid());

drop policy if exists "Designers can delete own assets" on public.assets;
create policy "Designers can delete own assets"
  on public.assets for delete
  using (designer_id = auth.uid());

-- Likes policies:
-- - Anyone authenticated can read likes on published assets.
-- - Users can like/unlike as themselves.
drop policy if exists "Authenticated can read likes for published assets" on public.asset_likes;
create policy "Authenticated can read likes for published assets"
  on public.asset_likes for select
  using (
    asset_id in (
      select id from public.assets where status = 'published'
    )
  );

drop policy if exists "Users can like as themselves" on public.asset_likes;
create policy "Users can like as themselves"
  on public.asset_likes for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can unlike as themselves" on public.asset_likes;
create policy "Users can unlike as themselves"
  on public.asset_likes for delete
  using (user_id = auth.uid());

-- ============================================================
-- STORAGE — AI generation reference images (public read for Replicate)
-- Path convention: {auth.uid()}/{uuid}.{ext}
-- Re-run safe: policies use DROP IF EXISTS.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generation-references',
  'generation-references',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read generation-references" on storage.objects;
create policy "Public read generation-references"
  on storage.objects for select
  using (bucket_id = 'generation-references');

drop policy if exists "Authenticated insert own generation-references" on storage.objects;
create policy "Authenticated insert own generation-references"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'generation-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated update own generation-references" on storage.objects;
create policy "Authenticated update own generation-references"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'generation-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated delete own generation-references" on storage.objects;
create policy "Authenticated delete own generation-references"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'generation-references'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- DONE. After running this:
-- 1. Go to Authentication → Email Templates and customise if needed.
-- 2. For local dev, disable email confirmation:
--    Authentication → Settings → "Enable email confirmations" → OFF
-- 3. Create at least one school row for your manager user so the
--    manager workflow can attach teams/athletes/schedules to it.
-- 4. Storage: bucket generation-references holds designer reference uploads;
--    ensure NEXT_PUBLIC_SUPABASE_URL in .env matches this project.
-- ============================================================
