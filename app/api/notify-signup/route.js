// Supabase Database Webhook target — fires on every INSERT into `profiles` (i.e. every
// new signup, via the handle_new_user trigger). Protected by a shared-secret header so
// random requests to this URL can't be used to spam emails; the same secret is set both
// here (as an env var) and in the Supabase webhook config.

export async function POST(request) {
  const secret = request.headers.get("x-webhook-secret");
  if (!process.env.SUPABASE_WEBHOOK_SECRET || secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid payload" }, { status: 400 });
  }

  const email = body?.record?.email || "(unknown email)";
  const siteUrl = process.env.SITE_URL || "";

  if (!process.env.RESEND_API_KEY || !process.env.ADMIN_EMAIL) {
    // Not configured yet — don't fail the signup flow over a missing notification.
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
        subject: "New BizQuest sign-up waiting for approval",
        text: `${email} just signed up for BizQuest and needs approval.${
          siteUrl ? `\n\nApprove here: ${siteUrl}/admin` : ""
        }`,
      }),
    });
  } catch {
    // Email failed to send — nothing else to do; the admin page still shows pending users regardless.
  }

  return Response.json({ ok: true });
}
