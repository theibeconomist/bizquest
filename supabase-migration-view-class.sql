-- Run this in Supabase → SQL Editor, after supabase-migration-comprehension-and-removal.sql.
-- Lets a student see which class/teacher they belong to.

-- Denormalized on purpose: storing the teacher's email directly on the class row (set once,
-- at creation) means a student can see who their teacher is without needing a new RLS policy
-- that lets students read arbitrary profiles — which would reopen the exact kind of
-- cross-table policy cycle fixed in supabase-migration-fix-recursion.sql.
alter table classes add column if not exists teacher_email text;

-- Security-definer helper (same bypass-RLS pattern as is_admin_user/is_teacher_of_student),
-- so a policy on `classes` can check "is this my class?" without querying `profiles` through
-- normal RLS — which is what would create a profiles ⇄ classes cycle again.
create or replace function my_class_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select class_id from profiles where id = auth.uid();
$$;

create policy "Students can view their own class" on classes for select
  using (id = my_class_id());

-- join_class() now also hands back the teacher's email so the client can show it immediately.
-- Must be dropped first: Postgres won't let CREATE OR REPLACE change a function's return
-- columns (we're adding teacher_email to what it returns), only its body.
drop function if exists join_class(text);

create or replace function join_class(p_code text)
returns table(class_id uuid, class_name text, teacher_email text) as $$
declare
  v_class classes;
begin
  select * into v_class from classes where join_code = upper(trim(p_code));
  if not found then
    raise exception 'Invalid class code.';
  end if;

  perform set_config('app.allow_class_join', 'true', true);
  update profiles set class_id = v_class.id where id = auth.uid();

  return query select v_class.id, v_class.name, v_class.teacher_email;
end;
$$ language plpgsql security definer;
