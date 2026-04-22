-- ============================================================
-- Sideline Studio — Athlete photo library
-- ============================================================

-- 1) Link profile -> roster athlete (optional but enables identity mapping)
alter table public.profiles
  add column if not exists athlete_id uuid references public.athletes(id) on delete set null;

create index if not exists profiles_athlete_id_idx
  on public.profiles (athlete_id);

-- 2) Athlete photo metadata table
create table if not exists public.athlete_photos (
  id            uuid primary key default gen_random_uuid(),
  athlete_id    uuid        not null references public.athletes(id) on delete cascade,
  uploaded_by   uuid        not null references auth.users(id) on delete cascade,
  storage_path  text        not null,
  mime_type     text        not null,
  original_name text,
  created_at    timestamptz not null default now()
);

create index if not exists athlete_photos_athlete_id_idx
  on public.athlete_photos (athlete_id);

create index if not exists athlete_photos_uploaded_by_idx
  on public.athlete_photos (uploaded_by);

alter table public.athlete_photos enable row level security;

-- Athletes can read/manage photos they uploaded.
drop policy if exists "Athletes can read own uploaded photos" on public.athlete_photos;
create policy "Athletes can read own uploaded photos"
  on public.athlete_photos for select
  to authenticated
  using (uploaded_by = auth.uid());

drop policy if exists "Athletes can insert own uploaded photos" on public.athlete_photos;
create policy "Athletes can insert own uploaded photos"
  on public.athlete_photos for insert
  to authenticated
  with check (uploaded_by = auth.uid());

drop policy if exists "Athletes can delete own uploaded photos" on public.athlete_photos;
create policy "Athletes can delete own uploaded photos"
  on public.athlete_photos for delete
  to authenticated
  using (uploaded_by = auth.uid());

-- Designers can read athlete photos for teams they manage.
drop policy if exists "Designers can read managed team athlete photos" on public.athlete_photos;
create policy "Designers can read managed team athlete photos"
  on public.athlete_photos for select
  to authenticated
  using (
    exists (
      select 1
      from public.athletes a
      where a.id = athlete_photos.athlete_id
        and public.team_managed_by_user(a.team_id)
    )
  );

-- 3) Storage bucket for athlete photos
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'athlete-photos',
  'athlete-photos',
  true,
  20971520,
  array['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read athlete-photos" on storage.objects;
create policy "Public read athlete-photos"
  on storage.objects for select
  using (bucket_id = 'athlete-photos');

drop policy if exists "Authenticated insert own athlete-photos folder" on storage.objects;
create policy "Authenticated insert own athlete-photos folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'athlete-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated update own athlete-photos folder" on storage.objects;
create policy "Authenticated update own athlete-photos folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'athlete-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Authenticated delete own athlete-photos folder" on storage.objects;
create policy "Authenticated delete own athlete-photos folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'athlete-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
