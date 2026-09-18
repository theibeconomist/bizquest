import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TeacherDashboard from "@/components/TeacherDashboard";
import SignOutButton from "@/components/SignOutButton";
import ProfileButton from "@/components/ProfileButton";
import FeedbackTile from "@/components/FeedbackTile";

export default async function TeacherPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role, is_admin").eq("id", user.id).maybeSingle();
  const canAccess = me?.role === "teacher" || me?.role === "admin" || me?.is_admin;
  if (!canAccess) redirect("/");

  const { data: classes } = await supabase
    .from("classes")
    .select("*")
    .eq("teacher_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen px-4 py-10" style={{ backgroundColor: "#FAF8F5" }}>
      <SignOutButton />
      <ProfileButton role={me.role} className="fixed top-2.5 right-[104px] z-50" fixed={false} />
      <div className="max-w-5xl mx-auto">
        <Link href="/" className="inline-block mb-4 text-[13px] text-stone-500 hover:text-stone-700">
          ← Back to app
        </Link>
        <div className="flex items-start justify-between gap-3 mb-1">
          <h1 className="text-[22px] font-semibold" style={{ fontFamily: "'Lora', serif", color: "#15396B" }}>
            Teacher dashboard
          </h1>
          <Link
            href="/teacher/quiz"
            className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 bg-white px-3 py-1.5 text-[12.5px] font-medium text-stone-600 hover:bg-stone-50 shrink-0"
          >
            🎮 Quiz Game
          </Link>
        </div>
        <p className="text-[13px] text-stone-500 mb-6">
          Create a class, share its join code with your students, then track how they are doing.
        </p>
        <TeacherDashboard initialClasses={classes || []} />
        <FeedbackTile page="Teacher dashboard" />
      </div>
    </div>
  );
}
