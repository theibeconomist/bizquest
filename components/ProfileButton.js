"use client";
import { useState, useEffect } from "react";
import { loadMyProfileDetails } from "@/lib/db";
import Avatar from "@/components/Avatar";
import ProfileModal from "@/components/ProfileModal";

export default function ProfileButton({ role, className = "", fixed = true }) {
  const [info, setInfo] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await loadMyProfileDetails();
        if (!cancelled) setInfo(data);
      } catch {
        // fall back to the initials placeholder — not worth surfacing an error for this
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const displayName = info?.display_name || "";
  const resolvedRole = role || info?.role || "student";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`${fixed ? "fixed top-3 right-3 z-50" : ""} rounded-full hover:opacity-80 ${className}`}
        title="Your profile"
      >
        <Avatar url={info?.avatar_url} name={displayName} size={34} />
      </button>
      {open && (
        <ProfileModal
          role={resolvedRole}
          onClose={() => setOpen(false)}
          onSaved={(saved) => setInfo((prev) => ({ ...prev, display_name: saved.displayName, extra_detail: saved.extraDetail, avatar_url: saved.avatarUrl }))}
        />
      )}
    </>
  );
}
