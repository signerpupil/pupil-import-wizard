import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schemas
const ValidationErrorSchema = z.object({
  row: z.number().int().positive().max(100000),
  column: z.string().max(100),
  value: z.string().max(1000),
  message: z.string().max(500),
});

const RequestSchema = z.object({
  errors: z.array(ValidationErrorSchema).max(1000),
  sampleData: z.array(z.record(z.unknown())).max(100),
});

// Maximum request size: 1MB
const MAX_REQUEST_SIZE = 1048576;

// Sanitize string for AI prompt (prevent prompt injection)
function sanitizeForPrompt(str: string, maxLength: number = 200): string {
  return str
    .substring(0, maxLength)
    .replace(/[<>{}[\]]/g, '') // Remove potential injection characters
    .trim();
}

// Business rule type to prompt mapping
function buildRulePrompt(rule: {
  name: string;
  rule_type: string;
  configuration: Record<string, unknown>;
  error_message: string;
  description: string | null;
}): string {
  const config = rule.configuration;
  
  switch (rule.rule_type) {
    case 'age_validation':
      return `- ${rule.name}: Prüfe ob das Alter (aus Spalte "${config.dateColumn}") zwischen ${config.minAge} und ${config.maxAge} Jahren liegt. Fehlermeldung: "${rule.error_message}"`;
    
    case 'family_relation':
      return `- ${rule.name}: Prüfe den Altersunterschied zwischen Kind (Spalte "${config.childDateColumn}") und Eltern (Spalte "${config.parentDateColumn}"). Mindestabstand: ${config.parentAgeGap} Jahre. Fehlermeldung: "${rule.error_message}"`;
    
    case 'date_range':
      return `- ${rule.name}: Prüfe ob "${config.startColumn}" vor "${config.endColumn}" liegt. Fehlermeldung: "${rule.error_message}"`;
    
    case 'unique_constraint':
      const columns = Array.isArray(config.columns) ? config.columns.join(', ') : config.columns;
      return `- ${rule.name}: Prüfe ob die Spalte(n) [${columns}] eindeutige Werte haben. Fehlermeldung: "${rule.error_message}"`;
    
    case 'family_consistency':
      return `- ${rule.name}: Prüfe ob alle Familienmitglieder (identifiziert durch "${config.ahvColumn}" oder Namen in [${(config.nameColumns as string[])?.join(', ')}]) die gleiche "${config.idColumn}" haben. Fehlermeldung: "${rule.error_message}"`;
    
    case 'name_change_detection':
      return `- ${rule.name}: Erkenne Personen mit gleicher "${config.ahvColumn}" aber unterschiedlichen Namen in [${(config.nameColumns as string[])?.join(', ')}]. Bei Namenswechsel: autoFix = false, manuelle Prüfung erforderlich. Mögliche Gründe: Heirat, Scheidung, Adoption. Fehlermeldung: "${rule.error_message}"`;
    
    case 'required_field':
      const requiredColumns = Array.isArray(config.columns) ? config.columns.join(', ') : config.columns;
      return `- ${rule.name}: Prüfe ob die Pflichtfelder [${requiredColumns}] ausgefüllt sind. Fehlermeldung: "${rule.error_message}"`;
    
    case 'conditional_required':
      return `- ${rule.name}: Wenn "${config.conditionColumn}" den Wert "${config.conditionValue}" hat, muss "${config.requiredColumn}" ausgefüllt sein. Fehlermeldung: "${rule.error_message}"`;
    
    case 'cross_field_validation':
      return `- ${rule.name}: ${rule.description || 'Feldübergreifende Validierung'}. Fehlermeldung: "${rule.error_message}"`;
    
    default:
      return `- ${rule.name}: ${rule.description || rule.error_message}`;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Check request size limit
    const contentLength = req.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return new Response(
        JSON.stringify({ error: 'Anfrage zu gross. Bitte reduzieren Sie die Datenmenge.' }),
        { status: 413, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate JSON
    let rawBody;
    try {
      rawBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Ungültiges JSON-Format.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input with Zod
    let validatedData;
    try {
      validatedData = RequestSchema.parse(rawBody);
    } catch (validationError) {
      console.error("Input validation failed:", validationError);
      return new Response(
        JSON.stringify({ error: 'Ungültiges Anfrage-Format.' }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { errors, sampleData } = validatedData;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: 'Service vorübergehend nicht verfügbar.' }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch all definitions from database
    let databaseDefinitionsPrompt = '';
    if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Fetch column definitions
        const { data: columnDefinitions, error: colError } = await supabase
          .from('column_definitions')
          .select('name, display_name, data_type, is_required, description')
          .order('sort_order');
        
        if (colError) {
          console.error("Error fetching column definitions:", colError);
        } else if (columnDefinitions && columnDefinitions.length > 0) {
          const columnDescriptions = columnDefinitions.map(col => {
            const required = col.is_required ? '(Pflichtfeld)' : '(Optional)';
            const desc = col.description ? ` - ${col.description}` : '';
            return `- ${col.name} (${col.display_name}): Typ ${col.data_type} ${required}${desc}`;
          }).join('\n');
          databaseDefinitionsPrompt += `\nSPALTEN-DEFINITIONEN (aus der Datenbank):\nDiese Spalten sind im System definiert:\n${columnDescriptions}\n`;
        }
        
        // Fetch format rules
        const { data: formatRules, error: formatError } = await supabase
          .from('format_rules')
          .select('name, pattern, error_message, applies_to_columns, description')
          .eq('is_active', true)
          .order('sort_order');
        
        if (formatError) {
          console.error("Error fetching format rules:", formatError);
        } else if (formatRules && formatRules.length > 0) {
          const formatDescriptions = formatRules.map(rule => {
            const columns = rule.applies_to_columns?.length > 0 
              ? `Gilt für: [${rule.applies_to_columns.join(', ')}]` 
              : 'Gilt für alle Spalten';
            const desc = rule.description ? ` (${rule.description})` : '';
            return `- ${rule.name}: Pattern "${rule.pattern}"${desc}. ${columns}. Fehler: "${rule.error_message}"`;
          }).join('\n');
          databaseDefinitionsPrompt += `\nFORMAT-REGELN (aus der Datenbank):\nDiese Format-Validierungen sind aktiv:\n${formatDescriptions}\n`;
        }
        
        // Fetch business rules
        const { data: businessRules, error: rulesError } = await supabase
          .from('business_rules')
          .select('name, rule_type, configuration, error_message, description')
          .eq('is_active', true)
          .order('sort_order');
        
        if (rulesError) {
          console.error("Error fetching business rules:", rulesError);
        } else if (businessRules && businessRules.length > 0) {
          const ruleDescriptions = businessRules.map(rule => buildRulePrompt(rule)).join('\n');
          databaseDefinitionsPrompt += `\nGESCHÄFTSREGELN (aus der Datenbank):\nDiese Regeln sind aktiv und sollten bei der Analyse berücksichtigt werden:\n${ruleDescriptions}\n`;
        }
        
        // Fetch AI settings for additional context
        const { data: aiSettings, error: aiError } = await supabase
          .from('ai_settings')
          .select('key, value')
          .in('key', ['custom_prompt', 'additional_instructions']);
        
        if (!aiError && aiSettings) {
          const customPrompt = aiSettings.find(s => s.key === 'custom_prompt');
          const additionalInstructions = aiSettings.find(s => s.key === 'additional_instructions');
          
          if (customPrompt?.value) {
            databaseDefinitionsPrompt += `\nZUSÄTZLICHER KONTEXT:\n${sanitizeForPrompt(customPrompt.value, 1000)}\n`;
          }
          if (additionalInstructions?.value) {
            databaseDefinitionsPrompt += `\nWEITERE ANWEISUNGEN:\n${sanitizeForPrompt(additionalInstructions.value, 1000)}\n`;
          }
        }
      } catch (dbError) {
        console.error("Database error:", dbError);
        // Continue without database definitions - they're optional
      }
    }

    // Group errors by type for more efficient analysis
    const errorsByType: Record<string, z.infer<typeof ValidationErrorSchema>[]> = {};
    const familyInconsistencyErrors: z.infer<typeof ValidationErrorSchema>[] = [];
    
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

    // Build prompt for AI with ALL affected rows (sanitized)
    const errorSummary = Object.entries(errorsByType).map(([key, errs]) => {
      const [column, message] = key.split(':');
      const allRows = errs.map(e => e.row);
      const examples = errs.slice(0, 10).map(e => `Zeile ${e.row}: "${sanitizeForPrompt(e.value, 100)}"`).join(', ');
      return `- ${sanitizeForPrompt(column, 50)} (${errs.length} Fehler in Zeilen [${allRows.slice(0, 100).join(', ')}${allRows.length > 100 ? '...' : ''}]): ${sanitizeForPrompt(message, 100)}. Beispiele: ${examples}`;
    }).join('\n');

    // Build parent ID inconsistency summary (Eltern-ID Konsistenzprüfung)
    let parentIdSummary = '';
    if (familyInconsistencyErrors.length > 0) {
      // Group by parent identifier (extract from message)
      const parentGroups: Record<string, { column: string; rows: number[]; ids: string[]; parentInfo: string }> = {};
      
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
          
          if (!parentGroups[parentKey]) {
            parentGroups[parentKey] = {
              column: err.column,
              rows: [originalRow],
              ids: [originalId],
              parentInfo: sanitizeForPrompt(`${parentMatch[1]} (${parentMatch[2]})`, 100)
            };
          }
          parentGroups[parentKey].rows.push(err.row);
          if (!parentGroups[parentKey].ids.includes(currentId)) {
            parentGroups[parentKey].ids.push(currentId);
          }
        }
      });

      parentIdSummary = `\n\nELTERN-ID INKONSISTENZEN (gleiche Erziehungsberechtigte mit unterschiedlichen IDs):\n` +
        Object.entries(parentGroups).map(([key, group]) => {
          return `- ${group.parentInfo}: Spalte ${sanitizeForPrompt(group.column, 50)}, Zeilen [${group.rows.slice(0, 50).join(', ')}${group.rows.length > 50 ? '...' : ''}] haben unterschiedliche IDs: [${group.ids.slice(0, 10).join(', ')}]`;
        }).join('\n');
    }

    const systemPrompt = `Du bist ein Datenvalidierungs-Assistent für Schweizer Schuldaten. 
Analysiere die Validierungsfehler und schlage Korrekturen vor.

SPRACHREGELN (WICHTIG):
- Antworte IMMER in Schweizer Hochdeutsch (de_CH)
- Verwende NIEMALS das Eszett (ß) - schreibe stattdessen immer "ss" (z.B. "gross" statt "groß", "Strasse" statt "Straße")
- Alle Texte in "pattern" und "suggestion" müssen diese Regel befolgen

Wichtige Formate:
- AHV-Nummer: 756.XXXX.XXXX.XX
- Datum: TT.MM.JJJJ (z.B. 15.01.2024)
- E-Mail: gültige E-Mail-Adresse (keine Leerzeichen)
${databaseDefinitionsPrompt}
NAMENSWECHSEL-ERKENNUNG (WICHTIG):
Erkenne Situationen, in denen dieselbe Person mit unterschiedlichen Namen erscheint:
- Gleiche AHV-Nummer aber unterschiedliche Namen → Person hat Namen gewechselt (Heirat, Scheidung, Adoption)
- Gleiche ID aber unterschiedliche Namen → Tippfehler oder Namenswechsel
- Bei Familien: Kinder können anderen Nachnamen haben als Eltern (z.B. bei Scheidung/Wiederheirat)
- Doppelnamen (z.B. "Müller-Schmidt") können unterschiedlich geschrieben sein

Bei erkanntem Namenswechsel:
- Weise darauf hin, dass es sich um einen möglichen Namenswechsel handelt
- Setze autoFix = false (manuelle Prüfung erforderlich)
- Erkläre im "suggestion" Feld die möglichen Gründe (Heirat, Scheidung, etc.)
- Falls die AHV übereinstimmt, ist es sehr wahrscheinlich dieselbe Person

WICHTIG: Du MUSST immer ein valides JSON-Array zurückgeben. Jedes Element MUSS folgende Felder haben:
- type: immer "bulk_correction"
- affectedColumn: String mit dem Spaltennamen
- affectedRows: Array von Zahlen (NIEMALS ein String!)
- pattern: String mit der Beschreibung des erkannten Musters
- suggestion: String mit der konkreten Korrekturanweisung
- autoFix: Boolean (true oder false)
- fixFunction: String oder null
- correctValue: (optional) String mit dem korrekten Wert für alle betroffenen Zeilen
- nameChangeDetected: (optional) Boolean - true wenn ein Namenswechsel erkannt wurde

Für ELTERN-ID INKONSISTENZEN:
- Analysiere welche ID die "richtige" ist (normalerweise die, die am häufigsten vorkommt oder die erste)
- Setze autoFix = true und correctValue auf die korrekte ID
- Erkläre im "suggestion" Feld, welche ID verwendet werden sollte und warum
- Prüfe auch ob ein Namenswechsel der Grund für die Inkonsistenz sein könnte

Wenn du keine Fehler findest, gib ein leeres Array zurück: []`;

    // Sanitize sample data for prompt
    const sanitizedSampleData = sampleData.slice(0, 5).map(row => {
      const sanitizedRow: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        const sanitizedKey = sanitizeForPrompt(String(key), 50);
        sanitizedRow[sanitizedKey] = typeof value === 'string' 
          ? sanitizeForPrompt(value, 100) 
          : value;
      }
      return sanitizedRow;
    });

    const userPrompt = `Hier sind die Validierungsfehler:

${errorSummary}${parentIdSummary}

Beispiel-Daten aus der Datei (erste 5 Zeilen):
${JSON.stringify(sanitizedSampleData, null, 2)}

Analysiere die Fehler und schlage Bulk-Korrekturen vor.

KRITISCH - Beachte diese Regeln:
1. "affectedRows" MUSS ein Array von Zahlen sein, z.B. [17, 86, 88] - NIEMALS ein String!
2. Kopiere ALLE Zeilennummern aus der Fehlerliste in das affectedRows Array
3. Jeder Vorschlag MUSS alle Pflichtfelder enthalten

Für E-Mail-Fehler mit Leerzeichen: fixFunction = "Leerzeichen entfernen und Sonderzeichen normalisieren"
Für unvollständige Datumsformate (TT.MM. ohne Jahr): autoFix = false (manuell korrigieren)
Für Excel-Serialdaten (Zahlen wie 40026): fixFunction = "Excel-Serialdatum konvertieren"

Für ELTERN-ID INKONSISTENZEN:
- Schlage vor, alle Zeilen auf dieselbe Eltern-ID zu setzen
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
        return new Response(JSON.stringify({ error: "Rate limit erreicht. Bitte versuchen Sie es später erneut." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Service vorübergehend nicht verfügbar." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
        suggestions = parsed.filter((s: Record<string, unknown>) => {
          // Ensure affectedRows is a valid array of numbers
          if (!Array.isArray(s.affectedRows)) {
            console.warn("Invalid affectedRows (not an array), skipping suggestion");
            return false;
          }
          // Ensure required fields exist
          if (!s.affectedColumn || typeof s.affectedColumn !== 'string') {
            console.warn("Missing or invalid affectedColumn, skipping suggestion");
            return false;
          }
          return true;
        }).map((s: Record<string, unknown>) => ({
          type: s.type || "bulk_correction",
          affectedColumn: String(s.affectedColumn),
          // Ensure affectedRows contains only valid numbers
          affectedRows: (s.affectedRows as unknown[]).filter((r: unknown) => typeof r === 'number' && !isNaN(r as number)),
          pattern: String(s.pattern || "Unbekanntes Muster"),
          suggestion: String(s.suggestion || "Bitte manuell prüfen"),
          autoFix: Boolean(s.autoFix),
          fixFunction: s.fixFunction ? String(s.fixFunction) : null,
          correctValue: s.correctValue ? String(s.correctValue) : null
        })).filter((s: { affectedRows: number[] }) => s.affectedRows.length > 0);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      suggestions = [];
    }

    return new Response(JSON.stringify({ suggestions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    // Log detailed error server-side only
    const errorId = crypto.randomUUID();
    console.error(`Error ${errorId} in suggest-corrections:`, error);
    
    // Return generic message to client
    return new Response(
      JSON.stringify({ 
        error: 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.',
        errorId: errorId
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
