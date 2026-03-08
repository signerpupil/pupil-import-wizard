

## Analyse: Multi-Schulträger-Unterstützung bei "Weitere Datenaufbereitung"

### Ist-Zustand

Der aktuelle Stammdaten-Import unterstützt nur **eine einzelne Datei** pro Durchgang. Für Schulträger mit Primar + Oberstufe (gleiche Familien, verschiedene Daten) gibt es folgende Einschränkungen:

1. **Step1 (Datei-Upload)**: Nur 1 Datei → Benutzer muss Primar und Oberstufe separat verarbeiten
2. **Korrektur-Regeln**: Basieren auf `column` + `originalValue` (exact match) → funktionieren bereits Schulträger-übergreifend, sofern die gleichen Fehlermuster vorkommen
3. **Eltern-ID-Konsolidierung**: Funktioniert nur innerhalb einer Datei → kann keine Cross-File-Inkonsistenzen erkennen (z.B. selbe Familie, verschiedene ERZ-IDs in Primar vs. Oberstufe)
4. **Geschwister-Konsistenz**: Nur innerhalb einer Datei, nicht über Schulträger hinweg

### Was bereits funktioniert

- Korrektur-Regeln (Speichern/Laden) sind **nicht datei-spezifisch** → werden korrekt auf Dateien beider Schulträger angewendet
- Alle Format-Validierungen (AHV, PLZ↔Ort, Telefon etc.) sind identisch und funktionieren

### Verbesserungsplan

**Kernänderung: Multi-File-Upload in Step1 ermöglichen**

Statt nur einer Datei soll Step1 optional mehrere CSV/Excel-Dateien akzeptieren. Die Zeilen werden zusammengeführt (concatenated), bevor sie validiert werden. Dadurch funktionieren Eltern-ID-Konsolidierung und Geschwister-Checks automatisch über Schulträger-Grenzen hinweg.

#### Technische Umsetzung

1. **Step1FileUpload.tsx erweitern**
   - `<input>` auf `multiple` setzen
   - Jede Datei einzeln parsen, Header abgleichen (müssen identisch sein oder kompatibel)
   - Zeilen zusammenführen, `ParseResult` enthält kombinierte Daten
   - Eine Quelldatei-Spalte (`_source_file`) optional hinzufügen, um im Export die Herkunft zu tracken
   - UI: Liste der geladenen Dateien mit Zeilenanzahl + Entfernen-Button pro Datei

2. **ParseResult erweitern** (`fileParser.ts`)
   - Neues optionales Feld `sourceFiles?: { name: string; rowCount: number }[]`
   - Merge-Funktion: `mergeParseResults(results: ParseResult[]): ParseResult` die Header-Kompatibilität prüft und Zeilen zusammenführt

3. **Index.tsx anpassen**
   - `onFileLoaded` akzeptiert weiterhin ein `ParseResult` (das intern bereits gemerged ist)
   - Keine Änderungen an Step2-4 nötig, da sie nur mit `rows[]` und `headers[]` arbeiten

4. **Export (Step4Preview.tsx)**
   - Option "Nach Quelldatei aufteilen" beim Export, falls mehrere Dateien geladen wurden
   - Oder einfach alles als eine Datei exportieren (Standard)

5. **UI-Hinweis in Step0**
   - Bei "Weitere Datenaufbereitung" einen Tipp ergänzen: "Sie können auch Dateien mehrerer Schulträger gleichzeitig hochladen"

#### Nicht nötig zu ändern

- Korrektur-Regeln-Logik (funktioniert bereits generisch)
- Validierungs-Engine (arbeitet auf der kombinierten Zeilenmenge)
- Eltern-ID-Konsolidierung (findet automatisch Cross-File-Matches)

#### Dateien die geändert werden

| Datei | Änderung |
|---|---|
| `src/lib/fileParser.ts` | `mergeParseResults()` Funktion hinzufügen |
| `src/components/import/Step1FileUpload.tsx` | Multi-File-Upload UI + Merge-Logik |
| `src/pages/Index.tsx` | Minimale Anpassung an `parseResult.sourceFiles` |
| `src/components/import/Step4Preview.tsx` | Optional: Export-Split nach Quelldatei |
| `src/components/import/StepHelpCard.tsx` | Tipp für Multi-Schulträger ergänzen |

