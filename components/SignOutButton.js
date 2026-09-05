"use client";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut } from "lucide-react";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  const onSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={onSignOut}
      className="fixed top-3 right-3 z-50 flex items-center gap-1.5 rounded-full bg-white/90 backdrop-blur border border-stone-200 px-3 py-1.5 text-[12px] font-medium text-stone-600 shadow-sm hover:bg-white"
      title="Sign out"
    >
      <LogOut size={13} /> Sign out
    </button>
  );
}
