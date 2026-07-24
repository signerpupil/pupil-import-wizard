## Ziel
Den zweistufigen Flow so umbauen, dass die Live-Doku-Suche ein **separater** Schritt ist (aktuell: `web_search` Tool läuft im selben Antwort-Call wie die finale Antwort). Ergebnis: klar getrennte Verantwortlichkeiten, Suchergebnisse landen explizit als Kontext-Block im System-Prompt von Call 2.

## Aktueller Stand (verifiziert)
`supabase/functions/assistant-claude/index.ts`:
- Stufe 1 Klassifizierung → LIVE / STATIC ✓
- Stufe 2 Antwort: bei LIVE wird `web_search_20250305` als Tool an denselben Call gehängt → Modell entscheidet selbst über Suche, Ergebnisse fliessen intern.
- Badge grün (`emerald`) / blau (`sky`) in `AssistentPage.tsx` ✓
- Markdown-Rendering via `react-markdown` ✓

## Änderungen in `supabase/functions/assistant-claude/index.ts`

Neuer Ablauf bei `source === "live"`:

1. **Call 1 – Klassifizierung** (unverändert, `max_tokens: 5`, LIVE/STATIC).
2. **Call 2 – Web-Recherche** (nur wenn LIVE):
   - Eigener Anthropic-Request mit `web_search_20250305` Tool, beschränkt auf `dokumentation.pupil.ch`, `release.pupil.ch`, `pupil.ch`, `schulen-aargau.ch`.
   - System-Prompt: „Du bist ein Recherche-Agent. Suche in der Live-Doku nach relevanten Passagen zur folgenden Frage. Antworte in strukturierten Bullet-Points mit Quelle (Markdown-Link). Keine Interpretation, nur Fundstellen."
   - User-Message: die letzte Nutzerfrage.
   - `max_tokens: 800`, `max_uses: 3`.
   - Rückgabe extrahieren → String `liveContext`.
   - Fehler/Leerergebnis → Fallback auf statischen Prompt (kein Abbruch, `source` bleibt `live` wenn Kontext ≠ leer, sonst `static`).
3. **Call 3 – Antwort generieren** (immer):
   - Kein Tool mehr angehängt.
   - System-Prompt = `SYSTEM_PROMPT_STATIC` + bei LIVE zusätzlich Block:
     ```
     --- LIVE-DOKU RECHERCHE ---
     [Suchergebnisse von dokumentation.pupil.ch für die aktuelle Frage]
     {liveContext}
     ---
     Nutze diese Fundstellen bevorzugt. Zitiere Quellen als Markdown-Links.
     ```
   - Volle `messages`-History.
   - Response-Text extrahieren.

Response-JSON unverändert: `{ text, source }` (Badge bleibt kompatibel — grün wenn Recherche etwas geliefert hat, blau sonst).

## Nicht angepasst
- Frontend `AssistentPage.tsx`: Markdown + Badge-Farben sind bereits so gefordert, keine Änderung nötig.
- Quick-Chips, Persona, Anmeldelinks bleiben.

## Test nach Deploy
1. „Wie erstelle ich dynamische Gruppen?" → sollte LIVE mit grünem Badge + Markdown-Links auf dokumentation.pupil.ch.
2. „Was ist Projekt Koneksa?" → STATIC, blauer Badge, ohne Web-Aufruf.
3. Edge-Function-Logs prüfen: bei LIVE zwei Anthropic-Calls (Recherche + Antwort) plus Klassifizierung = 3 Calls.
