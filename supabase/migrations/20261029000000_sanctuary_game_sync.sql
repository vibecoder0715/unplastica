-- Migration: 20261029000000_sanctuary_game_sync.sql
-- Enables real-time synchronization between Unplastica web app and Sanctuary Canvas game

create or replace function public.sync_sanctuary_balance(
  p_delta integer,
  p_reason text,
  p_idempotency_key text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
  v_current_balance bigint;
  v_new_balance bigint;
begin
  v_user_id := auth.uid();
  if v_user_id is null then
    raise exception 'unauthenticated' using errcode = '42501';
  end if;

  -- Serialize concurrent balance updates for this user
  perform 1 from public.profiles where id = v_user_id for update;

  if p_delta = 0 then
    select coalesce(b.balance, 0) into v_current_balance from public.greenbit_balances b where b.user_id = v_user_id;
    return coalesce(v_current_balance, 0);
  end if;

  select coalesce(b.balance, 0) into v_current_balance from public.greenbit_balances b where b.user_id = v_user_id;
  if p_delta < 0 and coalesce(v_current_balance, 0) + p_delta < 0 then
    raise exception 'insufficient_greenbits' using errcode = '22023';
  end if;

  insert into public.greenbit_ledger (user_id, entry_type, amount, description, idempotency_key, metadata)
  values (
    v_user_id,
    case when p_delta > 0 then 'earn' else 'spend' end,
    p_delta,
    coalesce(p_reason, 'Sanctuary game transaction'),
    p_idempotency_key,
    jsonb_build_object('source', 'sanctuary_game', 'delta', p_delta)
  )
  on conflict (idempotency_key) do nothing;

  select coalesce(b.balance, 0) into v_new_balance from public.greenbit_balances b where b.user_id = v_user_id;
  return coalesce(v_new_balance, 0);
end;
$$;

revoke all on function public.sync_sanctuary_balance(integer, text, text) from public, anon;
grant execute on function public.sync_sanctuary_balance(integer, text, text) to authenticated;

