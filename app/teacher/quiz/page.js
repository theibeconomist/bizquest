import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import QuizGame from "@/components/QuizGame";
import SignOutButton from "@/components/SignOutButton";
import ProfileButton from "@/components/ProfileButton";

export default async function TeacherQuizPage({ searchParams }) {
  const params = await searchParams;
  const initialSubunitId = params?.subunit || null;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role, is_admin").eq("id", user.id).maybeSingle();
  const canAccess = me?.role === "teacher" || me?.role === "admin" || me?.is_admin;
  if (!canAccess) redirect("/");

  return (
    <div className="min-h-screen px-4 py-10" style={{ backgroundColor: "#FAF8F5" }}>
      <SignOutButton />
      <ProfileButton role={me.role} className="fixed top-2.5 right-[104px] z-50" fixed={false} />
      <div className="max-w-3xl mx-auto">
        <Link href="/teacher" className="inline-block mb-4 text-[13px] text-stone-500 hover:text-stone-700">
          ← Back to teacher dashboard
        </Link>
        <h1 className="text-[22px] font-semibold mb-1" style={{ fontFamily: "'Lora', serif", color: "#15396B" }}>
          Quiz Game
        </h1>
        <p className="text-[13px] text-stone-500 mb-6">
          Pick a subunit, set up teams, and go.
        </p>
        <QuizGame initialSubunitId={initialSubunitId} />
      </div>
    </div>
  );
}
