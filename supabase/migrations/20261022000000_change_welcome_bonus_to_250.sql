-- Migration: Change welcome bonus from 500 to 250 Greenbits

create or replace function public.award_welcome_bonus(p_user_id uuid)
returns table (awarded boolean, points integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  confirmed boolean;
  inserted_count integer;
begin
  select (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)
  into confirmed
  from auth.users u
  where u.id = p_user_id;
  if not found or not confirmed then
    raise exception 'verified_account_required' using errcode = '42501';
  end if;

  insert into public.greenbit_ledger (
    user_id, entry_type, amount, description, idempotency_key, metadata
  ) values (
    p_user_id, 'earn', 250, 'Welcome bonus', 'welcome:' || p_user_id::text,
    jsonb_build_object('grant', 'first_verified_login')
  ) on conflict (idempotency_key) do nothing;
  get diagnostics inserted_count = row_count;
  return query select inserted_count = 1, case when inserted_count = 1 then 250 else 0 end;
end;
$$;

revoke all on function public.award_welcome_bonus(uuid) from public, anon, authenticated;
grant execute on function public.award_welcome_bonus(uuid) to service_role;

-- Update existing welcome bonus awards in the ledger to 250
alter table public.greenbit_ledger disable trigger greenbit_ledger_immutable;

update public.greenbit_ledger
set amount = 250
where entry_type = 'earn' and idempotency_key like 'welcome:%';

alter table public.greenbit_ledger enable trigger greenbit_ledger_immutable;
