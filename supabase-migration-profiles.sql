-- Run this in Supabase → SQL Editor, after supabase-migration-view-class.sql.
-- Adds a public "avatars" storage bucket (each user can only write to their own folder,
-- e.g. avatars/{user_id}/avatar.jpg) plus a few extra profile columns.

-- ── Storage bucket ──────────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- storage.objects already has row-level security enabled by default in every Supabase
-- project, and only Supabase's internal role owns that table — so there's nothing to
-- enable here, just policies to add.

-- Public read (avatars are meant to be visible to classmates/teachers), but a user can
-- only insert/update/delete objects inside their own folder (avatars/{their user id}/...).
drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar" on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar" on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar" on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── Profile detail columns ───────────────────────────────────────────
-- No new RLS needed here — the existing "Users can update own profile" policy already
-- covers these new columns, and they aren't touched by the approval/role protection
-- trigger, so a signed-in user can freely update their own display_name/avatar_url/extra_detail.
alter table profiles add column if not exists display_name text;
alter table profiles add column if not exists avatar_url text;
-- extra_detail is intentionally generic — the app labels it "School / grade" for students
-- and "Subject taught" for teachers, but it's just one free-text column either way.
alter table profiles add column if not exists extra_detail text;
