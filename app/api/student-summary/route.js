import { createClient } from "@/lib/supabase/server";

// Gated to teacher/admin (unlike /api/grade, which any signed-in student calls to grade
// their own answers) — this summarizes another person's data, so it's worth confirming
// the caller actually has a teacher/admin role before spending an API call on it.
export async function POST(request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not signed in." }, { status: 401 });
  }
  const { data: me } = await supabase.from("profiles").select("role, is_admin").eq("id", user.id).maybeSingle();
  if (me?.role !== "teacher" && me?.role !== "admin" && !me?.is_admin) {
    return Response.json({ error: "Not authorized." }, { status: 403 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Server is missing ANTHROPIC_API_KEY." }, { status: 500 });
  }

  let stats;
  try {
    stats = (await request.json())?.stats;
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (!stats) {
    return Response.json({ error: "Missing stats." }, { status: 400 });
  }

  const prompt = `You are an experienced IB Business Management teacher's assistant. Below is a JSON summary of one student's activity in a self-study app (BizQuest), covering their subunit progress, accuracy on graded practice questions (by subunit and by question type), comprehension-check performance (separate from accuracy), engagement (time spent, streak, last active), persistence (how many tries questions typically take), and their lowest-scoring individual questions.

Write a short, plain-text summary for their teacher — 3 to 5 sentences — covering: (1) where they currently stand overall, (2) one or two genuine strengths, (3) the single area most worth the teacher's attention next, framed as a concrete, actionable suggestion (e.g. "revisit the definition of X" or "practice more structured questions in subunit Y"). Be specific and reference actual numbers/subunits/question types from the data — avoid generic filler. Do not use markdown formatting, headers, or bullet points — just plain prose. Do not address the student directly (\"you\") — write about them in the third person, since this is for the teacher.

STUDENT DATA:
${JSON.stringify(stats, null, 2)}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 400,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return Response.json({ error: data?.error?.message || "AI summary service returned an error." }, { status: response.status });
    }
    const textBlock = (data.content || []).find((b) => b.type === "text");
    if (!textBlock) {
      return Response.json({ error: "No summary text returned." }, { status: 502 });
    }
    return Response.json({ summary: textBlock.text.trim() });
  } catch (err) {
    return Response.json({ error: err.message || "Failed to reach the AI summary service." }, { status: 502 });
  }
}
