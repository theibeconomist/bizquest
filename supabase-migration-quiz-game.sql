-- Run this in Supabase → SQL Editor, after supabase-migration-message-replies.sql.
-- Powers the teacher-only classroom quiz game's multi-device mode (teams join on their
-- own phone/laptop via a join code). Single-screen mode needs none of this — it's pure
-- client-side state in the teacher's own browser.

create table if not exists quiz_games (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid references profiles(id) not null,
  subunit_id text not null,
  join_code text unique not null,
  status text not null default 'lobby' check (status in ('lobby', 'active', 'finished')),
  questions jsonb not null, -- snapshotted [{q, options, correct}] at game creation, so every
                             -- device sees identical questions/order without re-deriving them
  current_index integer not null default 0,
  current_team_id uuid,
  revealed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists quiz_teams (
  id uuid primary key default gen_random_uuid(),
  game_id uuid references quiz_games(id) on delete cascade not null,
  name text not null,
  score integer not null default 0,
  member_user_id uuid, -- the anon-auth session id of the device that joined as this team
  created_at timestamptz not null default now()
);

create table if not exists quiz_answers (
  id bigserial primary key,
  game_id uuid references quiz_games(id) on delete cascade not null,
  team_id uuid references quiz_teams(id) on delete cascade not null,
  question_index integer not null,
  selected_option integer,
  is_correct boolean,
  answered_at timestamptz not null default now(),
  unique (team_id, question_index)
);

alter table quiz_games enable row level security;
alter table quiz_teams enable row level security;
alter table quiz_answers enable row level security;

-- Nothing here is sensitive (team names, scores, and quiz questions for a live classroom
-- game), so reads are public — this is what lets an anonymous team device subscribe to
-- realtime updates on a game it was given the code for.
drop policy if exists "Anyone can view quiz games" on quiz_games;
create policy "Anyone can view quiz games" on quiz_games for select using (true);
drop policy if exists "Anyone can view quiz teams" on quiz_teams;
create policy "Anyone can view quiz teams" on quiz_teams for select using (true);
drop policy if exists "Anyone can view quiz answers" on quiz_answers;
create policy "Anyone can view quiz answers" on quiz_answers for select using (true);

drop policy if exists "Teachers can create their own quiz games" on quiz_games;
create policy "Teachers can create their own quiz games" on quiz_games for insert
  with check (teacher_id = auth.uid() and is_teacher_or_admin_user());
drop policy if exists "Teachers can update their own quiz games" on quiz_games;
create policy "Teachers can update their own quiz games" on quiz_games for update
  using (teacher_id = auth.uid());
drop policy if exists "Teachers can delete their own quiz games" on quiz_games;
create policy "Teachers can delete their own quiz games" on quiz_games for delete
  using (teacher_id = auth.uid());

-- Teams are only ever created via join_quiz_by_code() below (security definer), so no
-- direct insert policy is needed for quiz_teams — anonymous devices never write to it directly.

-- ── Join a game by code (anonymous team devices call this) ──────────
-- Requires Supabase Anonymous Sign-ins to be enabled (Authentication → Sign In / Providers
-- → Anonymous Sign-ins) — that's what gives each joining device an auth.uid() to own its
-- team row with, none of it visible to or requiring an email/password from the player.
create or replace function join_quiz_by_code(p_code text, p_team_name text)
returns table(team_id uuid, game_id uuid, subunit_id text) as $$
declare
  v_game quiz_games;
  v_team_id uuid;
begin
  select * into v_game from quiz_games where join_code = upper(trim(p_code));
  if not found then
    raise exception 'Invalid game code.';
  end if;
  if v_game.status <> 'lobby' then
    raise exception 'This game has already started.';
  end if;

  insert into quiz_teams (game_id, name, member_user_id)
  values (v_game.id, p_team_name, auth.uid())
  returning id into v_team_id;

  return query select v_team_id, v_game.id, v_game.subunit_id;
end;
$$ language plpgsql security definer;

-- ── Submit an answer (team's own device, or the teacher on their behalf) ──
-- Scoring happens server-side and only once per (team, question) — the unique constraint
-- plus the `if found` check below means a duplicate submission never double-scores.
create or replace function submit_quiz_answer(p_game_id uuid, p_team_id uuid, p_question_index integer, p_selected_option integer, p_is_correct boolean)
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

  insert into quiz_answers (game_id, team_id, question_index, selected_option, is_correct)
  values (p_game_id, p_team_id, p_question_index, p_selected_option, p_is_correct)
  on conflict (team_id, question_index) do nothing;

  if found and p_is_correct then
    update quiz_teams set score = score + 1 where id = p_team_id;
  end if;
end;
$$ language plpgsql security definer;

-- ── Enable Realtime on these tables ──────────────────────────────────
-- Without this, postgres_changes subscriptions (what the host screen and every team's
-- device use to stay in sync) simply never fire — new tables aren't included by default.
alter publication supabase_realtime add table quiz_games;
alter publication supabase_realtime add table quiz_teams;

