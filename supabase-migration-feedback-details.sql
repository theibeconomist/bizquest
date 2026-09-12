-- Run this in Supabase → SQL Editor, after supabase-migration-signup-and-feedback.sql.
-- Denormalizes the submitter's role and display name onto each feedback row (captured at
-- submit time), so the admin can see who sent it and what kind of account they are without
-- an extra join/RLS policy back to profiles.
alter table feedback add column if not exists user_role text;
alter table feedback add column if not exists display_name text;
