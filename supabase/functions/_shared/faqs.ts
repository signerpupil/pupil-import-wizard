// Lädt die gepflegten FAQs aus der Datenbank und baut daraus einen Prompt-Block.

export type FaqRow = {
  question: string;
  answer: string;
  category: string | null;
  keywords: string[] | null;
};

export async function loadActiveFaqs(): Promise<FaqRow[]> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return [];
  try {
    const res = await fetch(
      `${url}/rest/v1/assistant_faqs?select=question,answer,category,keywords&is_active=eq.true&order=sort_order.asc,created_at.asc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) {
      console.error("faq load failed", res.status, await res.text());
      return [];
    }
    return (await res.json()) as FaqRow[];
  } catch (e) {
    console.error("faq load error", e instanceof Error ? e.message : e);
    return [];
  }
}

export function buildFaqBlock(faqs: FaqRow[]): string {
  if (!faqs.length) return "";
  const entries = faqs
    .map((f, i) => {
      const kw = f.keywords?.length ? `\nStichwörter: ${f.keywords.join(", ")}` : "";
      const cat = f.category ? ` [${f.category}]` : "";
      return `FAQ ${i + 1}${cat}\nFrage: ${f.question}${kw}\nAntwort: ${f.answer}`;
    })
    .join("\n\n");
  return `

--- GEPFLEGTE FAQ (VERBINDLICH, HÖCHSTE PRIORITÄT) ---
Diese Frage/Antwort-Paare wurden von der Projektleitung selbst erfasst. Deckt sich die Nutzerfrage inhaltlich mit einer dieser FAQs (auch bei anderer Formulierung oder passenden Stichwörtern), verwende diese Antwort inhaltlich unverändert – sie hat Vorrang vor Live-Suche und statischem Kontext. Formuliere sprachlich sauber aus, erfinde aber keine zusätzlichen Fakten und lasse keine Links weg.

${entries}
--- ENDE GEPFLEGTE FAQ ---`;
}

// Grobe Vorprüfung, ob eine FAQ zur Frage passt (Stichwort-/Wortüberlappung).
export function faqLikelyMatches(faqs: FaqRow[], question: string): boolean {
  const q = question.toLowerCase();
  const qWords = new Set(
    q
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3),
  );
  if (!qWords.size) return false;
  for (const f of faqs) {
    for (const kw of f.keywords ?? []) {
      if (kw && q.includes(kw.toLowerCase())) return true;
    }
    const fWords = (f.question ?? "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3);
    if (!fWords.length) continue;
    const hits = fWords.filter((w) => qWords.has(w)).length;
    if (hits >= 2 || (fWords.length <= 3 && hits >= 1)) return true;
  }
  return false;
}