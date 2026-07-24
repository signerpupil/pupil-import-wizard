## Ziel
Den finalen Systemprompt „PUPIL@AG Assistent" (Koneksa-Kontext, Slot 1, Anmeldelinks, Regeln) in die bestehende Edge Function `supabase/functions/assistant-claude/index.ts` einsetzen. Frontend und Chip-Fragen bleiben unverändert – nur der Prompt wird ersetzt.

## Änderungen
### `supabase/functions/assistant-claude/index.ts`
- `SYSTEM_PROMPT_STATIC` durch den vom User gelieferten Volltext ersetzen. Enthält:
  - Rolle + Regeln (Sie-Form, kurz, Onboarding-Schritte referenzieren, keine erfundenen Fakten, Prototyp-Hinweis)
  - Block „--- KONTEXT KONEKSA ---"
  - Block „--- PRODUKT KONTEXT ---"
  - Block „--- EINFÜHRUNG & SLOTS ---"
  - Block „--- ANMELDELINKS SCHULUNGEN ---" (alle 15 Teams-Links, Markdown-Anweisung „[Jetzt anmelden](URL)")
  - Block „--- ONBOARDING-PROZESS ---" (Schritte 1.0–7.0 Slot 1)
  - „WICHTIGE LINKS" (eLearning, Schulportal, Dokumentation, Release Notes)
- `SYSTEM_PROMPT_LIVE`: bleibt = `SYSTEM_PROMPT_STATIC` + Zusatz „Bei Produktfragen die Suchergebnisse von **dokumentation.pupil.ch** primär nutzen und als Quelle nennen (Info von dokumentation.pupil.ch)."
- Klassifizierungs-Prompt leicht anpassen: LIVE = Produktfrage zu PUPIL-Bedienung/Funktion/Konfiguration → nutzt Web Search auf `dokumentation.pupil.ch`; STATIC = Koneksa/Slots/Onboarding/Schulungsanmeldung.
- Optional: Web-Search-Tool auf Domain einschränken via `allowed_domains: ["dokumentation.pupil.ch", "release.pupil.ch", "pupil.ch", "schulen-aargau.ch"]`, damit die Live-Doku auch wirklich von den offiziellen Quellen kommt.

### Frontend
Keine Änderungen nötig. Die Chip-Beispielfragen kann ich optional an den neuen Kontext anpassen (z.B. „Wann ist die Infoveranstaltung Slot 1?", „Wie melde ich mich für die Trainer-Schulung Schulverwaltung an?", „Welche Tasks muss der Schulträger 4 Wochen vor Slot-Start erledigen?", „Wer gehört zu Slot 1?"). **Frage:** Chips ersetzen oder Import-Wizard-Chips beibehalten? → Standard: ersetzen, da der Assistent jetzt Koneksa/PUPIL@AG-Fokus hat.

## Deliverable
Eine Datei-Änderung an `supabase/functions/assistant-claude/index.ts` (Prompt-Konstanten + `allowed_domains`) und optional Chip-Update in `src/pages/AssistentPage.tsx`.
