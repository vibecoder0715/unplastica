-- Migration: Generate pseudonymous mock usernames and display names for OAuth and new users

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
  counter integer := 0;
begin
  -- Generate 10-char alphanumeric short id, e.g. 6s37a29f31
  short_id := lower(substr(md5(new.id::text || 'unplastica'), 1, 10));

  display_name_value := coalesce(
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    'User ' || short_id
  );

  username_value := coalesce(
    nullif(new.raw_user_meta_data ->> 'username', ''),
    'user_' || short_id
  );

  -- Sanitize username
  username_value := regexp_replace(lower(username_value), '[^a-z0-9_.-]', '', 'g');
  if username_value = '' then
    username_value := 'user_' || short_id;
  end if;

  -- Ensure uniqueness
  while exists (select 1 from public.profiles where lower(username) = lower(username_value) and id <> new.id) loop
    counter := counter + 1;
    username_value := 'user_' || short_id || counter::text;
    if counter > 5 then
      username_value := 'user_' || left(new.id::text, 12);
      exit;
    end if;
  end loop;

  insert into public.profiles (id, display_name, username, phone)
  values (new.id, display_name_value, username_value, coalesce(new.phone, ''))
  on conflict (id) do update set
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

-- Update existing profiles that have placeholder or email usernames/display names
update public.profiles
set
  display_name = case
    when display_name = 'Plastic-Free Warrior' or display_name = '' or display_name like '%@%'
    then 'User ' || lower(substr(md5(id::text || 'unplastica'), 1, 10))
    else display_name
  end,
  username = case
    when username = 'warrior' or username = '' or username like '%@%'
    then 'user_' || lower(substr(md5(id::text || 'unplastica'), 1, 10))
    else username
  end
where display_name = 'Plastic-Free Warrior'
   or display_name = ''
   or display_name like '%@%'
   or username = 'warrior'
   or username = ''
   or username like '%@%';
