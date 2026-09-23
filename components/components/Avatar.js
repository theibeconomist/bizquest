"use client";

// A circular avatar: shows the real photo if avatarUrl is set, otherwise falls back to
// initials derived from a display name or email — so profiles look reasonable even
// before someone's uploaded a photo.
export default function Avatar({ url, name, size = 32, ringColor = "#e7e2d8" }) {
  const initials = (name || "?")
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "?";

  const style = {
    width: size,
    height: size,
    borderRadius: "9999px",
    flexShrink: 0,
    border: `1px solid ${ringColor}`,
  };

  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- external Supabase Storage URLs, not a local asset
    return <img src={url} alt="" style={{ ...style, objectFit: "cover" }} />;
  }

  return (
    <div
      style={{
        ...style,
        backgroundColor: "#15396B",
        color: "white",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(10, Math.round(size * 0.38)),
        fontWeight: 600,
        letterSpacing: "0.02em",
      }}
    >
      {initials}
    </div>
  );
}
