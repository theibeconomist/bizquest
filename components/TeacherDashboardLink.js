"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { loadUnreadReplyCount } from "@/lib/db";

export default function TeacherDashboardLink({ className }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const count = await loadUnreadReplyCount();
        if (!cancelled) setUnread(count);
      } catch {
        // badge just stays at 0 on failure — not worth surfacing an error for this
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Link href="/teacher" className={className} style={{ position: "relative" }}>
      Teacher dashboard
      {unread > 0 && (
        <span
          className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-white text-[10px] font-semibold"
          style={{ backgroundColor: "#B3392C", minWidth: 16, height: 16, padding: "0 3px" }}
        >
          {unread}
        </span>
      )}
    </Link>
  );
}
