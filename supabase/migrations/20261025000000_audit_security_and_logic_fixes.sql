-- Migration: 20261025000000_audit_security_and_logic_fixes.sql
-- Fixes security, database, and logic flaws identified in audit:
-- 1. Unverified email & phone squatting on public.profiles (revoke direct update, sync via auth.users trigger)
-- 2. Identifier uniqueness RPC (replacing dead RLS client-side pre-checks)
-- 3. Parameterized avatar upload slot claiming RPC (eliminating raw string interpolation)
-- 4. Set search_path on forbid_ledger_mutation() and add missing RLS SELECT policies for catalogs
-- 5. Deferred verification bypass fix (filter by scored_at instead of created_at in award_greenbits)
-- 6. Active anomaly enforcement and clawback in flag_submission_anomalies()
-- 7. Distributed auth rate limiting table and RPC

-- -----------------------------------------------------------------------------
-- 1. Revoke direct update on email and phone from authenticated users on public.profiles
-- -----------------------------------------------------------------------------
revoke update (email, phone) on public.profiles from authenticated;

-- Sync email and phone from auth.users when updated via Supabase Auth
create or replace function public.sync_user_email_phone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
  set email = coalesce(new.email, ''),
      phone = coalesce(new.phone, new.raw_user_meta_data->>'phone', '')
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists sync_user_email_phone_trigger on auth.users;
create trigger sync_user_email_phone_trigger
after update of email, phone, raw_user_meta_data on auth.users
for each row execute function public.sync_user_email_phone();

-- Update handle_new_user() to safely handle email/phone without crashing on squatting
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  short_id text;
  display_name_value text;
  username_value text;
  email_value text;
  phone_value text;
  counter integer := 0;
begin
  short_id := lower(substr(md5(new.id::text || 'unplastica'), 1, 10));

  display_name_value := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    'User ' || short_id
  );

  username_value := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    'user_' || short_id
  );

  email_value := coalesce(new.email, '');
  phone_value := coalesce(new.phone, new.raw_user_meta_data ->> 'phone', '');

  username_value := regexp_replace(lower(username_value), '[^a-z0-9_.-]', '', 'g');
  if username_value = '' then
    username_value := 'user_' || short_id;
  end if;

  while exists (select 1 from public.profiles where lower(username) = lower(username_value) and id <> new.id) loop
    counter := counter + 1;
    username_value := 'user_' || short_id || counter::text;
    if counter > 5 then
      username_value := 'user_' || left(new.id::text, 12);
      exit;
    end if;
  end loop;

  -- Clean up any unverified squatted profile email/phone if owned by another user who has no auth.users record matching that email
  if email_value <> '' then
    update public.profiles p
    set email = ''
    where lower(trim(p.email)) = lower(trim(email_value))
      and p.id <> new.id
      and not exists (
        select 1 from auth.users u
        where u.id = p.id and lower(trim(u.email)) = lower(trim(email_value))
      );
  end if;

  if phone_value <> '' then
    update public.profiles p
    set phone = ''
    where regexp_replace(p.phone, '[^0-9+]', '', 'g') = regexp_replace(phone_value, '[^0-9+]', '', 'g')
      and p.id <> new.id
      and not exists (
        select 1 from auth.users u
        where u.id = p.id and regexp_replace(coalesce(u.phone, u.raw_user_meta_data->>'phone', ''), '[^0-9+]', '', 'g') = regexp_replace(phone_value, '[^0-9+]', '', 'g')
      );
  end if;

  insert into public.profiles (id, display_name, username, phone, email)
  values (new.id, display_name_value, username_value, phone_value, email_value)
  on conflict (id) do update set
    email = case
      when public.profiles.email is null or public.profiles.email = '' then excluded.email
      else public.profiles.email
    end,
    phone = case
      when public.profiles.phone is null or public.profiles.phone = '' then excluded.phone
      else public.profiles.phone
    end,
    display_name = case
      when public.profiles.display_name = 'Plastic-Free Warrior'
        or public.profiles.display_name = ''
        or public.profiles.display_name like '%@%'
      then excluded.display_name
      else public.profiles.display_name
    end,
    username = case
      when public.profiles.username = 'warrior'
        or public.profiles.username = ''
        or public.profiles.username like '%@%'
      then excluded.username
      else public.profiles.username
    end;

  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. Identifier availability RPC (resolves dead RLS pre-checks safely)
-- -----------------------------------------------------------------------------
create or replace function public.check_identifier_available(p_type text, p_value text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid;
  clean_val text;
begin
  if p_value is null or trim(p_value) = '' then
    return true;
  end if;
  caller_id := auth.uid();
  clean_val := trim(p_value);

  if p_type = 'email' then
    return not exists (
      select 1 from public.profiles
      where lower(trim(email)) = lower(clean_val)
        and (caller_id is null or id <> caller_id)
    );
  elsif p_type = 'phone' then
    return not exists (
      select 1 from public.profiles
      where regexp_replace(phone, '[^0-9+]', '', 'g') = regexp_replace(clean_val, '[^0-9+]', '', 'g')
        and regexp_replace(phone, '[^0-9+]', '', 'g') <> ''
        and (caller_id is null or id <> caller_id)
    );
  elsif p_type = 'username' then
    return not exists (
      select 1 from public.profiles
      where lower(trim(username)) = lower(clean_val)
        and (caller_id is null or id <> caller_id)
    );
  end if;
  return false;
end;
$$;

revoke all on function public.check_identifier_available(text, text) from public;
grant execute on function public.check_identifier_available(text, text) to anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 3. Avatar upload slot claiming RPC (parameterized, eliminates raw .or() string interpolation)
-- -----------------------------------------------------------------------------
create or replace function public.claim_avatar_upload_slot(
  p_user_id uuid,
  p_cooldown_seconds integer default 15
)
returns table (avatar_path text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
begin
  update public.profiles
  set avatar_upload_at = now()
  where id = p_user_id
    and (
      avatar_upload_at is null
      or avatar_upload_at < (now() - (p_cooldown_seconds || ' seconds')::interval)
    )
  returning profiles.avatar_path into v_path;

  if found then
    return query select v_path;
  end if;
  return;
end;
$$;

revoke all on function public.claim_avatar_upload_slot(uuid, integer) from public;
grant execute on function public.claim_avatar_upload_slot(uuid, integer) to service_role;

-- -----------------------------------------------------------------------------
-- 4. Search_path on forbid_ledger_mutation() & missing catalog policies
-- -----------------------------------------------------------------------------
create or replace function public.forbid_ledger_mutation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'greenbit_ledger rows are immutable and cannot be updated or deleted' using errcode = '22023';
end;
$$;

drop policy if exists "Authenticated users can read enabled game spend items" on public.game_spend_catalog;
create policy "Authenticated users can read enabled game spend items" on public.game_spend_catalog
for select to authenticated using (enabled);

drop policy if exists "Authenticated users can read enabled rewards" on public.reward_catalog;
create policy "Authenticated users can read enabled rewards" on public.reward_catalog
for select to authenticated using (enabled);

grant select on public.game_spend_catalog to authenticated;
grant select on public.reward_catalog to authenticated;

-- -----------------------------------------------------------------------------
-- 5. Fix award_greenbits deferred verification daily quota bypass & anti-cheat
-- -----------------------------------------------------------------------------
create or replace function public.award_greenbits(
  p_submission_id uuid,
  p_user_id uuid,
  p_score numeric,
  p_threshold numeric,
  p_predicted_label text,
  p_model_version text,
  p_proof_sha256 text
)
returns table (status text, points integer, ledger_id uuid)
language plpgsql
security definer
set search_path = ''
as $$
declare
  submission_row public.habit_submissions%rowtype;
  habit_points integer;
  inserted_ledger_id uuid;
  today_approved_count integer;
  max_daily_allowed integer;
begin
  if p_score is null or p_threshold is null or p_score < p_threshold or p_score > 1 or p_score < 0 then
    raise exception 'score_below_threshold' using errcode = '22023';
  end if;
  if p_threshold < 0.5 or p_threshold > 1 then
    raise exception 'invalid_threshold' using errcode = '22023';
  end if;
  if p_proof_sha256 is null or p_proof_sha256 !~ '^[0-9a-f]{64}$' then
    raise exception 'invalid_proof_hash' using errcode = '22023';
  end if;

  -- Lock user profile row first to serialise concurrent awards for the same user
  perform 1 from public.profiles where id = p_user_id for update;

  select * into submission_row
  from public.habit_submissions
  where id = p_submission_id and user_id = p_user_id
  for update;

  if not found then raise exception 'submission_not_found' using errcode = 'P0002'; end if;
  if submission_row.status = 'approved' then
    select l.id, l.amount into inserted_ledger_id, habit_points
    from public.greenbit_ledger l
    where l.submission_id = p_submission_id and l.entry_type = 'earn';
    return query select 'approved'::text, coalesce(habit_points, submission_row.points_awarded), inserted_ledger_id;
    return;
  end if;
  if submission_row.status <> 'uploaded' then
    raise exception 'submission_not_ready' using errcode = '22023';
  end if;
  if p_predicted_label is null or p_predicted_label <> submission_row.habit_code then
    raise exception 'model_label_mismatch' using errcode = '22023';
  end if;
  if exists (
    select 1 from public.habit_submissions s
    where s.user_id = p_user_id and s.proof_sha256 = p_proof_sha256
      and s.id <> p_submission_id and s.status = 'approved'
  ) then
    raise exception 'proof_already_used' using errcode = '23505';
  end if;

  -- Block if account has active fraud/anomaly flags in the last 7 days
  if exists (
    select 1 from public.submission_flags sf
    join public.habit_submissions hs on hs.id = sf.submission_id
    where hs.user_id = p_user_id and sf.created_at > (now() - interval '7 days')
  ) then
    raise exception 'account_flagged_for_review' using errcode = '42501';
  end if;

  -- 5-hour limit for box & cutlery after first verified publish
  if submission_row.habit_code = 'box_cutlery' and exists (
    select 1 from public.habit_submissions s
    where s.user_id = p_user_id
      and s.habit_code = 'box_cutlery'
      and s.status = 'approved'
      and s.scored_at > (now() - interval '5 hours')
      and s.id <> p_submission_id
  ) then
    raise exception 'cooldown_active_5_hours' using errcode = '22023';
  end if;

  -- Daily limits check based on scored_at (Asia/Kuala_Lumpur UTC+8): prevents pre-created slot bypass
  max_daily_allowed := case when submission_row.habit_code = 'box_cutlery' then 3 else 1 end;

  select count(*)
  into today_approved_count
  from public.habit_submissions s
  where s.user_id = p_user_id
    and s.habit_code = submission_row.habit_code
    and s.status = 'approved'
    and timezone('Asia/Kuala_Lumpur', s.scored_at)::date = timezone('Asia/Kuala_Lumpur', now())::date;

  if today_approved_count >= max_daily_allowed then
    raise exception 'daily_limit_reached' using errcode = '22023';
  end if;

  select h.points into habit_points
  from public.habit_definitions h
  where h.code = submission_row.habit_code and h.enabled;
  if habit_points is null then raise exception 'habit_disabled' using errcode = '22023'; end if;

  update public.habit_submissions
  set status = 'approved',
      score = p_score,
      predicted_label = p_predicted_label,
      model_version = p_model_version,
      proof_sha256 = p_proof_sha256,
      points_awarded = habit_points,
      scored_at = now()
  where id = p_submission_id;

  insert into public.greenbit_ledger (
    user_id, submission_id, entry_type, amount, description, idempotency_key, metadata
  ) values (
    p_user_id,
    p_submission_id,
    'earn',
    habit_points,
    'Habit verified: ' || submission_row.habit_code,
    'earn:' || p_submission_id::text,
    jsonb_build_object('habit_code', submission_row.habit_code, 'score', p_score, 'model_version', p_model_version)
  )
  returning id into inserted_ledger_id;

  return query select 'approved'::text, habit_points, inserted_ledger_id;
end;
$$;

revoke all on function public.award_greenbits(uuid, uuid, numeric, numeric, text, text, text) from public, anon, authenticated;
grant execute on function public.award_greenbits(uuid, uuid, numeric, numeric, text, text, text) to service_role;

-- -----------------------------------------------------------------------------
-- 6. Enforce anomaly flags: deduct Greenbits and reject fraudulent submissions
-- -----------------------------------------------------------------------------
create or replace function public.flag_submission_anomalies()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  flagged_count integer := 0;
  deducted_count integer := 0;
begin
  -- Flag identical proof hash reused across different accounts
  insert into public.submission_flags (submission_id, reason)
  select s.id, 'Repeated identical proof hash across accounts'
  from public.habit_submissions s
  where s.proof_sha256 is not null
    and s.status = 'approved'
    and exists (
      select 1 from public.habit_submissions other
      where other.proof_sha256 = s.proof_sha256
        and other.user_id <> s.user_id
        and other.status = 'approved'
    )
  on conflict (submission_id, reason) do nothing;
  get diagnostics flagged_count = row_count;

  -- Deduct Greenbits for anomalous approved submissions
  insert into public.greenbit_ledger (user_id, submission_id, entry_type, amount, description, idempotency_key, metadata)
  select s.user_id, s.id, 'spend', -s.points_awarded, 'Anomaly deduction: ' || f.reason, 'clawback:' || s.id::text, jsonb_build_object('reason', f.reason)
  from public.submission_flags f
  join public.habit_submissions s on s.id = f.submission_id
  where s.points_awarded > 0
  on conflict (idempotency_key) do nothing;

  -- Update anomalous submissions to rejected
  update public.habit_submissions s
  set status = 'rejected'
  from public.submission_flags f
  where s.id = f.submission_id and s.status = 'approved';

  return flagged_count;
end;
$$;

revoke all on function public.flag_submission_anomalies() from public, anon, authenticated;
grant execute on function public.flag_submission_anomalies() to service_role;

-- -----------------------------------------------------------------------------
-- 7. Distributed auth rate limiting table & RPC
-- -----------------------------------------------------------------------------
create table if not exists public.auth_rate_limits (
  rate_key text primary key,
  attempt_count integer not null default 1,
  first_attempt_at timestamptz not null default now(),
  last_attempt_at timestamptz not null default now(),
  locked_until timestamptz
);

alter table public.auth_rate_limits enable row level security;
revoke all on public.auth_rate_limits from anon, authenticated;

create or replace function public.check_auth_rate_limit(
  p_key text,
  p_max_attempts integer default 5,
  p_window_seconds integer default 60,
  p_lockout_seconds integer default 60
)
returns table (allowed boolean, remaining integer, retry_after integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  rec record;
  now_time timestamptz := now();
  window_start timestamptz := now_time - (p_window_seconds || ' seconds')::interval;
  cur_remaining integer;
  cur_retry integer := 0;
begin
  select * into rec
  from public.auth_rate_limits
  where rate_key = p_key
  for update;

  if not found then
    insert into public.auth_rate_limits (rate_key, attempt_count, first_attempt_at, last_attempt_at)
    values (p_key, 1, now_time, now_time);
    return query select true, p_max_attempts - 1, 0;
    return;
  end if;

  -- If currently locked out
  if rec.locked_until is not null and rec.locked_until > now_time then
    cur_retry := ceil(extract(epoch from (rec.locked_until - now_time)))::integer;
    return query select false, 0, cur_retry;
    return;
  end if;

  -- If outside the rolling window, reset
  if rec.last_attempt_at < window_start then
    update public.auth_rate_limits
    set attempt_count = 1,
        first_attempt_at = now_time,
        last_attempt_at = now_time,
        locked_until = null
    where rate_key = p_key;
    return query select true, p_max_attempts - 1, 0;
    return;
  end if;

  -- Within window: increment
  if rec.attempt_count + 1 >= p_max_attempts then
    update public.auth_rate_limits
    set attempt_count = rec.attempt_count + 1,
        last_attempt_at = now_time,
        locked_until = now_time + (p_lockout_seconds || ' seconds')::interval
    where rate_key = p_key;
    return query select false, 0, p_lockout_seconds;
    return;
  else
    update public.auth_rate_limits
    set attempt_count = rec.attempt_count + 1,
        last_attempt_at = now_time
    where rate_key = p_key;
    cur_remaining := p_max_attempts - (rec.attempt_count + 1);
    return query select true, cur_remaining, 0;
    return;
  end if;
end;
$$;

revoke all on function public.check_auth_rate_limit(text, integer, integer, integer) from public, anon;
grant execute on function public.check_auth_rate_limit(text, integer, integer, integer) to service_role;
