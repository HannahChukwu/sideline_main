-- Add optional assets.schedule_id for match linkage.
-- Safe to run multiple times across environments.

alter table public.assets
  add column if not exists schedule_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'assets_schedule_id_fkey'
  ) then
    alter table public.assets
      add constraint assets_schedule_id_fkey
      foreign key (schedule_id)
      references public.schedules(id)
      on delete set null;
  end if;
end $$;

create index if not exists assets_schedule_id_idx on public.assets (schedule_id);
