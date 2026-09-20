-- Adds optional per-question timer support to the quiz game (multi-device mode).
-- timer_enabled is set once at game creation. question_started_at is updated every
-- time the host starts the game or advances to a new question, so every device
-- (host and every team) can compute the same countdown independently from one
-- shared timestamp, without needing its own separate sync mechanism.
alter table quiz_games add column if not exists timer_enabled boolean not null default false;
alter table quiz_games add column if not exists question_started_at timestamptz;
