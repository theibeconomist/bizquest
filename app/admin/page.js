import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminTable from "@/components/AdminTable";
import SignOutButton from "@/components/SignOutButton";
import ProfileButton from "@/components/ProfileButton";
import FeedbackTile from "@/components/FeedbackTile";
import FeedbackInbox from "@/components/FeedbackInbox";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("is_admin, role").eq("id", user.id).maybeSingle();
  if (!me?.is_admin) redirect("/");

  const { data: students } = await supabase
    .from("profiles")
    .select("id, email, approved, is_admin, role, xp, updated_at, display_name, requested_role")
    .order("approved", { ascending: true })
    .order("updated_at", { ascending: false });

  return (
    <div className="min-h-screen px-4 py-10" style={{ backgroundColor: "#FAF8F5" }}>
      <SignOutButton />
      <ProfileButton role={me.role || "admin"} className="fixed top-2.5 right-[104px] z-50" fixed={false} />
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="group inline-flex items-center gap-1.5 rounded-full bg-stone-200/60 pl-2 pr-3 py-1 mb-4 text-[12.5px] font-medium text-stone-600 transition hover:bg-stone-200 hover:text-stone-800">
          <ArrowLeft size={13} strokeWidth={2.5} className="transition-transform duration-150 group-hover:-translate-x-0.5" /> Back to app
        </Link>
        <h1 className="text-[22px] font-semibold mb-1" style={{ fontFamily: "'Lora', serif", color: "#15396B" }}>
          Student approvals
        </h1>
        <p className="text-[13px] text-stone-500 mb-6">
          New sign-ups need approval before they can access BizQuest. Pending students are listed first.
          Use the role dropdown to promote someone to teacher (full unlocked access, plus a dashboard for
          their own students) or admin.
        </p>
        <AdminTable initialStudents={students || []} currentUserId={user.id} />
        <FeedbackInbox />
        <FeedbackTile page="Admin" />
      </div>
    </div>
  );
}
