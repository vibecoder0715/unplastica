-- Migration: Enforce daily habit limits (3 times/day for box_cutlery, 1 time/day for all other habits)

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

  -- Daily limits check: 3 times/day for box_cutlery, 1 time/day for others (Asia/Kuala_Lumpur UTC+8)
  max_daily_allowed := case when submission_row.habit_code = 'box_cutlery' then 3 else 1 end;

  select count(*)
  into today_approved_count
  from public.habit_submissions s
  where s.user_id = p_user_id
    and s.habit_code = submission_row.habit_code
    and s.status = 'approved'
    and timezone('Asia/Kuala_Lumpur', s.created_at)::date = timezone('Asia/Kuala_Lumpur', now())::date;

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
  ) returning id into inserted_ledger_id;

  return query select 'approved'::text, habit_points, inserted_ledger_id;
end;
$$;
