
## Ziel
Ein schwebender Chat-Button unten rechts auf allen Seiten, der einen Hilfe-Assistenten öffnet – nur für allgemeine Bedienungsfragen, keine Importdaten.

## Vorgehen

### 1. Backend über Lovable Cloud (Supabase Edge Function)
- Neue Edge Function `supabase/functions/assistant-chat/index.ts`.
- Ruft Lovable AI Gateway mit `anthropic/claude-*` (bzw. `google/gemini-3.6-flash` als Default) auf – kein Anthropic-API-Key nötig, `LOVABLE_API_KEY` wird automatisch verwendet.
- Streaming via `streamText` → `toUIMessageStreamResponse`.
- System-Prompt: Aus dem HTML-Code des Claude-Assistenten übernommen (bitte senden). Zusatzhinweis: „Antworte nur zu Bedienungsfragen des PUPIL Import Wizard, keine Importdaten verarbeiten."

### 2. Frontend: Floating Chat Widget
- Neue Komponente `src/components/assistant/FloatingAssistant.tsx`:
  - Runder Button unten rechts (fixed), Teal/Cyan-Style passend zum Design-System.
  - Klick öffnet Popover/Sheet mit Chat-UI (AI Elements: Conversation, Message, PromptInput).
  - `useChat` von `@ai-sdk/react`, Transport zeigt auf die Edge Function.
- In `src/App.tsx` global neben `<Routes>` einbinden, damit auf allen Seiten sichtbar.

### 3. Datenschutz-Hinweis
- Beim ersten Öffnen kurzer Disclaimer: „Dieser Assistent nutzt einen externen KI-Dienst. Bitte keine Personendaten aus Importdateien eingeben."
- Ergänzung in `DatenschutzDialog.tsx` und im Admin-Bereich (`AdminAISettings.tsx`), dass dieser optionale Hilfe-Assistent extern läuft (Abgrenzung zur lokalen Datenverarbeitung).

### 4. Ein-/Ausschaltbar
- Neue Setting im Footer/Admin: Assistent aktivieren/deaktivieren (localStorage), Default: aktiviert.

## Offene Punkte
Bitte den **HTML-Code des Claude-Assistenten** senden, damit ich:
- den System-Prompt / die Persona übernehmen kann,
- prüfen kann, ob spezielle Tools/Funktionsaufrufe enthalten sind,
- ggf. ein bestimmtes Claude-Modell (Sonnet/Haiku/Opus) wählen kann.

## Technische Details
- Modell: `google/gemini-3.6-flash` (Default, kostengünstig) – bei Bedarf auf `anthropic/claude-*` umstellbar über Lovable AI Gateway.
- Kosten: pro Anfrage aus Workspace-Credits.
- Keine neuen npm-Packages nötig (`ai`, `@ai-sdk/react` bereits verfügbar bzw. wird via Edge Function `npm:` importiert).
- Chat-Verlauf: nur in-memory pro Session, keine Persistierung.
