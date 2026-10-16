-- Migration: Add email to public.profiles and enforce unique constraints for phone and email

-- 1. Add email column to public.profiles if not exists
alter table public.profiles
  add column if not exists email text default '';

-- 2. Backfill existing emails from auth.users
update public.profiles p
set email = coalesce(u.email, '')
from auth.users u
where p.id = u.id and (p.email is null or p.email = '');

-- 3. Unique partial index on phone (ignoring formatting like +, -, spaces)
-- Ensures no two accounts can share the same non-empty phone number
create unique index if not exists profiles_phone_unique
  on public.profiles (regexp_replace(phone, '[^0-9+]', '', 'g'))
  where phone is not null and regexp_replace(phone, '[^0-9+]', '', 'g') <> '';

-- 4. Unique partial index on email (case-insensitive)
-- Ensures no two accounts can share the same non-empty email
create unique index if not exists profiles_email_unique
  on public.profiles (lower(trim(email)))
  where email is not null and trim(email) <> '';

-- 5. Update handle_new_user() trigger to populate email
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

  insert into public.profiles (id, display_name, username, phone, email)
  values (new.id, display_name_value, username_value, coalesce(new.phone, ''), email_value)
  on conflict (id) do update set
    email = case
      when public.profiles.email is null or public.profiles.email = '' then excluded.email
      else public.profiles.email
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
