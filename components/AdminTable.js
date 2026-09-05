"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function AdminTable({ initialStudents, currentUserId }) {
  const supabase = createClient();
  const [students, setStudents] = useState(initialStudents);
  const [pendingIds, setPendingIds] = useState(new Set());

  const setApproved = async (id, approved) => {
    setPendingIds((prev) => new Set(prev).add(id));
    try {
      const { error } = await supabase.from("profiles").update({ approved }).eq("id", id);
      if (!error) {
        setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, approved } : s)));
      }
    } finally {
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  if (students.length === 0) {
    return <p className="text-[13px] text-stone-500">No students have signed up yet.</p>;
  }

  return (
    <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-stone-200 text-left text-stone-500">
            <th className="px-4 py-2.5 font-medium">Email</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">XP</th>
            <th className="px-4 py-2.5 font-medium text-right">Action</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const isSelf = s.id === currentUserId;
            const isPending = pendingIds.has(s.id);
            return (
              <tr key={s.id} className="border-b border-stone-100 last:border-0">
                <td className="px-4 py-2.5">
                  {s.email || <span className="text-stone-400">(no email on file)</span>}
                  {s.is_admin && <span className="ml-2 text-[11px] text-stone-400">(admin)</span>}
                </td>
                <td className="px-4 py-2.5">
                  {s.approved ? (
                    <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 size={13} /> Approved</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600"><XCircle size={13} /> Pending</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-stone-600">{s.xp || 0}</td>
                <td className="px-4 py-2.5 text-right">
                  {isSelf ? (
                    <span className="text-stone-400 text-[12px]">—</span>
                  ) : (
                    <button
                      onClick={() => setApproved(s.id, !s.approved)}
                      disabled={isPending}
                      className={`rounded-md px-3 py-1 text-[12px] font-medium disabled:opacity-50 ${
                        s.approved ? "bg-stone-100 text-stone-600" : "text-white"
                      }`}
                      style={!s.approved ? { backgroundColor: "#15396B" } : {}}
                    >
                      {isPending ? <Loader2 size={13} className="animate-spin inline" /> : s.approved ? "Revoke" : "Approve"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
