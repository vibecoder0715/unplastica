alter table public.profiles
  add column avatar_path text,
  add column avatar_upload_at timestamptz;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', false, 51200, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Users may create signed read URLs only for their own sanitized avatar.
-- No client-side insert, update, or delete policy is created: writes are server-only.
create policy "Users can read their own profile avatars" on storage.objects
for select to authenticated
using (
  bucket_id = 'profile-avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

revoke update (avatar_path, avatar_upload_at) on public.profiles from authenticated;
