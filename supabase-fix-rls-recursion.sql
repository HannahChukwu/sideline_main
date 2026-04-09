-- ============================================================
-- Fix: "infinite recursion detected in policy for relation schools"
-- Run once in Supabase SQL Editor (Dashboard → SQL → New query).
--
-- Cause: teams/athletes/schedules policies subqueried public.schools under RLS,
-- while schools policies reference teams → Postgres detects a policy cycle.
--
-- Fix: SECURITY DEFINER helpers read schools/teams without re-entering RLS.
-- ============================================================

create or replace function public.school_managed_by_user(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.schools
    where id = p_school_id and manager_id = auth.uid()
  );
$$;

create or replace function public.team_managed_by_user(p_team_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.teams t
    inner join public.schools s on s.id = t.school_id
    where t.id = p_team_id and s.manager_id = auth.uid()
  );
$$;

revoke all on function public.school_managed_by_user(uuid) from public;
grant execute on function public.school_managed_by_user(uuid) to authenticated;

revoke all on function public.team_managed_by_user(uuid) from public;
grant execute on function public.team_managed_by_user(uuid) to authenticated;

drop policy if exists "Managers can manage teams for own school" on public.teams;
create policy "Managers can manage teams for own school"
  on public.teams for all
  using (public.school_managed_by_user(school_id))
  with check (public.school_managed_by_user(school_id));

drop policy if exists "Managers can manage athletes for own school" on public.athletes;
create policy "Managers can manage athletes for own school"
  on public.athletes for all
  using (public.team_managed_by_user(team_id))
  with check (public.team_managed_by_user(team_id));

drop policy if exists "Managers can manage schedules for own school" on public.schedules;
create policy "Managers can manage schedules for own school"
  on public.schedules for all
  using (public.team_managed_by_user(team_id))
  with check (public.team_managed_by_user(team_id));

drop policy if exists "Managers can manage logos for own school" on public.logos;
create policy "Managers can manage logos for own school"
  on public.logos for all
  using (
    (school_id is not null and public.school_managed_by_user(school_id))
    or
    (team_id is not null and public.team_managed_by_user(team_id))
  )
  with check (
    (school_id is not null and public.school_managed_by_user(school_id))
    or
    (team_id is not null and public.team_managed_by_user(team_id))
  );
