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
  created_at  timestamptz not null default now()
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
-- DONE. After running this:
-- 1. Go to Authentication → Email Templates and customise if needed.
-- 2. For local dev, disable email confirmation:
--    Authentication → Settings → "Enable email confirmations" → OFF
-- 3. Create at least one school row for your manager user so the
--    manager workflow can attach teams/athletes/schedules to it.
-- ============================================================
