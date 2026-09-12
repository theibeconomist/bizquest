// Server-side proxy so the Anthropic API key never reaches the browser. The client sends
// the same { model, max_tokens, messages } body it used to send directly to
// api.anthropic.com from inside the Claude.ai artifact — this route just forwards it with
// the real key attached, so nothing on the client side needs to change beyond the URL.

export async function POST(request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Server is missing ANTHROPIC_API_KEY — set it in your hosting provider's environment variables." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: body.model || "claude-sonnet-4-6",
        max_tokens: body.max_tokens || 1000,
        messages: body.messages,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      return Response.json({ error: data?.error?.message || "Grading service returned an error." }, { status: response.status });
    }
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: err.message || "Failed to reach the grading service." }, { status: 502 });
  }
}
