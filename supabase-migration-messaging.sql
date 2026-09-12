-- Run this in Supabase → SQL Editor, after supabase-migration-feedback-details.sql.
-- Lets a teacher message their whole class or one student, and tracks per-recipient
-- read state (needed so a broadcast to 20 students can have 20 independent read states,
-- rather than one shared "read" flag on the message itself).

create table if not exists class_messages (
  id bigserial primary key,
  class_id uuid references classes(id) not null,
  teacher_id uuid references profiles(id) not null,
  student_id uuid references profiles(id), -- null = whole-class broadcast
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists message_reads (
  message_id bigint references class_messages(id) not null,
  user_id uuid references profiles(id) not null,
  read_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

alter table class_messages enable row level security;
alter table message_reads enable row level security;

-- Teachers can only send as themselves, into a class they actually own, and only to a
-- student who's actually in that class (is_teacher_of_student already exists from the
-- roles migration and is security-definer, so this doesn't reopen any RLS cycle).
drop policy if exists "Teachers can send messages in their own classes" on class_messages;
create policy "Teachers can send messages in their own classes" on class_messages for insert
  with check (
    teacher_id = auth.uid()
    and exists (select 1 from classes c where c.id = class_messages.class_id and c.teacher_id = auth.uid())
    and (student_id is null or is_teacher_of_student(student_id))
  );

drop policy if exists "Teachers can view their own sent messages" on class_messages;
create policy "Teachers can view their own sent messages" on class_messages for select
  using (teacher_id = auth.uid());

drop policy if exists "Students can view messages sent to them personally" on class_messages;
create policy "Students can view messages sent to them personally" on class_messages for select
  using (student_id = auth.uid());

drop policy if exists "Students can view broadcasts to their class" on class_messages;
create policy "Students can view broadcasts to their class" on class_messages for select
  using (student_id is null and class_id = my_class_id());

drop policy if exists "Users can mark their own read receipts" on message_reads;
create policy "Users can mark their own read receipts" on message_reads for insert
  with check (user_id = auth.uid());

drop policy if exists "Users can view their own read receipts" on message_reads;
create policy "Users can view their own read receipts" on message_reads for select
  using (user_id = auth.uid());

drop policy if exists "Teachers can see who read their messages" on message_reads;
create policy "Teachers can see who read their messages" on message_reads for select
  using (exists (select 1 from class_messages cm where cm.id = message_reads.message_id and cm.teacher_id = auth.uid()));
