-- Runs with `supabase test db`; all mock rows are rolled back.
begin;
select plan(10);

insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-a@test.invalid', '', now(), now(), now()),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'student-b@test.invalid', '', now(), now(), now());
insert into public.habit_submissions (user_id, habit_code, storage_path, content_type, status)
values
  ('10000000-0000-4000-8000-000000000001', 'box_cutlery', '10000000-0000-4000-8000-000000000001/test.jpg', 'image/jpeg', 'uploaded'),
  ('10000000-0000-4000-8000-000000000002', 'box_cutlery', '10000000-0000-4000-8000-000000000002/test.jpg', 'image/jpeg', 'uploaded');
insert into public.greenbit_ledger (user_id, entry_type, amount, description, idempotency_key)
values
  ('10000000-0000-4000-8000-000000000001', 'earn', 300, 'Test earning', 'test:student-a:earn'),
  ('10000000-0000-4000-8000-000000000002', 'earn', 50, 'Test earning', 'test:student-b:earn');

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
select is((select count(*)::integer from public.profiles), 1, 'student sees only their profile');
select is((select count(*)::integer from public.habit_submissions), 1, 'student sees only their proof');
select is((select count(*)::integer from public.greenbit_ledger), 1, 'student sees only their ledger entries');
select is((select balance::integer from public.greenbit_balances where user_id = auth.uid()), 300, 'student sees their own balance');
select is(has_table_privilege(current_user, 'public.greenbit_ledger', 'INSERT'), false, 'student cannot write the ledger');
select is(has_table_privilege(current_user, 'public.greenbit_ledger', 'UPDATE'), false, 'student cannot edit the ledger');
select is(has_table_privilege(current_user, 'public.greenbit_ledger', 'DELETE'), false, 'student cannot delete ledger entries');
select is(has_table_privilege(current_user, 'public.habit_submissions', 'INSERT'), false, 'student cannot write a submission row');
select is(has_table_privilege(current_user, 'public.reward_redemptions', 'INSERT'), false, 'student cannot write a redemption');
select is(has_function_privilege(current_user, 'public.award_greenbits(uuid,uuid,numeric,numeric,text,text,text)', 'EXECUTE'), false, 'student cannot call the award RPC');
select is((select count(*)::integer from public.habit_definitions), 7, 'the seven official habits are present');

reset role;
select * from finish();
rollback;
