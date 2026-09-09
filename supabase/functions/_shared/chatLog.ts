// Anonymes Protokoll der Fragen an Edi (keine Personendaten).
export async function logChat(entry: {
  question: string;
  answer?: string;
  source?: string;
  session_id?: string | null;
}) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key || !entry.question) return;
  try {
    const res = await fetch(`${url}/rest/v1/assistant_chat_logs`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "content-type": "application/json",
        Prefer: "return=minimal",
      },
      body: JSON.stringify({
        question: entry.question.slice(0, 4000),
        answer: entry.answer ? entry.answer.slice(0, 8000) : null,
        source: entry.source ?? null,
        session_id: entry.session_id ?? null,
      }),
    });
    if (!res.ok) console.error("chat log failed", res.status, await res.text());
  } catch (e) {
    console.error("chat log error", e instanceof Error ? e.message : e);
  }
}
