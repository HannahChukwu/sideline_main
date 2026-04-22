-- ============================================================
-- Sideline Studio — Athlete invite self-registration policy
--
-- Why:
--   Invite redemption now auto-creates an athlete roster row (if missing),
--   so "My Pictures" works immediately for invited athletes.
--   This policy allows authenticated athlete accounts to insert only
--   themselves into their linked team roster.
-- ============================================================

drop policy if exists "Athletes can self-register in linked team roster" on public.athletes;
create policy "Athletes can self-register in linked team roster"
  on public.athletes for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'athlete'
        and p.team_id = athletes.team_id
    )
  );
