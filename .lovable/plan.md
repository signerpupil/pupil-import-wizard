

## Problem: Gleiche ID, unterschiedliche Personen

Aktuell erkennt das System Duplikate bei gleichen IDs (S_ID, S_AHV, etc.) und bietet eine "Master Record"-Zusammenführung an. Das funktioniert für den Fall, dass dieselbe Person doppelt vorkommt. Es gibt aber den umgekehrten Fall: **Zwei verschiedene Personen haben versehentlich dieselbe ID.** Das ist ein schwerwiegender Datenfehler, der anders behandelt werden muss als ein normales Duplikat.

## Betroffene Stellen

### 1. Erkennung in `src/lib/fileParser.ts` (validateData)
Die Duplikat-Erkennung (Zeilen 1030-1099) prüft nur, ob ein Wert mehrfach vorkommt. Sie unterscheidet nicht zwischen:
- **Echtes Duplikat**: Gleiche ID, gleicher Name/AHV → selbe Person, doppelt erfasst
- **ID-Konflikt**: Gleiche ID, aber verschiedene Namen/AHV/Geburtsdatum → verschiedene Personen

**Änderung**: Nach der Duplikat-Erkennung für S_ID einen Vergleich der zugehörigen Personendaten (Name, Vorname, Geburtsdatum, AHV) durchführen. Wenn diese abweichen, wird ein separater Fehlertyp `id_conflict` mit Severity `error` statt `warning` erzeugt.

### 2. Erkennung bei Eltern-IDs
Analog für P_ERZ1_ID / P_ERZ2_ID: Gleiche Eltern-ID aber verschiedene Eltern-Namen/-AHV. Dies unterscheidet sich von der bestehenden "Eltern-ID Konsolidierung" (die den umgekehrten Fall behandelt: gleiche Person, verschiedene IDs).

**Änderung**: Neue Prüfung `checkSameIdDifferentPerson` die bei gleicher ID prüft, ob Name+Vorname oder AHV abweichen.

### 3. UI-Anzeige in `src/components/import/Step3Validation.tsx`
Die `getDuplicateInfo`-Funktion (ab Zeile 630) und die Master-Record-UI müssen den neuen Fehlertyp erkennen:
- Bei `id_conflict`: Klare Warnung "Verschiedene Personen mit gleicher ID", rot markiert
- Keine automatische Zusammenführung anbieten – stattdessen muss der User eine ID manuell ändern
- Vorschlag: "Eine der IDs muss korrigiert werden"

### 4. Worker (`src/workers/validationWorker.ts`)
Der `analyzeErrors`-Abschnitt für Duplikate (Zeile 347) muss den neuen Typ `id_conflict` als nicht auto-fixbar mit spezieller Beschreibung erkennen.

### 5. Tests
Neue Tests in `src/test/duplicateMerging.test.ts`:
- Gleiche S_ID, verschiedene Namen → `id_conflict`-Fehler
- Gleiche S_ID, gleiche Namen → normales `duplicate`
- Gleiche P_ERZ1_ID, verschiedene Eltern-Namen → `id_conflict`
- Gleiche S_AHV, verschiedene Personen → `id_conflict`

## Zusammenfassung der Änderungen

| Datei | Änderung |
|-------|----------|
| `src/lib/fileParser.ts` | Neue Funktion `checkSameIdDifferentPerson()`, Integration in `validateData` |
| `src/components/import/Step3Validation.tsx` | UI-Differenzierung für `id_conflict` vs. `duplicate`, angepasste Lösungsvorschläge |
| `src/workers/validationWorker.ts` | Neuer Pattern-Typ `id_conflict` in `analyzeErrors` |
| `src/types/importTypes.ts` | Neuer Fehlertyp `id_conflict` im ValidationError-Type |
| `src/test/duplicateMerging.test.ts` | Neue Tests für ID-Konflikt-Szenarien |

