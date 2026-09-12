import { createClient } from "@supabase/supabase-js";

// For server-only jobs that have no logged-in user to act as (e.g. the weekly digest
// cron) and therefore need to bypass RLS entirely via the service role key. Never import
// this from a "use client" file or an API route reachable without its own auth check —
// unlike lib/supabase/server.js (cookie-based, respects RLS as the calling user), this
// client can read and write anything in the database.
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
