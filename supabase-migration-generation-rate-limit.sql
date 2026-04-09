-- ============================================================
-- Migration: Supabase-backed /api/generate rate limits
-- Run once in Supabase SQL Editor if the project already exists.
-- (Fresh installs: included in supabase-schema.sql.)
-- Buckets use the database timezone (Supabase defaults to UTC).
-- ============================================================

create table if not exists public.generation_rate_buckets (
  user_id       uuid        not null references auth.users (id) on delete cascade,
  bucket_kind   text        not null check (bucket_kind in ('hour', 'day')),
  bucket_start  timestamptz not null,
  request_count int         not null default 0 check (request_count >= 0),
  primary key (user_id, bucket_kind, bucket_start)
);

create index if not exists generation_rate_buckets_user_idx
  on public.generation_rate_buckets (user_id);

alter table public.generation_rate_buckets enable row level security;

revoke all on public.generation_rate_buckets from public;

create or replace function public.consume_generation_rate_limit(
  p_per_hour int default 15,
  p_per_day int default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
  hb timestamptz;
  db timestamptz;
  hcur int;
  dcur int;
begin
  uid := auth.uid();
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_authenticated', 'retry_after_sec', 0);
  end if;

  if p_per_hour < 1 or p_per_hour > 10000 or p_per_day < 1 or p_per_day > 10000 then
    return jsonb_build_object('ok', false, 'reason', 'bad_limits', 'retry_after_sec', 0);
  end if;

  hb := date_trunc('hour', now());
  db := date_trunc('day', now());

  perform pg_advisory_xact_lock(hashtext(uid::text));

  insert into public.generation_rate_buckets (user_id, bucket_kind, bucket_start, request_count)
  values
    (uid, 'hour', hb, 0),
    (uid, 'day', db, 0)
  on conflict do nothing;

  select request_count into hcur
  from public.generation_rate_buckets
  where user_id = uid and bucket_kind = 'hour' and bucket_start = hb
  for update;

  select request_count into dcur
  from public.generation_rate_buckets
  where user_id = uid and bucket_kind = 'day' and bucket_start = db
  for update;

  if hcur >= p_per_hour then
    return jsonb_build_object(
      'ok', false,
      'reason', 'hour',
      'retry_after_sec', greatest(1, extract(epoch from (hb + interval '1 hour' - now()))::int)
    );
  end if;

  if dcur >= p_per_day then
    return jsonb_build_object(
      'ok', false,
      'reason', 'day',
      'retry_after_sec', greatest(1, extract(epoch from (db + interval '1 day' - now()))::int)
    );
  end if;

  update public.generation_rate_buckets
  set request_count = request_count + 1
  where user_id = uid and bucket_kind = 'hour' and bucket_start = hb;

  update public.generation_rate_buckets
  set request_count = request_count + 1
  where user_id = uid and bucket_kind = 'day' and bucket_start = db;

  return jsonb_build_object('ok', true, 'reason', 'ok', 'retry_after_sec', 0);
end;
$$;

grant execute on function public.consume_generation_rate_limit(int, int) to authenticated;
