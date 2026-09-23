"use client";
import { useState, useEffect } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { loadAllFeedback } from "@/lib/db";

const ROLE_COLORS = { teacher: "#4A6FA5", admin: "#8B3A4A", student: "#78716c" };

export default function FeedbackInbox() {
  const [feedback, setFeedback] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadAllFeedback();
        if (!cancelled) setFeedback(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 mt-6">
      <div className="flex items-center gap-1.5 mb-3">
        <MessageSquare size={14} className="text-stone-400" />
        <h2 className="text-[14px] font-semibold text-stone-700">Feedback inbox</h2>
        {feedback.length > 0 && <span className="text-[11px] text-stone-400">({feedback.length})</span>}
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-stone-500 text-[13px] py-6 justify-center">
          <Loader2 size={15} className="animate-spin" /> Loading…
        </div>
      )}

      {!loading && feedback.length === 0 && (
        <p className="text-[13px] text-stone-500 py-2">No feedback submitted yet.</p>
      )}

      {!loading && feedback.length > 0 && (
        <div className="space-y-2.5 max-h-[480px] overflow-y-auto">
          {feedback.map((f) => (
            <div key={f.id} className="rounded-md border border-stone-200 px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-[12.5px] font-medium text-stone-700">{f.display_name || f.user_email || "(unknown)"}</span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white capitalize"
                  style={{ backgroundColor: ROLE_COLORS[f.user_role] || ROLE_COLORS.student }}
                >
                  {f.user_role || "student"}
                </span>
                {f.display_name && f.user_email && <span className="text-[11px] text-stone-400">{f.user_email}</span>}
                <span className="text-[11px] text-stone-400 ml-auto">{new Date(f.created_at).toLocaleString()}</span>
              </div>
              <div className="text-[11.5px] text-stone-400 mb-1">On: {f.page || "(unknown page)"}</div>
              <p className="text-[13px] text-stone-700 whitespace-pre-wrap">{f.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
