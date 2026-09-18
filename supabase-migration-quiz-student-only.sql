-- Run this in Supabase → SQL Editor, after supabase-migration-quiz-game.sql.
-- Restricts joining a multi-device quiz game to real, approved student accounts —
-- specifically, students in the class the game was created for. No more anonymous
-- sign-in needed at all; this replaces that approach entirely.

alter table quiz_games add column if not exists class_id uuid references classes(id);

-- Teachers can only tie a game to one of their own classes (or leave it null to allow
-- any approved student to join, e.g. if they haven't set up a class yet).
drop policy if exists "Teachers can create their own quiz games" on quiz_games;
create policy "Teachers can create their own quiz games" on quiz_games for insert
  with check (
    teacher_id = auth.uid() and is_teacher_or_admin_user()
    and (class_id is null or exists (select 1 from classes c where c.id = class_id and c.teacher_id = auth.uid()))
  );

-- Replaces join_quiz_by_code entirely: now requires a real, signed-in, approved student
-- account — and if the game is tied to a class, the student must belong to that class.
-- Reconnects an existing team (rather than creating a duplicate) if the same student
-- rejoins, e.g. after a page refresh.
create or replace function join_quiz_by_code(p_code text, p_team_name text)
returns table(team_id uuid, game_id uuid, subunit_id text) as $$
declare
  v_game quiz_games;
  v_student profiles;
  v_team_id uuid;
begin
  if auth.uid() is null then
    raise exception 'You need to be signed in to BizQuest to join.';
  end if;

  select * into v_student from profiles where id = auth.uid();
  if not found or v_student.role <> 'student' or not coalesce(v_student.approved, false) then
    raise exception 'Only approved student accounts can join a quiz game.';
  end if;

  select * into v_game from quiz_games where join_code = upper(trim(p_code));
  if not found then
    raise exception 'Invalid game code.';
  end if;
  if v_game.status <> 'lobby' then
    raise exception 'This game has already started.';
  end if;
  if v_game.class_id is not null and v_student.class_id is distinct from v_game.class_id then
    raise exception 'This game is only open to students in the matching class.';
  end if;

  select id into v_team_id from quiz_teams where game_id = v_game.id and member_user_id = auth.uid();
  if v_team_id is null then
    insert into quiz_teams (game_id, name, member_user_id)
    values (v_game.id, p_team_name, auth.uid())
    returning id into v_team_id;
  end if;

  return query select v_team_id, v_game.id, v_game.subunit_id;
end;
$$ language plpgsql security definer;
