-- Run this in Supabase → SQL Editor, after supabase-migration-approval.sql.

-- Store each student's email directly on their profile, captured at signup, so the
-- admin page can show who's who without needing access to the protected auth.users
-- table (which the app's normal login can't query directly).
alter table profiles add column if not exists email text;

-- Backfill email for any accounts created before this column existed.
update profiles set email = (select email from auth.users where auth.users.id = profiles.id)
where email is null;

-- Update the signup trigger to capture email for all future signups too.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

-- Admins can see every profile (students can already see their own via the existing policy).
create policy "Admins can view all profiles" on profiles for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- Admins can update any profile (needed to approve someone else's account).
-- The existing protect_approval_fields trigger still guards approved/is_admin regardless
-- of which policy let the update through, so this can't be used to self-escalate.
create policy "Admins can update any profile" on profiles for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));
