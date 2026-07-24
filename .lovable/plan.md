## Ziel
Neue Route `/assistent` mit vollwertigem Claude-basiertem Chat-Assistenten (PUPIL-Branding, Live-Websuche, Markdown, Quell-Badges). Der bestehende schwebende Assistent bleibt parallel bestehen.

## Voraussetzungen
- Secret `ANTHROPIC_API_KEY` wird über `add_secret` angefordert (eigener Anthropic-Key).
- Weiterer Systemprompt/Chips-Text folgt vom User – daher zunächst mit sinnvollen Defaults + zentraler Konstante bauen, sodass Anpassung mit einem File-Edit erledigt ist.

## Backend – neue Edge Function `assistant-claude`
Datei: `supabase/functions/assistant-claude/index.ts`
- CORS-Preflight.
- Erwartet `{ messages: {role, content}[] }`.
- **Stufe 1 – Klassifizierung**: Call an Claude (`claude-sonnet-4-5-20250929`, max_tokens 20) mit Prompt „Antworte NUR mit LIVE oder STATIC. LIVE wenn aktuelle/externe Infos, Preise, News, Doku-Links, Änderungen nötig sind."
- **Stufe 2 – Antwort**:
  - Wenn LIVE → Claude-Call mit `tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 3 }]` und `betas: ["web-search-2025-03-05"]` (Header `anthropic-beta`).
  - Wenn STATIC → normaler Call, Kontext = eingebauter Onboarding-/Koneksa-Systemprompt.
- Response JSON: `{ text, source: "live" | "static" }`. Kein Streaming (Web-Search-Tool + Zwei-Stufen macht Streaming komplex; Antworten sind kurz).
- Modell-ID `claude-sonnet-4-5` (User schrieb „claude-sonnet-4-6" – aktuell existiert keine 4-6; ich verwende Sonnet 4.5 als aktuellste Sonnet-Version und dokumentiere das im Code-Kommentar. User kann ID einfach ersetzen).

## Frontend
### Neue Seite `src/pages/AssistentPage.tsx` mit Route `/assistent`
Layout gemäß Branding:
- Hintergrund `#f4f7fb`, Cards weiß mit `rounded-2xl` und Schatten.
- Header-Card: Logo (PNG-URL) links, Titel „PUPIL Assistent" + Untertitel.
- Datenschutzhinweis-Card (dismissible via localStorage-Key `pupil-assistent-privacy-ok`).
- Chip-Row mit 4 Beispielfragen (Defaults, später leicht ersetzbar):
  1. „Wie importiere ich Stammdaten SuS und EZB?"
  2. „Welche Sprachen werden auf BISTA gemappt?"
  3. „Was bedeutet der Fehler ‚Ungültige AHV'?"
  4. „Wo finde ich die Regelübersicht?"
- Chat-Verlauf: User-Bubbles rechts (Primärfarbe `#2b80c0`, weiße Schrift), Assistant-Bubbles links (weiß, dunkler Text).
- Antwort-Rendering mit **react-markdown** (fett, kursiv, klickbare Links `target="_blank" rel="noreferrer"`).
- **Quell-Badge** unter jeder Assistant-Nachricht: grün (`bg-emerald-100 text-emerald-800`) „Live-Doku" bei `source:"live"`, blau (`bg-sky-100 text-sky-800`) „Onboarding/Koneksa" bei `source:"static"`.
- Eingabefeld unten mit Send-Button (Primärfarbe), Enter = senden, Shift+Enter = Zeilenumbruch.
- Loading-State „denkt nach…" während Fetch.
- Fehlermeldung als rote Card bei API-Fehler (429/402/500).

### Routing
- `src/App.tsx`: neue Route `<Route path="/assistent" element={<AssistentPage />} />` innerhalb der bestehenden Router-Struktur.
- Kein neuer Nav-Eintrag im Footer (User hat nicht angefragt; Zugang via direkter URL bzw. wir können später verlinken).

## Dependencies
- `react-markdown` installieren (falls nicht vorhanden – prüfen).

## Deliverables
1. `supabase/functions/assistant-claude/index.ts` (neue Edge Function, Zwei-Stufen-Logik + Web Search Tool)
2. `src/pages/AssistentPage.tsx` (neue Seite)
3. Route-Ergänzung in `src/App.tsx`
4. Ggf. `bun add react-markdown`
5. Anfrage von Secret `ANTHROPIC_API_KEY` via `add_secret`

## Offene Punkte, die nach Erhalt der User-Details ersetzt werden
- Exakter Systemprompt (Onboarding/Koneksa-Kontext) → als Konstante `SYSTEM_PROMPT_STATIC` in der Edge Function, ein-File-Edit.
- Exakte Chip-Beispielfragen → Array `QUICK_CHIPS` in `AssistentPage.tsx`.
- Falls User definitives Modell `claude-sonnet-4-6` nachliefert → Konstante `CLAUDE_MODEL` ersetzen.
