

# Geschwister-Inkonsistenz Auflösung — Implementierungsplan

## Ausgangslage

Geschwister-Inkonsistenzen (S_PLZ, S_Ort) werden als `type: 'business'`, `severity: 'warning'` Fehler erzeugt. Es fehlt eine dedizierte UI zur Auflösung -- aktuell landen sie in der allgemeinen Fehlertabelle.

## Umsetzung

### 1. Neue Komponente: `SiblingInconsistencyCard.tsx`

Eigenständige Karte (analog zu `IdConflictBatchCard`), die:
- Geschwister-Inkonsistenz-Warnungen aus `errors` filtert (Message enthält `Geschwister-Inkonsistenz`)
- Nach `parentId` gruppiert (aus Message extrahiert: `P_ERZ1_ID="..."` oder `P_ERZ2_ID="..."`)
- Pro Familie eine Karte zeigt mit:
  - Familienname (aus `S_Name` des ersten Kindes)
  - Pro inkonsistentem Feld (S_PLZ, S_Ort): **RadioGroup** mit allen Werten, Anzahl Kinder pro Wert, und Kindernamen
  - **PLZ↔Ort-Kopplung**: Wenn PLZ gewählt wird, `getOrteForPlz()` aufrufen und den Ort automatisch vorschlagen (wenn S_Ort ebenfalls inkonsistent ist)
  - Buttons: "Mehrheitswert übernehmen" (setzt häufigsten Wert) und "Auswahl anwenden" (setzt gewählten RadioGroup-Wert)
- Erledigte Gruppen verschwinden automatisch (Errors werden via `onBulkCorrect` als korrigiert markiert)
- "Alle Mehrheitswerte übernehmen" Batch-Button im Header

### 2. Integration in `Step3Validation.tsx`

- Import der neuen Komponente
- Platzierung nach dem `IdConflictBatchCard`-Block (Zeile ~1231)
- Props: `errors`, `rows`, `onBulkCorrect`
- Keine zusätzliche State-Logik nötig in Step3 — die Komponente verwaltet ihren eigenen UI-State (welche RadioGroup-Werte gewählt sind, Paginierung)

### 3. Gruppenlogik (innerhalb der Komponente)

```text
errors mit "Geschwister-Inkonsistenz"
→ Parse parentId + idField aus Message
→ Gruppiere nach parentId
→ Pro Gruppe: sammle betroffene Felder + Werte aus rows[]
→ Bestimme Mehrheitswert pro Feld
→ Bei Auswahl: onBulkCorrect() für alle abweichenden Zeilen
```

Wichtig: Wie bei der neuen `analyzeIdConflicts`-Logik werden die **aktuellen Zeilendaten** aus `rows` gelesen (nicht die Error-Werte), damit bereits korrigierte Zeilen sofort verschwinden.

### 4. PLZ↔Ort-Kopplung

- Nutzt `getOrteForPlz()` aus `swissPlzData.ts`
- Wenn eine PLZ gewählt wird und der dazugehörige Ort eindeutig ist (1 Eintrag in der DB), wird der Ort-RadioButton automatisch vorausgewählt
- Wenn mehrere Orte möglich sind, werden diese als Optionen angezeigt

### Betroffene Dateien

- **Neu**: `src/components/import/SiblingInconsistencyCard.tsx`
- **Edit**: `src/components/import/Step3Validation.tsx` (Import + Einbindung, ~5 Zeilen)

