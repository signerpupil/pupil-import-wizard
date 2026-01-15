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
    const familyInconsistencyErrors: ValidationError[] = [];
    
    errors.forEach(error => {
      // Separate family inconsistency errors for special handling
      if (error.message.includes('Inkonsistente ID:')) {
        familyInconsistencyErrors.push(error);
      } else {
        const key = `${error.column}:${error.message.split(':')[0]}`;
        if (!errorsByType[key]) {
          errorsByType[key] = [];
        }
        errorsByType[key].push(error);
      }
    });

    // Build prompt for AI with ALL affected rows
    const errorSummary = Object.entries(errorsByType).map(([key, errs]) => {
      const [column, message] = key.split(':');
      const allRows = errs.map(e => e.row);
      const examples = errs.slice(0, 10).map(e => `Zeile ${e.row}: "${e.value}"`).join(', ');
      return `- ${column} (${errs.length} Fehler in Zeilen [${allRows.join(', ')}]): ${message}. Beispiele: ${examples}`;
    }).join('\n');

    // Build family inconsistency summary
    let familySummary = '';
    if (familyInconsistencyErrors.length > 0) {
      // Group by parent identifier (extract from message)
      const familyGroups: Record<string, { column: string; rows: number[]; ids: string[]; parentInfo: string }> = {};
      
      familyInconsistencyErrors.forEach(err => {
        // Extract parent info from message like "Inkonsistente ID: Erziehungsberechtigte/r 1 (AHV: 756.1234.5678.90) hat in Zeile 3 die ID '123', aber hier die ID '456'"
        const parentMatch = err.message.match(/Inkonsistente ID: (.+?) \(([^)]+)\)/);
        const rowMatch = err.message.match(/in Zeile (\d+)/);
        const idsMatch = err.message.match(/die ID '([^']+)', aber hier die ID '([^']+)'/);
        
        if (parentMatch && rowMatch && idsMatch) {
          const parentKey = `${parentMatch[1]}:${parentMatch[2]}`;
          const originalRow = parseInt(rowMatch[1]);
          const originalId = idsMatch[1];
          const currentId = idsMatch[2];
          
          if (!familyGroups[parentKey]) {
            familyGroups[parentKey] = {
              column: err.column,
              rows: [originalRow],
              ids: [originalId],
              parentInfo: `${parentMatch[1]} (${parentMatch[2]})`
            };
          }
          familyGroups[parentKey].rows.push(err.row);
          if (!familyGroups[parentKey].ids.includes(currentId)) {
            familyGroups[parentKey].ids.push(currentId);
          }
        }
      });

      familySummary = `\n\nFAMILIEN-INKONSISTENZEN (gleiche Eltern mit unterschiedlichen IDs):\n` +
        Object.entries(familyGroups).map(([key, group]) => {
          return `- ${group.parentInfo}: Spalte ${group.column}, Zeilen [${group.rows.join(', ')}] haben unterschiedliche IDs: [${group.ids.join(', ')}]`;
        }).join('\n');
    }

    const systemPrompt = `Du bist ein Datenvalidierungs-Assistent für Schweizer Schuldaten. 
Analysiere die Validierungsfehler und schlage Korrekturen vor.

Wichtige Formate:
- AHV-Nummer: 756.XXXX.XXXX.XX
- Datum: TT.MM.JJJJ (z.B. 15.01.2024)
- E-Mail: gültige E-Mail-Adresse (keine Leerzeichen)

WICHTIG: Du MUSST immer ein valides JSON-Array zurückgeben. Jedes Element MUSS folgende Felder haben:
- type: immer "bulk_correction"
- affectedColumn: String mit dem Spaltennamen
- affectedRows: Array von Zahlen (NIEMALS ein String!)
- pattern: String mit der Beschreibung des erkannten Musters
- suggestion: String mit der konkreten Korrekturanweisung
- autoFix: Boolean (true oder false)
- fixFunction: String oder null
- correctValue: (optional) String mit dem korrekten Wert für alle betroffenen Zeilen

Für FAMILIEN-INKONSISTENZEN:
- Analysiere welche ID die "richtige" ist (normalerweise die, die am häufigsten vorkommt oder die erste)
- Setze autoFix = true und correctValue auf die korrekte ID
- Erkläre im "suggestion" Feld, welche ID verwendet werden sollte und warum

Wenn du keine Fehler findest, gib ein leeres Array zurück: []`;

    const userPrompt = `Hier sind die Validierungsfehler:

${errorSummary}${familySummary}

Beispiel-Daten aus der Datei (erste 5 Zeilen):
${JSON.stringify(sampleData.slice(0, 5), null, 2)}

Analysiere die Fehler und schlage Bulk-Korrekturen vor.

KRITISCH - Beachte diese Regeln:
1. "affectedRows" MUSS ein Array von Zahlen sein, z.B. [17, 86, 88] - NIEMALS ein String!
2. Kopiere ALLE Zeilennummern aus der Fehlerliste in das affectedRows Array
3. Jeder Vorschlag MUSS alle Pflichtfelder enthalten

Für E-Mail-Fehler mit Leerzeichen: fixFunction = "Leerzeichen entfernen und Sonderzeichen normalisieren"
Für unvollständige Datumsformate (TT.MM. ohne Jahr): autoFix = false (manuell korrigieren)
Für Excel-Serialdaten (Zahlen wie 40026): fixFunction = "Excel-Serialdatum konvertieren"

Für FAMILIEN-INKONSISTENZEN:
- Schlage vor, alle Zeilen auf dieselbe ID zu setzen
- Verwende correctValue mit der richtigen ID
- Erkläre im pattern und suggestion warum diese ID gewählt wurde

Antworte NUR mit einem JSON-Array:
[
  {
    "type": "bulk_correction",
    "affectedColumn": "Spaltenname",
    "affectedRows": [1, 2, 3],
    "pattern": "Beschreibung",
    "suggestion": "Anweisung",
    "autoFix": true,
    "fixFunction": "Beschreibung oder null",
    "correctValue": "optional - korrekter Wert für alle Zeilen"
  }
]`;

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
        const parsed = JSON.parse(jsonMatch[0]);
        // Validate and clean up suggestions
        suggestions = parsed.filter((s: any) => {
          // Ensure affectedRows is a valid array of numbers
          if (!Array.isArray(s.affectedRows)) {
            console.warn("Invalid affectedRows (not an array), skipping suggestion:", s);
            return false;
          }
          // Ensure required fields exist
          if (!s.affectedColumn || typeof s.affectedColumn !== 'string') {
            console.warn("Missing or invalid affectedColumn, skipping suggestion:", s);
            return false;
          }
          return true;
        }).map((s: any) => ({
          type: s.type || "bulk_correction",
          affectedColumn: s.affectedColumn,
          // Ensure affectedRows contains only valid numbers
          affectedRows: s.affectedRows.filter((r: any) => typeof r === 'number' && !isNaN(r)),
          pattern: s.pattern || "Unbekanntes Muster",
          suggestion: s.suggestion || "Bitte manuell prüfen",
          autoFix: Boolean(s.autoFix),
          fixFunction: s.fixFunction || null,
          correctValue: s.correctValue || null
        })).filter((s: any) => s.affectedRows.length > 0);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, "Content:", content);
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
