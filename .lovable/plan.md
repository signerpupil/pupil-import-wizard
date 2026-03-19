

# Re-Validierung nach Korrekturen

## Problem

Fehler werden **einmalig** beim Eintritt in Schritt 3 berechnet (`validateData()` in `Index.tsx`, Zeile 181). Danach werden nur `correctedValue`-Marker gesetzt und `rows` aktualisiert — aber **keine neue Validierung** durchgeführt. Wenn eine automatische Korrektur (z.B. ID-Konflikt-Auflösung mit `_D01`-Suffix) einen **neuen** Fehler erzeugt (z.B. `_D01` kollidiert mit einer existierenden ID), wird dieser nicht erkannt.

## Lösung: Re-Validierung nach Bulk-Korrekturen

Nach jeder `handleBulkCorrect`-Ausführung wird eine **inkrementelle Re-Validierung** auf den aktualisierten `correctedRows` durchgeführt. Neue Fehler werden zur `errors`-Liste hinzugefügt, und bereits gelöste Fehler werden entfernt.

### Änderungen

**`src/pages/Index.tsx`**:

1. **Neue Funktion `revalidateAfterCorrection`**: Wird nach `handleBulkCorrect` und `handleErrorCorrect` aufgerufen, sobald `correctedRows` aktualisiert wurden.
   - Ruft `validateData(updatedRows, columnDefinitions)` erneut auf
   - Vergleicht neue Fehler mit bestehenden Fehlern:
     - **Bereits korrigierte Fehler** (`correctedValue !== undefined`) bleiben erhalten
     - **Neue Fehler** (die in der alten Liste nicht existierten) werden hinzugefügt
     - **Stale Fehler** (die nicht mehr auftreten) werden entfernt
   - Wird via `useEffect` getriggert, das auf Änderungen von `correctedRows` reagiert (mit Debounce, um nicht bei jeder Einzeländerung zu feuern)

2. **Merge-Logik**:
   ```text
   revalidate(newRows):
     freshErrors = validateData(newRows, columnDefinitions)
     mergedErrors = []
     
     // Behalte korrigierte Fehler
     for each old error with correctedValue:
       mergedErrors.push(old error)
     
     // Füge neue/aktuelle Fehler hinzu
     for each fresh error:
       existingCorrected = find in old errors where correctedValue set
       if existingCorrected: skip (already handled)
       existingUncorrected = find in old errors (same row+column+type)
       if existingUncorrected: keep old (preserves UI state)
       else: add as new error
     
     setErrors(mergedErrors)
   ```

3. **Debounce**: Re-Validierung wird mit 300ms Verzögerung nach der letzten Korrektur ausgeführt, damit Batch-Korrekturen (die viele Zeilen ändern) nur eine Re-Validierung auslösen.

### Vorteile gegenüber Alternativen

- **Keine separate "Nochmal prüfen"-Taste nötig** — geschieht automatisch
- **Bestehende Korrekturen bleiben erhalten** — nur wirklich neue Fehler erscheinen
- **`isErrorStillValid`-Filter bleibt als schnelle Zwischenlösung** — Re-Validierung ergänzt ihn für den Fall, dass neue Fehler entstehen
- **Performance**: `validateData` ist schnell (< 100ms für typische Datensätze), Debounce verhindert Mehrfachausführung

### Betroffene Dateien

- **`src/pages/Index.tsx`**: `useEffect` mit Debounce nach `correctedRows`-Änderungen, Merge-Logik für Fehler

