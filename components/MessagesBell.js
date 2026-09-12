"use client";
import { useState, useEffect } from "react";
import { Bell, X, Loader2, ThumbsUp, Reply, Send } from "lucide-react";
import { loadMyMessages, markMessageRead, replyToTeacher } from "@/lib/db";

function MessageRow({ m, onReplied }) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sentJustNow, setSentJustNow] = useState(false);

  // Only a teacher-authored message that isn't itself already a reply can be acknowledged
  // or replied to — keeps this to one level of threading rather than infinite back-and-forth.
  const canRespond = m.sender_role !== "student";

  const send = async (body) => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      await replyToTeacher({ classId: m.class_id, teacherId: m.teacher_id, message: body.trim(), replyToId: m.id });
      setText("");
      setReplying(false);
      setSentJustNow(true);
      onReplied?.();
    } catch {
      // best-effort UI — a failed reply just leaves the box open so they can try again
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 px-3 py-2.5">
      <div className="text-[11px] text-stone-400 mb-1">
        {m.sender_role === "student" ? "Your reply" : m.student_id ? "From your teacher" : "Class announcement"} · {new Date(m.created_at).toLocaleString()}
      </div>
      <p className="text-[13px] text-stone-700 whitespace-pre-wrap mb-1.5">{m.message}</p>

      {canRespond && (
        <>
          {sentJustNow && !replying && (
            <div className="text-[11.5px] text-green-700">Sent ✓</div>
          )}
          {!replying && !sentJustNow && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => send("Got it, thanks!")}
                disabled={sending}
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-stone-500 hover:text-stone-700 disabled:opacity-60"
              >
                <ThumbsUp size={11} /> Acknowledge
              </button>
              <button
                onClick={() => setReplying(true)}
                className="inline-flex items-center gap-1 text-[11.5px] font-medium text-stone-500 hover:text-stone-700"
              >
                <Reply size={11} /> Reply
              </button>
            </div>
          )}
          {replying && (
            <div className="space-y-1.5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a reply…"
                rows={2}
                autoFocus
                className="w-full rounded-md border border-stone-300 px-2 py-1.5 text-[12.5px] focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": "#15396B" }}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setReplying(false); setText(""); }} className="text-[11.5px] text-stone-500 hover:text-stone-700">
                  Cancel
                </button>
                <button
                  onClick={() => send(text)}
                  disabled={sending || !text.trim()}
                  className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[11.5px] font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: "#15396B" }}
                >
                  {sending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />} Send
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

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
                messages.map((m) => <MessageRow key={m.id} m={m} onReplied={refresh} />)
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
