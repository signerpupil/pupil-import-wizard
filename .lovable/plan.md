
Der User möchte manuelle Korrekturen tracken, um Auto-Fix-Regel-Lücken zu erkennen. Strikt anonymisiert über Masken.

## Wo werden manuelle Korrekturen gemacht?

Aus Codebase-Kenntnis: Korrekturen passieren in `Step3Validation` (Inline-Edit + Modal mit `SearchableSelect`). Alle laufen am Ende durch denselben Update-Pfad in `useImportWizard` (vermutlich `applyManualCorrection` o.ä.) und werden im `ChangeLog` festgehalten.

Effizientester Hook: **dort wo der ChangeLog-Eintrag erzeugt wird** — ein zentraler Punkt, alle manuellen Korrekturen laufen darüber.

## Plan

### 1. Datenbank
Neuer Event-Typ `manual_correction` in `validate_usage_event`-Whitelist → Migration.

### 2. Sammlung im Frontend
In `src/lib/telemetryCollectors.ts` zwei neue Helper:
- `bufferManualCorrection(column, oldValue, newValue)` — sammelt Korrekturen in einem modul-internen Map (kein DB-Call pro Edit, sonst Spam).
- `flushManualCorrections()` — aggregiert das Buffer und sendet **ein** Event mit Top-Patterns pro Spalte.

**Anonymisierung pro Korrektur:**
- Whitelist (Sprache/Nationalität/PLZ): Roh-Wert → Roh-Wert (analog bestehender Logik).
- Alle anderen Spalten: `maskValue(old) → maskValue(new)`.
- Niemals Roh-Werte für Namen/AHV/Email/Telefon/etc.

**Payload-Form:**
```
{ corrections: { S_AHV: [{ from: "999 9999 9999 99", to: "999.9999.9999.99", count: 12 }, ...], ... } }
```
- Max 20 Pattern-Paare pro Spalte, sortiert nach Häufigkeit.

### 3. Trigger zum Flushen
Buffer wird gesendet:
- Beim Reset (`import_reset` in `useImportWizard`).
- Beim Wechsel zu Step 4 (Export-Schritt).
- Beim Verlassen der Seite (`beforeunload`-Listener, einmalig in `App.tsx` registriert via `navigator.sendBeacon` oder normaler insert).

### 4. Tracking-Hook
In dem zentralen Pfad, der manuelle Korrekturen anwendet (zu identifizieren in `useImportWizard.ts` / `Step3Validation.tsx` Inline-Edit + Modal-Save), `bufferManualCorrection(column, oldValue, newValue)` aufrufen — **bevor** der State aktualisiert wird, damit `oldValue` noch verfügbar ist.

Ich werde im Implementierungs-Schritt prüfen:
- `useImportWizard.ts` — nach `applyManualCorrection`/`updateCellValue`-ähnlicher Action.
- `Step3Validation.tsx` — Inline-Edit-Handler.
- `BulkCorrectionCard.tsx` — manuelle Modal-Korrekturen.

Ein einziger zentraler Aufruf reicht, falls alle drei Stellen über denselben Reducer gehen.

### 5. Admin-Dashboard
Neue Karte in `AdminMetrics.tsx`: **"Manuelle Korrekturen (Auto-Fix-Lücken)"** — pro Spalte: `Maske alt` → `Maske neu` mit Anzahl. Sortiert nach Häufigkeit. Diese Tabelle zeigt direkt: "Das nächste Auto-Fix-Pattern, das du hinzufügen solltest".

### 6. Datenschutz
Ergänzung in `DatenschutzDialog` Sektion 4a: Hinweis dass auch manuelle Korrekturen als Maske → Maske erfasst werden.

## Datenschutz

- Whitelist Roh-Werte: nur Sprache/Nationalität/PLZ (gleich wie bestehend).
- Alle anderen Spalten: ausschließlich Maske via `maskValue()`.
- Maske gekappt auf 40 Zeichen.
- Buffer wird im Browser-RAM gehalten, keine Persistenz in localStorage.
- Opt-out wirkt automatisch (sendet kein Event wenn `analytics-opt-out` gesetzt).

## Offene Punkte
1. **Flush-Frequenz**: einmal pro Session (bei Reset/Step 4/unload) — okay? Alternative: alle 30 s. Empfehlung: einmal pro Session, weniger Last.
2. **Bulk-Auto-Fix-Annahmen ebenfalls tracken?** Wenn der User "Alle X auto-fixen" klickt, ist das eine Bestätigung — würde ich **nicht** tracken (ist ja schon Auto-Fix). Nur echte manuelle Edits zählen.

Nach Bestätigung umsetzen.
