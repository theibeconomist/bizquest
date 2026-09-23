"use client";
import { useState } from "react";
import { MessageSquarePlus, Loader2, Check } from "lucide-react";
import { submitFeedback } from "@/lib/db";

const NAVY = "#15396B";

// A small tile meant to sit at the bottom of a page/screen — not a modal, so it doesn't
// interrupt anything, but always available if something's wrong or worth flagging.
export default function FeedbackTile({ page }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | sent | error
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || status === "sending") return;
    setStatus("sending");
    setError("");
    try {
      await submitFeedback({ page, message: message.trim() });
      setStatus("sent");
      setMessage("");
    } catch (err) {
      setStatus("error");
      setError(err.message || "Could not send feedback.");
    }
  };

  if (status === "sent") {
    return (
      <div className="mx-auto max-w-2xl px-5 py-6">
        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3.5 flex items-center gap-2 text-[13px] text-stone-600">
          <Check size={15} className="text-green-600 shrink-0" />
          Thanks — your feedback was sent.
          <button onClick={() => setStatus("idle")} className="ml-auto text-[12px] underline text-stone-400 hover:text-stone-600">
            Send another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-6">
      <div className="rounded-lg border border-stone-200 bg-white px-4 py-3.5">
        {!open ? (
          <button
            onClick={() => setOpen(true)}
            className="flex w-full items-center gap-2 text-[13px] font-medium text-stone-600 hover:text-stone-800"
          >
            <MessageSquarePlus size={15} className="text-stone-400" />
            Got feedback or spotted a problem? Let us know.
          </button>
        ) : (
          <form onSubmit={onSubmit} className="space-y-2.5">
            <div className="flex items-center gap-2 text-[13px] font-medium text-stone-700">
              <MessageSquarePlus size={15} className="text-stone-400" /> Send feedback
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What's on your mind — a bug, a suggestion, anything."
              rows={3}
              className="w-full rounded-md border border-stone-300 px-2.5 py-2 text-[13px] focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": NAVY }}
            />
            {error && <p className="text-[12px] text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setOpen(false); setMessage(""); setStatus("idle"); setError(""); }}
                className="rounded-md px-3 py-1.5 text-[12.5px] font-medium text-stone-600 hover:bg-stone-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={status === "sending"}
                className="rounded-md px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: NAVY }}
              >
                {status === "sending" ? <Loader2 size={13} className="animate-spin inline" /> : "Send"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
