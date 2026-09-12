-- Run this in Supabase → SQL Editor, after supabase-migration-profiles.sql.

-- ── Requested role at signup ─────────────────────────────────────────
-- This is purely informational — it is NOT the enforced `role` column (which stays
-- 'student' by default and can only be changed by an admin, per the protect_approval_fields
-- trigger). It just lets someone say "I signed up as a teacher" at registration, so the
-- admin sees that intent on the approval page and can act on it with one click, instead
-- of promoting people blind or asking around over email.
alter table profiles add column if not exists requested_role text
  check (requested_role in ('student', 'teacher')) default 'student';

-- Pull display name / extra detail / requested role out of the signup form's metadata
-- (passed via supabase.auth.signUp({ options: { data: {...} } })) into the new profile row.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name, extra_detail, requested_role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'display_name',
    new.raw_user_meta_data->>'extra_detail',
    coalesce(new.raw_user_meta_data->>'requested_role', 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

-- ── Feedback ─────────────────────────────────────────────────────────
create table if not exists feedback (
  id bigserial primary key,
  user_id uuid references profiles(id) not null,
  user_email text,
  page text,
  message text not null,
  created_at timestamptz not null default now()
);

alter table feedback enable row level security;

drop policy if exists "Users can submit feedback" on feedback;
create policy "Users can submit feedback" on feedback for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can view own feedback" on feedback;
create policy "Users can view own feedback" on feedback for select
  using (auth.uid() = user_id);

drop policy if exists "Admins can view all feedback" on feedback;
create policy "Admins can view all feedback" on feedback for select
  using (is_admin_user());
