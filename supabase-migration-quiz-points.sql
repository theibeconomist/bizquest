-- Run this in Supabase → SQL Editor, after supabase-migration-quiz-student-only.sql.
-- Adds variable points per question (easy=1, medium=2, hard=3, bonus=3) instead of a
-- flat 1 point per correct answer, matching the app's new difficulty-based scoring.

alter table quiz_answers add column if not exists points_awarded integer not null default 0;

-- Must be dropped first: Postgres won't let CREATE OR REPLACE add a new parameter,
-- only change a function's body.
drop function if exists submit_quiz_answer(uuid, uuid, integer, integer, boolean);

create or replace function submit_quiz_answer(p_game_id uuid, p_team_id uuid, p_question_index integer, p_selected_option integer, p_is_correct boolean, p_points integer default 1)
returns void as $$
declare
  v_authorized boolean;
begin
  select exists (
    select 1 from quiz_teams t
    join quiz_games g on g.id = t.game_id
    where t.id = p_team_id and t.game_id = p_game_id
      and (t.member_user_id = auth.uid() or g.teacher_id = auth.uid())
  ) into v_authorized;

  if not v_authorized then
    raise exception 'Not authorized to submit this answer.';
  end if;

  insert into quiz_answers (game_id, team_id, question_index, selected_option, is_correct, points_awarded)
  values (p_game_id, p_team_id, p_question_index, p_selected_option, p_is_correct, case when p_is_correct then p_points else 0 end)
  on conflict (team_id, question_index) do nothing;

  if found and p_is_correct then
    update quiz_teams set score = score + p_points where id = p_team_id;
  end if;
end;
$$ language plpgsql security definer;
