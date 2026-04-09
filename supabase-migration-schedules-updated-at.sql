-- Optional: add schedules.updated_at if your project was created from an older schema.
-- Run in SQL Editor if you want the column for auditing (the app no longer requires it).

alter table public.schedules
  add column if not exists updated_at timestamptz not null default now();
