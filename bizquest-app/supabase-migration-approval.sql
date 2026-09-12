-- Run this in Supabase → SQL Editor. Safe to run even though profiles already exists.

alter table profiles add column if not exists approved boolean not null default false;
alter table profiles add column if not exists is_admin boolean not null default false;

-- Without this, a student could call the Supabase client directly (bypassing the app
-- entirely) and set their own `approved` (or `is_admin`) to true. This trigger silently
-- reverts those two columns back to their previous value on any update that isn't made
-- by an existing admin, regardless of what the request asked for.
create or replace function protect_approval_fields()
returns trigger as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    new.approved := old.approved;
    new.is_admin := old.is_admin;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists protect_approval_fields_trigger on profiles;
create trigger protect_approval_fields_trigger
  before update on profiles
  for each row execute procedure protect_approval_fields();

-- ── One-time: make yourself an admin so you can approve others ──
-- Sign up for your own account first if you haven't, then run this with your email:
-- update profiles set is_admin = true, approved = true
-- where id = (select id from auth.users where email = 'YOUR_EMAIL_HERE');

-- ── Ongoing: see who's waiting ──
-- select au.email, p.approved, p.id
-- from auth.users au join profiles p on p.id = au.id
-- where p.approved = false;

-- ── Ongoing: approve a student (replace the email) ──
-- update profiles set approved = true
-- where id = (select id from auth.users where email = 'STUDENT_EMAIL_HERE');
