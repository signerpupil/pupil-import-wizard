# FAQ-Wissensbasis für den PUPIL@AG Assistenten

Ziel: Sie erfassen Frage/Antwort-Paare aus dem Schulsupport selbst im Admin-Bereich – der Assistent nutzt sie sofort, ohne dass Code angepasst werden muss.

## Was entsteht

**1. Neue Tabelle `assistant_faqs` (Lovable Cloud)**
Felder: Frage, Antwort, Kategorie (z. B. Ablauf/Onboarding, Links & Zugänge, Schulungen, Migration, Sonstiges), Stichwörter (optional, für Synonyme wie "Anmeldung/Registrierung"), aktiv-Flag, Sortierung, Zeitstempel.
Lesen: alle; Bearbeiten: nur Admins.

**2. Neuer Admin-Tab „Assistent-FAQ"**
- Liste aller FAQs mit Suche und Kategoriefilter
- Anlegen / Bearbeiten / Deaktivieren / Löschen
- Antwortfeld als Markdown (Links werden im Chat als „Jetzt anmelden"-Links gerendert)
- Import-Knopf: mehrere Q&A auf einmal einfügen (CSV oder einfaches „F: … / A: …"-Textformat) – praktisch, um Ihre bestehenden Mailantworten in einem Rutsch zu übernehmen

**3. Assistent nutzt die FAQs**
Beide Assistenten-Backends laden die aktiven FAQs bei jeder Anfrage und hängen sie als Block „GEPFLEGTE FAQ (verbindlich)" an den System-Prompt an – mit der Regel: Deckt sich die Frage mit einer FAQ, gilt diese Antwort wörtlich/inhaltlich vor Live-Suche und statischem Kontext.
Der bestehende Koneksa-/Onboarding-Kontext bleibt unverändert bestehen.

**4. Badge im Chat**
Zusätzlich zu „Live-Doku" (grün) und „Onboarding" (blau) ein Badge „FAQ" (violett), wenn die Antwort aus einer gepflegten FAQ stammt – damit Sie erkennen, ob Ihre Pflege greift.

## Ablauf für Sie danach

1. Frage einer Schule kommt rein → im Admin-Tab „Assistent-FAQ" Frage + Ihre Antwort erfassen → speichern.
2. Ab der nächsten Chatnachricht antwortet der Assistent damit – kein Deploy, keine Code-Änderung.

## Technische Details

- Migration: `public.assistant_faqs` inkl. GRANTs (SELECT für anon/authenticated, volle Rechte für Admins via `has_role`), RLS aktiv, `updated_at`-Trigger.
- `supabase/functions/assistant-claude/index.ts`: FAQs per Service-Role-Client laden, in `SYSTEM_PROMPT_STATIC` anhängen; wenn eine FAQ klar passt, Klassifizierung auf „static/faq" zwingen und Websuche überspringen (spart Zeit und Kosten).
- `supabase/functions/chat/index.ts` (Widget-Proxy): FAQ-Block serverseitig an das vom Widget gesendete `system` anhängen, damit `public/pupil-assistent.html` unverändert bleibt.
- Neue Komponente `src/components/admin/AdminAssistantFaqs.tsx` + Tab in `src/pages/Admin.tsx` (bestehendes Tab-Muster wie `AdminBusinessRules`).
- Badge-Logik in `src/pages/AssistentPage.tsx` (Feld `source: "faq" | "live" | "static"` aus der Function).

## Nicht enthalten

Keine Vektorsuche/Embeddings – bei erwarteten Dutzenden bis wenigen Hundert FAQs reicht es, alle in den Prompt zu geben. Wenn die Sammlung später sehr gross wird, kann eine Vorfilterung nach Stichwörtern ergänzt werden.
