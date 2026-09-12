import { createClient } from "@/lib/supabase/server";

// Requires a real signed-in session (unlike /api/grade, which is a pure LLM proxy with
// nothing user-specific to protect) — this route sends an email on someone's behalf, so
// it's worth confirming the request actually comes from a logged-in BizQuest user first.
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const message = (body?.message || "").toString().slice(0, 4000);
  const page = (body?.page || "unknown page").toString().slice(0, 200);
  if (!message.trim()) {
    return Response.json({ error: "Feedback message is empty." }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) {
    // Not configured yet — the feedback row is already saved regardless, so this is fine to skip.
    return Response.json({ skipped: true });
  }

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "BizQuest <onboarding@resend.dev>",
        to: [process.env.ADMIN_EMAIL],
        subject: `New BizQuest feedback (${page})`,
        text: `From: ${user.email || "(unknown)"}\nPage: ${page}\n\n${message}`,
      }),
    });
  } catch {
    // Email failed to send — the feedback row itself is already saved, so nothing else to do.
  }

  return Response.json({ ok: true });
}
