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

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

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
-- DONE. After running this:
-- 1. Go to Authentication → Email Templates and customise if needed.
-- 2. For local dev, disable email confirmation:
--    Authentication → Settings → "Enable email confirmations" → OFF
-- ============================================================
