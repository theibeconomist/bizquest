import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuizPlayClient from "@/components/QuizPlayClient";

// Joining a quiz game now requires a real, already-authenticated, approved student
// account (see join_quiz_by_code in the database) — this mirrors that same requirement
// at the page level, so an unauthenticated visitor is sent to log in first rather than
// reaching a join form that would just fail server-side anyway.
export default async function PlayPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <QuizPlayClient />;
}
