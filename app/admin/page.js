import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminTable from "@/components/AdminTable";
import SignOutButton from "@/components/SignOutButton";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) redirect("/");

  const { data: students } = await supabase
    .from("profiles")
    .select("id, email, approved, is_admin, xp, updated_at")
    .order("approved", { ascending: true })
    .order("updated_at", { ascending: false });

  return (
    <div className="min-h-screen px-4 py-10" style={{ backgroundColor: "#FAF8F5" }}>
      <SignOutButton />
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-block mb-4 text-[13px] text-stone-500 hover:text-stone-700">
          ← Back to app
        </Link>
        <h1 className="text-[22px] font-semibold mb-1" style={{ fontFamily: "'Lora', serif", color: "#15396B" }}>
          Student approvals
        </h1>
        <p className="text-[13px] text-stone-500 mb-6">
          New sign-ups need approval before they can access BizQuest. Pending students are listed first.
        </p>
        <AdminTable initialStudents={students || []} currentUserId={user.id} />
      </div>
    </div>
  );
}
