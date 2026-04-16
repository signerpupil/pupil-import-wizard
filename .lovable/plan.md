
Der User möchte einen **manuellen Sende-Knopf** für die anonymisierten Telemetriedaten — als Alternative oder Ergänzung zum automatischen Tracking. So entscheidet jeder Nutzer aktiv, ob er Daten teilt.

## Designentscheidung: Opt-In-Modus statt Auto-Send

Aktuell läuft Telemetrie automatisch (Opt-out). Der Wunsch impliziert ein **stärker nutzerkontrolliertes Modell**. Ich schlage einen **Drei-Modi-Schalter** im Footer vor:

1. **Automatisch senden** (heutiges Verhalten, Opt-out via Toggle)
2. **Manuell senden** (sammelt lokal, sendet erst auf Knopfdruck)
3. **Nichts senden** (heutiger Opt-out)

Der manuelle Modus ist der neue dritte Pfad.

## So funktioniert "Manuell senden"

### Sammlung im Browser
- Alle anonymisierten Events (`unmapped_value`, `unfixed_pattern`, `manual_correction`, `validation_completed`, `export_completed` etc.) werden statt direkt gesendet **in einen lokalen Puffer in `localStorage`** geschrieben (Key: `analytics-pending-queue`).
- Maximal 200 Events / 100 KB im Puffer (älteste werden verdrängt).
- Der Puffer überlebt Tab-Schließen und Reloads.

### UI-Anzeige
- Im Footer erscheint im manuellen Modus zusätzlich ein Badge: **"X anonyme Ereignisse bereit zum Senden"** mit zwei Buttons:
  - **"Vorschau anzeigen"** → Dialog mit lesbarem JSON aller gepufferten Events (volle Transparenz, der User sieht GENAU was übermittelt wird).
  - **"Jetzt senden"** → schickt alle Events als Batch an Supabase, leert Puffer, zeigt Toast.
  - **"Verwerfen"** → leert Puffer ohne zu senden.

### Vorschau-Dialog
- Listet alle gepufferten Events strukturiert auf (Event-Typ, Zeitpunkt, Payload formatiert).
- Hinweis-Banner oben: "Diese Daten enthalten ausschliesslich anonymisierte Maskenzeichen und Häufigkeitszähler — keine Personendaten."
- Optional: Einzel-Event löschen ("Diesen Eintrag entfernen").

## Implementation

### 1. Neuer Modus-State (`src/lib/analytics.ts`)
- Erweitere `localStorage` um Key `analytics-mode` mit Werten `auto` | `manual` | `off`.
- Ersetze `isOptedOut()` durch `getAnalyticsMode()`. Bestehende `analytics-opt-out=1` wird zu `off` migriert (Backward-Compat).
- `trackEvent()` verzweigt:
  - `off` → noop
  - `auto` → direktes Insert (heute)
  - `manual` → in Puffer schreiben (`enqueuePendingEvent`)

### 2. Lokaler Puffer (`src/lib/pendingTelemetry.ts` — neu)
- `enqueuePendingEvent(event)` — schreibt in localStorage mit Cap.
- `getPendingEvents()` — liest alle.
- `clearPendingEvents()` — leert.
- `removePendingEvent(id)` — einzeln löschen.
- `flushPendingToSupabase()` — Batch-Insert via `supabase.from('usage_events').insert(rows)`, leert bei Erfolg.
- Custom-Event `analytics-queue-changed` für UI-Updates.

### 3. Footer-Erweiterung (`src/components/layout/Footer.tsx`)
- `Switch` → `RadioGroup` oder `Select` mit drei Optionen.
- Wenn Modus = `manual` und Puffer > 0: zusätzliche Zeile mit Counter-Badge + Buttons "Vorschau" / "Senden" / "Verwerfen".

### 4. Vorschau-Dialog (`src/components/analytics/PendingTelemetryDialog.tsx` — neu)
- Standard `Dialog` mit ScrollArea.
- Pro Event: Card mit Event-Typ, Zeitstempel, formatiertem JSON-Payload (read-only).
- Footer-Buttons: "Alle senden", "Alle verwerfen", "Schliessen".

### 5. Datenschutz-Update (`DatenschutzDialog.tsx`)
- Sektion 4a ergänzen: "Sie können wählen zwischen automatischem Senden, manuellem Senden (mit Vorschau) oder vollständig deaktiviert."

### 6. Memory-Update
- `mem://features/usage-telemetry.md` um den neuen Modus + Puffer-Mechanismus erweitern.

## Datenschutz / Sicherheit

- Puffer-Inhalte sind **bereits anonymisiert** (gleiche Regeln wie heute: Roh-Werte nur für Sprache/Nationalität/PLZ, sonst Maske).
- Im manuellen Modus liegen Maskenzeichen kurzzeitig in `localStorage` — KEIN Personenbezug, da die Anonymisierung **vor** dem Puffern passiert.
- Vorschau zeigt 1:1 was gesendet wird → maximale Transparenz.
- Beim Wechsel zu `off` wird der Puffer automatisch geleert.

## Datenbank
**Keine Änderungen nötig.** Bestehende `usage_events`-Tabelle und Insert-Policy reichen — der Batch-Insert nutzt denselben Pfad.

## Offene Punkte

1. **Default-Modus für neue Nutzer**: weiterhin `auto` (wie heute) oder neuer Default `manual`? Empfehlung: `auto` beibehalten, damit bestehende Telemetrie nicht abreisst. Aber im Datenschutz-Dialog prominent auf den manuellen Modus hinweisen.
2. **Wo genau im UI**: Footer-Erweiterung okay, oder lieber separater Knopf neben "Hilfe & FAQ"? Empfehlung: im Footer, da dort schon der Toggle sitzt.
3. **Vorschau-Detailgrad**: Volles JSON oder nur Zusammenfassung (z.B. "12 unmapped languages, 5 manual corrections")? Empfehlung: beides — Zusammenfassung oben, ausklappbares Detail-JSON darunter.

Nach Bestätigung dieser drei Punkte (oder Freigabe wie vorgeschlagen) setze ich um.
