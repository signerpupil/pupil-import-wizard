import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidationError {
  row: number;
  column: string;
  value: string;
  message: string;
}

interface SuggestCorrectionsRequest {
  errors: ValidationError[];
  sampleData: Record<string, string | number | null>[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { errors, sampleData }: SuggestCorrectionsRequest = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Group errors by type for more efficient analysis
    const errorsByType: Record<string, ValidationError[]> = {};
    errors.forEach(error => {
      const key = `${error.column}:${error.message}`;
      if (!errorsByType[key]) {
        errorsByType[key] = [];
      }
      errorsByType[key].push(error);
    });

    // Build prompt for AI with ALL affected rows
    const errorSummary = Object.entries(errorsByType).map(([key, errs]) => {
      const [column, message] = key.split(':');
      const allRows = errs.map(e => e.row);
      const examples = errs.slice(0, 10).map(e => `Zeile ${e.row}: "${e.value}"`).join(', ');
      return `- ${column} (${errs.length} Fehler in Zeilen [${allRows.join(', ')}]): ${message}. Beispiele: ${examples}`;
    }).join('\n');

    const systemPrompt = `Du bist ein Datenvalidierungs-Assistent für Schweizer Schuldaten. 
Analysiere die Validierungsfehler und schlage Korrekturen vor.

Wichtige Formate:
- AHV-Nummer: 756.XXXX.XXXX.XX
- Datum: TT.MM.JJJJ (z.B. 15.01.2024)
- E-Mail: gültige E-Mail-Adresse

Antworte im JSON-Format mit einem Array von Korrekturvorschlägen.`;

    const userPrompt = `Hier sind die Validierungsfehler:

${errorSummary}

Beispiel-Daten aus der Datei:
${JSON.stringify(sampleData.slice(0, 5), null, 2)}

Analysiere die Fehler und schlage Bulk-Korrekturen vor. WICHTIG: Gib in "affectedRows" ALLE betroffenen Zeilennummern an, nicht nur Beispiele!

Antworte NUR mit einem JSON-Array im folgenden Format:
[
  {
    "type": "bulk_correction",
    "affectedColumn": "Spaltenname",
    "affectedRows": [ALLE betroffenen Zeilennummern hier],
    "pattern": "Beschreibung des erkannten Musters",
    "suggestion": "Konkrete Korrekturanweisung",
    "autoFix": true/false,
    "fixFunction": "optional: Beschreibung der automatischen Korrektur (z.B. 'Excel-Serialdatum konvertieren', 'AHV-Nummer formatieren')"
  }
]

Wenn du ein Muster erkennst (z.B. Excel-Serialdaten statt echte Daten), schlage eine automatische Korrektur vor mit autoFix: true.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Bitte versuchen Sie es später erneut." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Keine Credits verfügbar. Bitte laden Sie Ihr Konto auf." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse the JSON response
    let suggestions = [];
    try {
      // Extract JSON from the response (it might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      suggestions = [];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in suggest-corrections:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
