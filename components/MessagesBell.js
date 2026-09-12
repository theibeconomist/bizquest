"use client";
import { useState, useEffect } from "react";
import { Bell, X, Loader2 } from "lucide-react";
import { loadMyMessages, markMessageRead } from "@/lib/db";

export default function MessagesBell() {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    try {
      const data = await loadMyMessages();
      setMessages(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const unreadCount = messages.filter((m) => !m.isRead).length;

  const onOpen = async () => {
    setOpen(true);
    // Mark everything currently visible as read as soon as the student opens the list —
    // simple "seen it" semantics rather than per-message dismissal.
    const unread = messages.filter((m) => !m.isRead);
    if (unread.length > 0) {
      await Promise.all(unread.map((m) => markMessageRead(m.id)));
      setMessages((prev) => prev.map((m) => ({ ...m, isRead: true })));
    }
  };

  return (
    <>
      <button
        onClick={onOpen}
        className="relative flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
        style={{ width: 34, height: 34 }}
        title="Messages from your teacher"
      >
        <Bell size={15} className="text-white" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 flex items-center justify-center rounded-full text-white text-[10px] font-semibold"
            style={{ backgroundColor: "#B3392C", minWidth: 16, height: 16, padding: "0 3px" }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="bg-white rounded-xl border border-stone-200 shadow-lg max-w-sm w-full p-5 max-h-[80vh] flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-[15px] font-semibold text-stone-800" style={{ fontFamily: "'Lora', serif" }}>Messages</h3>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-stone-600"><X size={16} /></button>
            </div>
            <div className="overflow-y-auto space-y-2">
              {loading ? (
                <div className="flex items-center gap-2 text-stone-500 text-[13px] py-6 justify-center">
                  <Loader2 size={15} className="animate-spin" /> Loading…
                </div>
              ) : messages.length === 0 ? (
                <p className="text-[13px] text-stone-400 py-4 text-center">No messages yet.</p>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2.5">
                    <div className="text-[11px] text-stone-400 mb-1">
                      {m.student_id ? "From your teacher" : "Class announcement"} · {new Date(m.created_at).toLocaleString()}
                    </div>
                    <p className="text-[13px] text-stone-700 whitespace-pre-wrap">{m.message}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
