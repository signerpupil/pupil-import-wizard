// Claude-basierter Assistent mit zweistufiger Logik (Klassifizierung + Antwort).
// Modell laut User: "claude-sonnet-4-6" -> aktuell existiert kein 4-6 Release;
// deshalb aktuellste Sonnet-Version. Bei Bedarf einfach CLAUDE_MODEL ändern.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const CLAUDE_MODEL = "claude-sonnet-4-5-20250929";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT_STATIC = `Du bist der PUPIL Import-Assistent. Du hilfst Schweizer Schulverwaltungen beim Onboarding und bei Datenimporten (Stammdaten SuS/EZB, Stammdaten Lehrpersonen, Gruppen, Lehrer-Zuweisungen).

Grundregeln:
- Antworte in Schweizer Hochdeutsch, freundlich, präzise, kurz.
- Nutze Markdown: **fett**, *kursiv*, Listen, [Linktexte](https://…).
- Verarbeite NIEMALS personenbezogene Daten. Wenn der User Namen/AHV/Adressen sendet, weise höflich darauf hin.
- Wenn du unsicher bist, sag es. Erfinde keine Feldnamen oder URLs.
- Beziehe dich auf die interne Onboarding-Doku und die Koneksa-Wissensbasis.`;

const SYSTEM_PROMPT_LIVE = `${SYSTEM_PROMPT_STATIC}

Für diese Anfrage darfst du das web_search Tool nutzen, um aktuelle Doku, Release-Notes oder externe Quellen zu finden. Zitiere Quellen als Markdown-Links.`;

type Msg = { role: "user" | "assistant"; content: string };

async function anthropic(body: Record<string, unknown>, withWebSearch = false) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": Deno.env.get("ANTHROPIC_API_KEY") ?? "",
    "anthropic-version": "2023-06-01",
  };
  if (withWebSearch) headers["anthropic-beta"] = "web-search-2025-03-05";
  const res = await fetch(ANTHROPIC_URL, { method: "POST", headers, body: JSON.stringify(body) });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic ${res.status}: ${text}`);
  }
  return await res.json();
}

function extractText(response: any): string {
  const parts = response?.content ?? [];
  return parts
    .filter((p: any) => p.type === "text")
    .map((p: any) => p.text)
    .join("\n")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    if (!Deno.env.get("ANTHROPIC_API_KEY")) {
      return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY fehlt" }), {
        status: 500,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }
    const { messages }: { messages: Msg[] } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages fehlt" }), {
        status: 400,
        headers: { ...corsHeaders, "content-type": "application/json" },
      });
    }

    const lastUser = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

    // Stufe 1: Klassifizierung
    let source: "live" | "static" = "static";
    try {
      const cls = await anthropic({
        model: CLAUDE_MODEL,
        max_tokens: 5,
        system:
          "Klassifiziere die Nutzeranfrage. Antworte NUR mit exakt einem Wort: LIVE oder STATIC. LIVE = benötigt aktuelle externe Informationen, News, Preise, Release-Notes, Web-Doku-Links, Änderungen. STATIC = allgemeine Erklärung, interne Import-Regeln, Datenschutz, wie funktioniert X.",
        messages: [{ role: "user", content: lastUser }],
      });
      const verdict = extractText(cls).toUpperCase();
      if (verdict.includes("LIVE")) source = "live";
    } catch (_) {
      // Klassifizierung schlägt fehl -> weiter mit static
    }

    // Stufe 2: Antwort
    const body: Record<string, unknown> = {
      model: CLAUDE_MODEL,
      max_tokens: 1500,
      system: source === "live" ? SYSTEM_PROMPT_LIVE : SYSTEM_PROMPT_STATIC,
      messages,
    };
    if (source === "live") {
      body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }];
    }

    const answer = await anthropic(body, source === "live");
    const text = extractText(answer);

    return new Response(JSON.stringify({ text, source }), {
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("assistant-claude error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "content-type": "application/json" },
    });
  }
});