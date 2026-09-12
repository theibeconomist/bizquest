-- Run this in Supabase → SQL Editor, after supabase-migration-fix-recursion.sql.

-- ── Comprehension-check attempts (the Discover-stage video questions) ──
-- Mirrors question_attempts, but for comprehension checks, which get a verdict
-- (correct/partial/incorrect) rather than a numeric mark.
create table if not exists comprehension_attempts (
  id bigserial primary key,
  user_id uuid references profiles(id) not null,
  subunit_id text not null,
  question_id text not null,
  verdict text not null,
  submitted_at timestamptz not null default now()
);

alter table comprehension_attempts enable row level security;
create policy "Users can insert own comprehension attempts" on comprehension_attempts for insert
  with check (auth.uid() = user_id);
create policy "Users can view own comprehension attempts" on comprehension_attempts for select
  using (auth.uid() = user_id);
create policy "Teachers can view their students' comprehension attempts" on comprehension_attempts for select
  using (is_teacher_of_student(comprehension_attempts.user_id));
create policy "Admins can view all comprehension attempts" on comprehension_attempts for select
  using (is_admin_user());

-- ── Let a teacher remove a student from their own class ──
-- Security definer + the same transaction-local flag the join_class() function uses,
-- so this can write class_id despite the protect_approval_fields trigger — but only
-- after confirming the caller actually teaches that student's current class.
create or replace function remove_student_from_class(p_student_id uuid)
returns void as $$
declare
  v_class_id uuid;
begin
  select class_id into v_class_id from profiles where id = p_student_id;
  if v_class_id is null then
    return; -- already not in a class — nothing to do
  end if;
  if not exists (select 1 from classes where id = v_class_id and teacher_id = auth.uid()) then
    raise exception 'Not authorized to remove this student.';
  end if;

  perform set_config('app.allow_class_join', 'true', true);
  update profiles set class_id = null where id = p_student_id;
end;
$$ language plpgsql security definer;
