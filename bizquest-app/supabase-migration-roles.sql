-- Run this in Supabase → SQL Editor, after supabase-migration-admin.sql.
-- Adds: teacher/student/admin roles, classes with join codes, and the two
-- analytics tables (question_attempts, daily_activity) the teacher dashboard reads from.

create extension if not exists pgcrypto; -- provides gen_random_uuid()

-- ── Roles ──────────────────────────────────────────────────────────
-- `role` is the new, general classification. The existing `is_admin` boolean is left
-- in place (other code already checks it) and kept in sync whenever role = 'admin'.
alter table profiles add column if not exists role text not null default 'student'
  check (role in ('student', 'teacher', 'admin'));

update profiles set role = 'admin' where is_admin = true and role <> 'admin';

-- ── Classes ────────────────────────────────────────────────────────
create table if not exists classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references profiles(id) not null,
  name text not null,
  join_code text unique not null,
  created_at timestamptz not null default now()
);

alter table profiles add column if not exists class_id uuid references classes(id);

alter table classes enable row level security;

create policy "Teachers can view their own classes" on classes for select
  using (teacher_id = auth.uid());
create policy "Teachers can create their own classes" on classes for insert
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from profiles where id = auth.uid() and role in ('teacher', 'admin'))
  );
create policy "Admins can view all classes" on classes for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Teachers can see the profiles of students in their own class (read-only — no
-- corresponding update policy, so a teacher can never edit a student's data).
create policy "Teachers can view their students' profiles" on profiles for select
  using (
    exists (select 1 from classes c where c.id = profiles.class_id and c.teacher_id = auth.uid())
  );

-- ── Protect role & class_id from direct client tampering ────────────
-- Replaces the function from supabase-migration-approval.sql (the trigger that calls it
-- already exists — this just extends what it guards). approved/is_admin protection is
-- unchanged; role gets the same "only an existing admin can change this" treatment.
-- class_id can ONLY change via the join_class() function below, which sets a
-- transaction-local flag right before writing — any other attempt (e.g. a student
-- calling the table update directly) is silently reverted back to its old value.
create or replace function protect_approval_fields()
returns trigger as $$
begin
  if not exists (select 1 from profiles where id = auth.uid() and is_admin = true) then
    new.approved := old.approved;
    new.is_admin := old.is_admin;
    new.role := old.role;
  end if;
  if current_setting('app.allow_class_join', true) is distinct from 'true' then
    new.class_id := old.class_id;
  end if;
  return new;
end;
$$ language plpgsql security definer;

-- ── Join-by-code ──────────────────────────────────────────────────
-- Security definer so it can look up a class by code without needing a broad SELECT
-- policy on `classes` open to every student, and so it can set class_id despite the
-- trigger above (via the transaction-local flag).
create or replace function join_class(p_code text)
returns table(class_id uuid, class_name text) as $$
declare
  v_class classes;
begin
  select * into v_class from classes where join_code = upper(trim(p_code));
  if not found then
    raise exception 'Invalid class code.';
  end if;

  perform set_config('app.allow_class_join', 'true', true);
  update profiles set class_id = v_class.id where id = auth.uid();

  return query select v_class.id, v_class.name;
end;
$$ language plpgsql security definer;

-- ── Question attempts (append-only log; powers score/accuracy analytics) ──
create table if not exists question_attempts (
  id bigserial primary key,
  user_id uuid references profiles(id) not null,
  subunit_id text not null,
  question_id text not null,
  section text not null,
  marks_earned integer not null,
  marks_possible integer not null,
  submitted_at timestamptz not null default now()
);

alter table question_attempts enable row level security;
create policy "Users can insert own attempts" on question_attempts for insert
  with check (auth.uid() = user_id);
create policy "Users can view own attempts" on question_attempts for select
  using (auth.uid() = user_id);
create policy "Teachers can view their students' attempts" on question_attempts for select
  using (
    exists (
      select 1 from profiles p join classes c on c.id = p.class_id
      where p.id = question_attempts.user_id and c.teacher_id = auth.uid()
    )
  );
create policy "Admins can view all attempts" on question_attempts for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ── Daily activity (powers daily/weekly/monthly time-on-app) ────────
create table if not exists daily_activity (
  user_id uuid references profiles(id) not null,
  activity_date date not null default current_date,
  seconds_spent integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, activity_date)
);

alter table daily_activity enable row level security;
create policy "Users can view own activity" on daily_activity for select
  using (auth.uid() = user_id);
create policy "Users can upsert own activity" on daily_activity for insert
  with check (auth.uid() = user_id);
create policy "Users can update own activity" on daily_activity for update
  using (auth.uid() = user_id);
create policy "Teachers can view their students' activity" on daily_activity for select
  using (
    exists (
      select 1 from profiles p join classes c on c.id = p.class_id
      where p.id = daily_activity.user_id and c.teacher_id = auth.uid()
    )
  );
create policy "Admins can view all activity" on daily_activity for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Atomic increment so multiple tabs/heartbeats can never race each other into
-- overwriting today's total — each call just adds p_seconds to whatever is already there.
create or replace function record_activity(p_seconds integer)
returns void as $$
begin
  insert into daily_activity (user_id, activity_date, seconds_spent)
  values (auth.uid(), current_date, greatest(p_seconds, 0))
  on conflict (user_id, activity_date)
  do update set seconds_spent = daily_activity.seconds_spent + excluded.seconds_spent,
                updated_at = now();
end;
$$ language plpgsql security invoker;

-- ── One-time: promote yourself or a colleague to teacher ────────────
-- (You can also now do this from the /admin page's new role dropdown instead.)
-- update profiles set role = 'teacher' where id = (select id from auth.users where email = 'TEACHER_EMAIL_HERE');
