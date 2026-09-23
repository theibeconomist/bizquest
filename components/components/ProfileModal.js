"use client";
import { useState, useEffect, useRef } from "react";
import { Loader2, X, Camera } from "lucide-react";
import { loadMyProfileDetails, saveProfileDetails, uploadAvatar } from "@/lib/db";
import Avatar from "@/components/Avatar";

const NAVY = "#15396B";

// Resizes/center-crops an uploaded image to a square JPEG before it ever reaches
// Supabase Storage — keeps every avatar small (a few tens of KB) regardless of what
// the original photo was, so storage/bandwidth stay trivial even at class scale.
function resizeImageToSquareJPEG(file, targetSize = 320, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const side = Math.min(img.width, img.height);
      const sx = (img.width - side) / 2;
      const sy = (img.height - side) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, sx, sy, side, side, 0, 0, targetSize, targetSize);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (blob) resolve(blob); else reject(new Error("Could not process image."));
      }, "image/jpeg", quality);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image file.")); };
    img.src = url;
  });
}

export default function ProfileModal({ role, onClose, onSaved }) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [extraDetail, setExtraDetail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const isTeacherLike = role === "teacher" || role === "admin";
  const detailLabel = isTeacherLike ? "Subject you teach" : "School / grade";
  const detailPlaceholder = isTeacherLike ? "e.g. IB Business Management" : "e.g. Riverside High, Grade 11";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await loadMyProfileDetails();
        if (cancelled || !info) return;
        setDisplayName(info.display_name || "");
        setExtraDetail(info.extra_detail || "");
        setAvatarUrl(info.avatar_url || null);
      } catch {
        // leave fields blank on failure — not worth blocking the modal over
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const blob = await resizeImageToSquareJPEG(file);
      const url = await uploadAvatar(blob);
      setAvatarUrl(url);
    } catch (err) {
      setError(err.message || "Could not upload photo.");
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    setSaving(true);
    setError("");
    try {
      await saveProfileDetails({ displayName: displayName.trim(), extraDetail: extraDetail.trim() });
      onSaved?.({ displayName: displayName.trim(), extraDetail: extraDetail.trim(), avatarUrl });
      onClose();
    } catch (err) {
      setError(err.message || "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="bg-white rounded-xl border border-stone-200 shadow-lg max-w-sm w-full p-5">
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-[16px] font-semibold text-stone-800" style={{ fontFamily: "'Lora', serif" }}>Your profile</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600"><X size={16} /></button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-stone-500 text-[13px] py-6 justify-center">
            <Loader2 size={15} className="animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar url={avatarUrl} name={displayName} size={56} />
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                    <Loader2 size={16} className="animate-spin text-white" />
                  </div>
                )}
              </div>
              <div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 px-2.5 py-1.5 text-[12.5px] font-medium text-stone-600 hover:bg-stone-50 disabled:opacity-60"
                >
                  <Camera size={13} /> {avatarUrl ? "Change photo" : "Add photo"}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={onPickFile} className="hidden" />
                <p className="text-[11px] text-stone-400 mt-1">JPG or PNG, cropped to a square automatically.</p>
              </div>
            </div>

            <div>
              <label className="block text-[12px] font-medium text-stone-600 mb-1">Display name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Chen"
                className="w-full rounded-md border border-stone-300 px-2.5 py-1.5 text-[13.5px] focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": NAVY }}
              />
            </div>

            <div>
              <label className="block text-[12px] font-medium text-stone-600 mb-1">{detailLabel}</label>
              <input
                value={extraDetail}
                onChange={(e) => setExtraDetail(e.target.value)}
                placeholder={detailPlaceholder}
                className="w-full rounded-md border border-stone-300 px-2.5 py-1.5 text-[13.5px] focus:outline-none focus:ring-2"
                style={{ "--tw-ring-color": NAVY }}
              />
            </div>

            {error && <p className="text-[12px] text-red-600">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button onClick={onClose} className="rounded-md px-3 py-1.5 text-[12.5px] font-medium text-stone-600 hover:bg-stone-100">Cancel</button>
              <button
                onClick={onSave}
                disabled={saving || uploading}
                className="rounded-md px-3 py-1.5 text-[12.5px] font-semibold text-white disabled:opacity-60"
                style={{ backgroundColor: NAVY }}
              >
                {saving ? <Loader2 size={13} className="animate-spin inline" /> : "Save"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
