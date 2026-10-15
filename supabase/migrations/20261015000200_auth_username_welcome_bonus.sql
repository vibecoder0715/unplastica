-- Usernames must resolve to one account for the login-by-username flow.
create unique index profiles_username_case_insensitive_unique
  on public.profiles (lower(username));

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
  display_name_value := left(coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Plastic-Free Warrior'
  ), 80);
  username_value := left(lower(coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), '') || '_' || left(new.id::text, 6),
    'member_' || left(new.id::text, 8)
  )), 40);
  insert into public.profiles (id, display_name, username, phone)
  values (new.id, display_name_value, username_value, coalesce(new.phone, ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

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
    p_user_id, 'earn', 500, 'Welcome bonus', 'welcome:' || p_user_id::text,
    jsonb_build_object('grant', 'first_verified_login')
  ) on conflict (idempotency_key) do nothing;
  get diagnostics inserted_count = row_count;
  return query select inserted_count = 1, case when inserted_count = 1 then 500 else 0 end;
end;
$$;

revoke all on function public.award_welcome_bonus(uuid) from public, anon, authenticated;
grant execute on function public.award_welcome_bonus(uuid) to service_role;
