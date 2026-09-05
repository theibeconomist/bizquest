import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BizQuest from "@/components/BizQuest";
import SignOutButton from "@/components/SignOutButton";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("approved, is_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#FAF8F5" }}>
        <SignOutButton />
        <div className="max-w-md text-center bg-white rounded-xl border border-red-200 shadow-sm p-8">
          <h1 className="text-[20px] font-semibold mb-2 text-red-700">Couldn't load your profile</h1>
          <p className="text-[13px] text-stone-600 font-mono break-all">{profileError.message}</p>
        </div>
      </div>
    );
  }

  if (!profile?.approved) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#FAF8F5" }}>
        <SignOutButton />
        <div className="max-w-md text-center bg-white rounded-xl border border-stone-200 shadow-sm p-8">
          <h1 className="text-[20px] font-semibold mb-2" style={{ fontFamily: "'Lora', serif", color: "#15396B" }}>
            Almost there
          </h1>
          <p className="text-[14px] text-stone-600 mb-4">
            Your account is created, but your teacher needs to approve it before you can start. Check back soon.
          </p>
          {/* TEMPORARY diagnostics — remove once this is resolved */}
          <div className="text-left text-[11px] font-mono bg-stone-50 border border-stone-200 rounded p-3 break-all">
            <div>auth user id: {user.id}</div>
            <div>profile found: {profile ? "yes" : "no"}</div>
            <div>profile data: {JSON.stringify(profile)}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <SignOutButton />
      {profile.is_admin && (
        <Link
          href="/admin"
          className="fixed top-3 right-[104px] z-50 flex items-center rounded-full bg-white/90 backdrop-blur border border-stone-200 px-3 py-1.5 text-[12px] font-medium text-stone-600 shadow-sm hover:bg-white"
        >
          Admin
        </Link>
      )}
      <BizQuest />
    </>
  );
}
