-- Migration: Confirm existing users and make handle_new_user robust against username collisions

-- 1. Confirm any existing unconfirmed users
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email_confirmed_at is null and email is not null;

-- 2. Robust handle_new_user function that never fails on username conflict
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  display_name_value text;
  username_value text;
  candidate_username text;
  counter integer := 0;
begin
  display_name_value := left(coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Plastic-Free Warrior'
  ), 80);

  candidate_username := left(lower(coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'warrior'
  )), 32);

  candidate_username := regexp_replace(candidate_username, '[^a-z0-9_.-]', '', 'g');
  if candidate_username = '' then
    candidate_username := 'warrior';
  end if;

  username_value := candidate_username;
  while exists (select 1 from public.profiles where lower(username) = lower(username_value) and id <> new.id) loop
    counter := counter + 1;
    username_value := left(candidate_username, 28) || '_' || left(new.id::text, 6);
    if counter > 5 then
      username_value := 'user_' || left(new.id::text, 12);
      exit;
    end if;
  end loop;

  insert into public.profiles (id, display_name, username, phone)
  values (new.id, display_name_value, username_value, coalesce(new.phone, ''))
  on conflict (id) do update set
    display_name = case when public.profiles.display_name = 'Plastic-Free Warrior' or public.profiles.display_name = '' then excluded.display_name else public.profiles.display_name end,
    username = case when public.profiles.username = 'warrior' or public.profiles.username = '' then excluded.username else public.profiles.username end;

  return new;
end;
$$;
