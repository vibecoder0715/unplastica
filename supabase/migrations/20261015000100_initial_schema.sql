create extension if not exists pgcrypto with schema extensions;

create type public.submission_status as enum (
  'pending_upload',
  'uploaded',
  'approved',
  'rejected',
  'expired'
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Plastic-Free Warrior' check (char_length(display_name) between 1 and 80),
  username text not null default 'warrior' check (char_length(username) between 1 and 40),
  phone text not null default '' check (char_length(phone) <= 32),
  tagline text not null default 'Refusing plastic, one meal at a time.' check (char_length(tagline) <= 160),
  preferences jsonb not null default '{"theme":"light","language":"English","notifications":true}'::jsonb
    check (jsonb_typeof(preferences) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_username_search on public.profiles (lower(username));

create table public.habit_definitions (
  code text primary key check (code in (
    'box_cutlery',
    'recycle_bags',
    'self_bottle_refill',
    'greenery_furniture',
    'handicraft_projects',
    'beeswax_food_wraps',
    'bulk_pantry_refill'
  )),
  name text not null,
  points integer not null check (points > 0),
  enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

insert into public.habit_definitions (code, name, points) values
  ('box_cutlery', 'Box & Cutlery', 300),
  ('recycle_bags', 'Recycle Bags', 50),
  ('self_bottle_refill', 'Self Bottle Refill', 30),
  ('greenery_furniture', 'Greenery & Furniture', 300),
  ('handicraft_projects', 'Handicraft Projects', 100),
  ('beeswax_food_wraps', 'Beeswax Food Wraps', 40),
  ('bulk_pantry_refill', 'Bulk Pantry Refill', 80);

create table public.habit_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_code text not null references public.habit_definitions (code),
  storage_path text not null unique,
  content_type text not null check (content_type in ('image/jpeg', 'image/png', 'image/webp')),
  status public.submission_status not null default 'pending_upload',
  score numeric(5,4) check (score >= 0 and score <= 1),
  predicted_label text,
  model_version text,
  proof_sha256 text check (proof_sha256 is null or proof_sha256 ~ '^[0-9a-f]{64}$'),
  points_awarded integer not null default 0 check (points_awarded >= 0),
  submitted_at timestamptz not null default now(),
  scored_at timestamptz,
  expires_at timestamptz not null default now() + interval '30 days',
  media_deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index habit_submissions_user_recent on public.habit_submissions (user_id, created_at desc);
create index habit_submissions_expiry on public.habit_submissions (expires_at) where media_deleted_at is null;
create unique index habit_submissions_no_reused_proof on public.habit_submissions (user_id, proof_sha256)
  where proof_sha256 is not null and status = 'approved';

create table public.greenbit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  submission_id uuid references public.habit_submissions (id) on delete set null,
  entry_type text not null check (entry_type in ('earn', 'spend')),
  amount integer not null check (amount <> 0),
  description text not null check (char_length(description) between 1 and 200),
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  constraint greenbit_ledger_amount_sign check (
    (entry_type = 'earn' and amount > 0) or (entry_type = 'spend' and amount < 0)
  )
);

create unique index greenbit_one_earn_per_submission
  on public.greenbit_ledger (submission_id)
  where submission_id is not null and entry_type = 'earn';
create index greenbit_ledger_user_recent on public.greenbit_ledger (user_id, created_at desc);

create table public.game_spend_catalog (
  spend_code text primary key check (spend_code ~ '^[a-z0-9_]{2,64}$'),
  title text not null,
  cost integer not null check (cost > 0),
  enabled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.reward_catalog (
  reward_code text primary key check (reward_code ~ '^[a-z0-9_]{2,64}$'),
  title text not null,
  cost integer not null check (cost > 0),
  enabled boolean not null default false,
  stock integer check (stock is null or stock >= 0),
  created_at timestamptz not null default now()
);

create table public.submission_flags (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.habit_submissions (id) on delete cascade,
  reason text not null check (char_length(reason) between 1 and 240),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (submission_id, reason)
);

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  reward_code text not null references public.reward_catalog (reward_code),
  ledger_id uuid not null references public.greenbit_ledger (id),
  created_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name_value text;
  username_value text;
begin
  display_name_value := left(coalesce(nullif(new.raw_user_meta_data ->> 'display_name', ''), split_part(new.email, '@', 1), 'Plastic-Free Warrior'), 80);
  username_value := left(coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1), 'warrior'), 40);
  insert into public.profiles (id, display_name, username)
  values (new.id, display_name_value, username_value)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace view public.greenbit_balances
with (security_invoker = true)
as
select
  p.id as user_id,
  coalesce(sum(l.amount), 0)::bigint as balance
from public.profiles p
left join public.greenbit_ledger l on l.user_id = p.id
group by p.id;

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
    'Verified habit: ' || submission_row.habit_code,
    'submission:' || p_submission_id::text,
    jsonb_build_object('score', p_score, 'model_version', p_model_version)
  ) returning id into inserted_ledger_id;

  return query select 'approved'::text, habit_points, inserted_ledger_id;
end;
$$;

create or replace function public.spend_greenbits(
  p_user_id uuid,
  p_spend_code text,
  p_idempotency_key text
)
returns table (ledger_id uuid, amount integer, balance bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  spend_cost integer;
  prior public.greenbit_ledger%rowtype;
  new_id uuid;
  current_balance bigint;
begin
  if char_length(p_idempotency_key) < 8 or char_length(p_idempotency_key) > 160 then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;

  select l.* into prior
  from public.greenbit_ledger l
  where l.idempotency_key = p_idempotency_key;
  if found then
    if prior.user_id <> p_user_id or prior.entry_type <> 'spend'
      or prior.metadata ->> 'spend_code' is distinct from p_spend_code then
      raise exception 'idempotency_key_conflict' using errcode = '23505';
    end if;
    select b.balance into current_balance from public.greenbit_balances b where b.user_id = p_user_id;
    return query select prior.id, prior.amount, coalesce(current_balance, 0);
    return;
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  select c.cost into spend_cost
  from public.game_spend_catalog c
  where c.spend_code = p_spend_code and c.enabled;
  if spend_cost is null then raise exception 'spend_unavailable' using errcode = '22023'; end if;
  select b.balance into current_balance from public.greenbit_balances b where b.user_id = p_user_id;
  if coalesce(current_balance, 0) < spend_cost then raise exception 'insufficient_greenbits' using errcode = '22023'; end if;

  insert into public.greenbit_ledger (user_id, entry_type, amount, description, idempotency_key, metadata)
  values (p_user_id, 'spend', -spend_cost, 'Game spend: ' || p_spend_code, p_idempotency_key,
    jsonb_build_object('spend_code', p_spend_code))
  returning id into new_id;
  select b.balance into current_balance from public.greenbit_balances b where b.user_id = p_user_id;
  return query select new_id, -spend_cost, coalesce(current_balance, 0);
end;
$$;

create or replace function public.redeem_reward(
  p_user_id uuid,
  p_reward_code text,
  p_idempotency_key text
)
returns table (redemption_id uuid, ledger_id uuid, amount integer, balance bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  reward_row public.reward_catalog%rowtype;
  prior public.greenbit_ledger%rowtype;
  new_ledger_id uuid;
  new_redemption_id uuid;
  current_balance bigint;
begin
  if char_length(p_idempotency_key) < 8 or char_length(p_idempotency_key) > 160 then
    raise exception 'invalid_idempotency_key' using errcode = '22023';
  end if;
  select l.* into prior from public.greenbit_ledger l where l.idempotency_key = p_idempotency_key;
  if found then
    if prior.user_id <> p_user_id or prior.entry_type <> 'spend' then
      raise exception 'idempotency_key_conflict' using errcode = '23505';
    end if;
    if not exists (
      select 1 from public.reward_redemptions r
      where r.ledger_id = prior.id and r.reward_code = p_reward_code
    ) then
      raise exception 'idempotency_key_conflict' using errcode = '23505';
    end if;
    select r.id into new_redemption_id from public.reward_redemptions r where r.ledger_id = prior.id;
    select b.balance into current_balance from public.greenbit_balances b where b.user_id = p_user_id;
    return query select new_redemption_id, prior.id, prior.amount, coalesce(current_balance, 0);
    return;
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  select c.* into reward_row
  from public.reward_catalog c
  where c.reward_code = p_reward_code and c.enabled
  for update;
  if not found then raise exception 'reward_unavailable' using errcode = '22023'; end if;
  if reward_row.stock = 0 then raise exception 'reward_out_of_stock' using errcode = '22023'; end if;
  select b.balance into current_balance from public.greenbit_balances b where b.user_id = p_user_id;
  if coalesce(current_balance, 0) < reward_row.cost then raise exception 'insufficient_greenbits' using errcode = '22023'; end if;

  insert into public.greenbit_ledger (user_id, entry_type, amount, description, idempotency_key)
  values (p_user_id, 'spend', -reward_row.cost, 'Reward redemption: ' || p_reward_code, p_idempotency_key)
  returning id into new_ledger_id;
  insert into public.reward_redemptions (user_id, reward_code, ledger_id)
  values (p_user_id, p_reward_code, new_ledger_id)
  returning id into new_redemption_id;
  if reward_row.stock is not null then
    update public.reward_catalog set stock = stock - 1 where reward_code = p_reward_code;
  end if;
  select b.balance into current_balance from public.greenbit_balances b where b.user_id = p_user_id;
  return query select new_redemption_id, new_ledger_id, -reward_row.cost, coalesce(current_balance, 0);
end;
$$;

create or replace function public.flag_submission_anomalies()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare flagged_count integer;
begin
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
  return flagged_count;
end;
$$;

create or replace function public.guard_ledger_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Greenbits ledger entries are immutable';
end;
$$;

create trigger greenbit_ledger_immutable
before update on public.greenbit_ledger
for each row execute function public.guard_ledger_mutation();

alter table public.profiles enable row level security;
alter table public.habit_definitions enable row level security;
alter table public.habit_submissions enable row level security;
alter table public.greenbit_ledger enable row level security;
alter table public.game_spend_catalog enable row level security;
alter table public.reward_catalog enable row level security;
alter table public.submission_flags enable row level security;
alter table public.reward_redemptions enable row level security;

create policy "Users can read their own profile" on public.profiles
for select to authenticated using ((select auth.uid()) = id);
create policy "Users can update their own profile" on public.profiles
for update to authenticated using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);
create policy "Authenticated users can read enabled habits" on public.habit_definitions
for select to authenticated using (enabled);
create policy "Users can read their own submissions" on public.habit_submissions
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can read their own ledger" on public.greenbit_ledger
for select to authenticated using ((select auth.uid()) = user_id);
create policy "Users can read their own redemptions" on public.reward_redemptions
for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.profiles, public.habit_definitions, public.habit_submissions,
  public.greenbit_ledger, public.game_spend_catalog, public.reward_catalog,
  public.submission_flags, public.reward_redemptions from anon;
grant select, update on public.profiles to authenticated;
revoke update on public.profiles from authenticated;
grant update (display_name, username, phone, tagline, preferences) on public.profiles to authenticated;
grant select on public.habit_definitions to authenticated;
grant select on public.habit_submissions to authenticated;
grant select on public.greenbit_ledger to authenticated;
grant select on public.greenbit_balances to authenticated;
grant select on public.reward_redemptions to authenticated;
revoke insert, update, delete, truncate, references, trigger on public.greenbit_ledger from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.habit_submissions from authenticated;
revoke insert, update, delete, truncate, references, trigger on public.reward_redemptions from authenticated;

revoke all on function public.award_greenbits(uuid, uuid, numeric, numeric, text, text, text) from public, anon, authenticated;
revoke all on function public.spend_greenbits(uuid, text, text) from public, anon, authenticated;
revoke all on function public.redeem_reward(uuid, text, text) from public, anon, authenticated;
revoke all on function public.flag_submission_anomalies() from public, anon, authenticated;
grant execute on function public.award_greenbits(uuid, uuid, numeric, numeric, text, text, text) to service_role;
grant execute on function public.spend_greenbits(uuid, text, text) to service_role;
grant execute on function public.redeem_reward(uuid, text, text) to service_role;
grant execute on function public.flag_submission_anomalies() to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('proof-media', 'proof-media', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

