"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function AdminTable({ initialStudents, currentUserId }) {
  const supabase = createClient();
  const [students, setStudents] = useState(initialStudents);
  const [pendingIds, setPendingIds] = useState(new Set());
  const [confirming, setConfirming] = useState(null); // { student, action: "revoke" | "makeAdmin" }

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

  // Role and is_admin are updated together in one call so the legacy is_admin flag
  // (still used by the /admin page's own access check) always stays consistent with role.
  const setRole = async (id, role) => {
    setPendingIds((prev) => new Set(prev).add(id));
    try {
      const { error } = await supabase.from("profiles").update({ role, is_admin: role === "admin" }).eq("id", id);
      if (!error) {
        setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, role, is_admin: role === "admin" } : s)));
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
    <div className="bg-white rounded-xl border border-stone-200 overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-stone-200 text-left text-stone-500">
            <th className="px-4 py-2.5 font-medium">Email</th>
            <th className="px-4 py-2.5 font-medium">Status</th>
            <th className="px-4 py-2.5 font-medium">Role</th>
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
                  <div className="font-medium text-stone-700">
                    {s.display_name || s.email || <span className="text-stone-400 font-normal">(no name or email on file)</span>}
                  </div>
                  {s.display_name && s.email && <div className="text-[11px] text-stone-400">{s.email}</div>}
                  {s.is_admin && <span className="text-[11px] text-stone-400">(admin)</span>}
                  {!s.approved && s.requested_role === "teacher" && (
                    <span className="ml-1.5 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10.5px] font-medium text-amber-700">
                      Signed up as: Teacher
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {s.approved ? (
                    <span className="inline-flex items-center gap-1 text-green-700"><CheckCircle2 size={13} /> Approved</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-amber-600"><XCircle size={13} /> Pending</span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  {isSelf ? (
                    <span className="text-[12.5px] text-stone-500 capitalize">{s.role || "student"}</span>
                  ) : (
                    <select
                      value={s.role || "student"}
                      onChange={(e) => {
                        const nextRole = e.target.value;
                        if (nextRole === "admin") setConfirming({ student: s, action: "makeAdmin" });
                        else setRole(s.id, nextRole);
                      }}
                      disabled={isPending}
                      className="rounded-md border border-stone-300 px-2 py-1 text-[12.5px] disabled:opacity-50"
                    >
                      <option value="student">Student</option>
                      <option value="teacher">Teacher</option>
                      <option value="admin">Admin</option>
                    </select>
                  )}
                </td>
                <td className="px-4 py-2.5 text-stone-600">{s.xp || 0}</td>
                <td className="px-4 py-2.5 text-right">
                  {isSelf ? (
                    <span className="text-stone-400 text-[12px]">—</span>
                  ) : (
                    <button
                      onClick={() => (s.approved ? setConfirming({ student: s, action: "revoke" }) : setApproved(s.id, true))}
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
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-xl border border-stone-200 shadow-lg max-w-sm w-full p-5">
            <h3 className="text-[15px] font-semibold text-stone-800 mb-2">
              {confirming.action === "makeAdmin" ? "Grant admin access?" : "Revoke approval?"}
            </h3>
            <p className="text-[13px] text-stone-500 mb-4">
              {confirming.action === "makeAdmin"
                ? `${confirming.student.display_name || confirming.student.email || "This user"} will get full admin access — approving/rejecting any account, changing any role, and everything else admins can do.`
                : `${confirming.student.display_name || confirming.student.email || "This user"} will lose access until re-approved.`}
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirming(null)} className="rounded-md px-3 py-1.5 text-[12.5px] font-medium text-stone-600 hover:bg-stone-100">Cancel</button>
              <button
                onClick={() => {
                  if (confirming.action === "makeAdmin") setRole(confirming.student.id, "admin");
                  else setApproved(confirming.student.id, false);
                  setConfirming(null);
                }}
                className="rounded-md px-3 py-1.5 text-[12.5px] font-semibold text-white"
                style={{ backgroundColor: confirming.action === "makeAdmin" ? "#15396B" : "#B3392C" }}
              >
                {confirming.action === "makeAdmin" ? "Grant admin" : "Revoke"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
