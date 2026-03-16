-- ============================================================
-- Seed: one school + one team (and optional athletes)
-- Run this AFTER supabase-schema.sql.
-- Replace YOUR_MANAGER_USER_UID with the real UUID from:
--   Dashboard → Authentication → Users → [your user] → User UID
-- ============================================================

-- 1. Insert school (one per manager for now)
insert into public.schools (id, name, manager_id)
values (
  gen_random_uuid(),
  'Ridgeline High',
  'YOUR_MANAGER_USER_UID'::uuid
)
returning id, name, manager_id;

-- 2. Insert one team under that school
--    Use the school id from the row just created, or run both in one go:
insert into public.teams (school_id, team_name, sport, season)
select
  s.id,
  'Lions',
  'Football',
  '2025-2026'
from public.schools s
where s.manager_id = 'YOUR_MANAGER_USER_UID'::uuid
limit 1
returning id, team_name, sport, season;

-- 3. (Optional) Add athletes to the Lions team for that manager
--    Run this in the same session after step 2, or in a new query (same YOUR_MANAGER_USER_UID):
/*
insert into public.athletes (team_id, full_name, number, position)
select t.id, a.full_name, a.number, a.position
from public.teams t
join public.schools s on s.id = t.school_id and s.manager_id = 'YOUR_MANAGER_USER_UID'::uuid
cross join (values
  ('Jordan Miles', '7', 'QB'),
  ('Sam Carter', '22', 'RB'),
  ('Avery Chen', '11', 'WR')
) as a(full_name, number, position)
where t.team_name = 'Lions';
*/
