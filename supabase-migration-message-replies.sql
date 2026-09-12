-- Run this in Supabase → SQL Editor, after supabase-migration-messaging.sql.
-- Lets a student reply to (or quickly acknowledge) a message from their teacher.

alter table class_messages add column if not exists sender_role text check (sender_role in ('teacher', 'student')) not null default 'teacher';
alter table class_messages add column if not exists sender_id uuid references profiles(id);
alter table class_messages add column if not exists reply_to_id bigint references class_messages(id);

-- Backfill: every row created before this migration was teacher-sent.
update class_messages set sender_id = teacher_id where sender_id is null;
alter table class_messages alter column sender_id set not null;

-- Replace the teacher insert policy to also pin down sender_role/sender_id, so a row's
-- "who actually wrote this" can't be spoofed independently of who it's filed under.
drop policy if exists "Teachers can send messages in their own classes" on class_messages;
create policy "Teachers can send messages in their own classes" on class_messages for insert
  with check (
    sender_role = 'teacher'
    and sender_id = auth.uid()
    and teacher_id = auth.uid()
    and exists (select 1 from classes c where c.id = class_messages.class_id and c.teacher_id = auth.uid())
    and (student_id is null or is_teacher_of_student(student_id))
  );

-- A student can reply only as themselves, only into their own class, and only naming
-- that class's actual teacher — never someone else's teacher or another student's thread.
drop policy if exists "Students can reply to their teacher" on class_messages;
create policy "Students can reply to their teacher" on class_messages for insert
  with check (
    sender_role = 'student'
    and sender_id = auth.uid()
    and student_id = auth.uid()
    and class_id = my_class_id()
    and teacher_id = (select c.teacher_id from classes c where c.id = my_class_id())
  );
