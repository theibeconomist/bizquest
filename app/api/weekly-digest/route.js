import { createAdminClient } from "@/lib/supabase/admin";

// Triggered weekly by Vercel Cron (see vercel.json). Vercel automatically sends
// `Authorization: Bearer $CRON_SECRET` on its own invocations when CRON_SECRET is set —
// this route just checks that header matches, so nobody else can trigger a mass-email run
// by guessing the URL.
function isAuthorized(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}
function pct(earned, possible) {
  return possible > 0 ? Math.round((earned / possible) * 100) : null;
}
function daysBetweenISO(fromISO, toISO) {
  const a = new Date(fromISO + "T00:00:00Z");
  const b = new Date(toISO + "T00:00:00Z");
  return Math.round((b - a) / 86400000);
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ skipped: true, reason: "RESEND_API_KEY not configured" });
  }

  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const since90 = isoDaysAgo(90);
  const since90ISO = new Date(Date.now() - 90 * 86400000).toISOString();

  const { data: classes, error: classesError } = await supabase.from("classes").select("id, name, teacher_email");
  if (classesError) {
    return Response.json({ error: classesError.message }, { status: 500 });
  }

  const siteUrl = process.env.SITE_URL || "";
  let emailsSent = 0;
  const summary = [];

  for (const cls of classes || []) {
    if (!cls.teacher_email) continue;

    const { data: roster } = await supabase.from("profiles").select("id, email, display_name").eq("class_id", cls.id);
    if (!roster || roster.length === 0) { summary.push({ class: cls.name, flagged: 0, skipped: "no students" }); continue; }
    const ids = roster.map((r) => r.id);

    const [{ data: activity }, { data: attempts }] = await Promise.all([
      supabase.from("daily_activity").select("user_id, activity_date, seconds_spent").in("user_id", ids).gte("activity_date", since90),
      supabase.from("question_attempts").select("user_id, marks_earned, marks_possible").in("user_id", ids).gte("submitted_at", since90ISO),
    ]);

    const flagged = [];
    for (const s of roster) {
      const rows = (activity || []).filter((a) => a.user_id === s.id);
      const activeDates = rows.filter((a) => (a.seconds_spent || 0) > 0).map((a) => a.activity_date);
      const lastActiveDate = activeDates.length ? activeDates.sort().at(-1) : null;
      const daysSinceActive = lastActiveDate ? daysBetweenISO(lastActiveDate, today) : null;

      const myAttempts = (attempts || []).filter((a) => a.user_id === s.id);
      const earned = myAttempts.reduce((sum, a) => sum + (a.marks_earned || 0), 0);
      const possible = myAttempts.reduce((sum, a) => sum + (a.marks_possible || 0), 0);
      const accuracy = pct(earned, possible);

      const reasons = [];
      if (accuracy !== null && myAttempts.length >= 3 && accuracy < 60) reasons.push(`low accuracy (${accuracy}%)`);
      if (lastActiveDate !== null && daysSinceActive >= 3) reasons.push(`inactive ${daysSinceActive} day${daysSinceActive === 1 ? "" : "s"}`);
      if (reasons.length > 0) flagged.push({ label: s.display_name || s.email || "(unnamed student)", reasons });
    }

    summary.push({ class: cls.name, flagged: flagged.length });
    if (flagged.length === 0) continue;

    const lines = flagged.map((f) => `• ${f.label} — ${f.reasons.join(", ")}`).join("\n");
    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "BizQuest <onboarding@resend.dev>",
          to: [cls.teacher_email],
          subject: `BizQuest weekly digest — ${cls.name} (${flagged.length} to check on)`,
          text: `Weekly check-in for ${cls.name}:\n\n${lines}\n\n${siteUrl ? `Full dashboard: ${siteUrl}/teacher` : ""}`,
        }),
      });
      emailsSent++;
    } catch {
      // one class's email failing shouldn't stop the rest of the digest from sending
    }
  }

  return Response.json({ ok: true, classesChecked: (classes || []).length, emailsSent, summary });
}
