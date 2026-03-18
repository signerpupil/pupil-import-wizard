

## PUPIL-Klassen-Export Anleitung fuer LPStep2Teachers

Neue aufklappbare Anleitung fuer den PUPIL-Klassen-Export, analog zu `PUPILInstructionGuide` und `LOInstructionGuide`.

### Aenderungen

**1. Screenshots kopieren**
- `user-uploads://2026-03-03-06-52-16.png` → `src/assets/pupil-anleitung-klassen.png` (PUPIL Klassen-Ansicht)
- `user-uploads://2026-03-03-06-54-50.png` → `src/assets/pupil-anleitung-klassen-excel.png` (Excel-Ergebnis)

**2. Neue Komponente `src/components/import/lp-zuweisung/PUPILClassesInstructionGuide.tsx`**

Gleiche Struktur wie `PUPILInstructionGuide`, mit zwei Phasen:

**Phase A — Navigieren:**
1. Im linken Menü **Master Data** öffnen
2. **Schulen/Klassen/Gruppen** anklicken
3. **Klassen** auswählen

Screenshot `pupil-anleitung-klassen.png` mit Lightbox

**Phase B — Tabelle kopieren:**
4. Gesamte Klassentabelle mit Kopfzeile bis ganz nach unten markieren
5. Mit Rechtsklick oder **Ctrl+C** kopieren
6. In leere Excel-Tabelle einfügen und **Excel speichern**

Screenshot `pupil-anleitung-klassen-excel.png` mit Lightbox

- localStorage-Key: `pupil-classes-guide-open`, standardmässig eingeklappt
- Nummern-Badges 1-6, identisches Pattern

**3. `LPStep2Teachers.tsx` anpassen**

`<PUPILClassesInstructionGuide />` in die zweite Card ("PUPIL-Klassen Datei hochladen") einbauen, zwischen der Beschreibung und dem File-Upload-Input (Zeile ~386, nach dem `<p>` Tag).

### Technische Details

- Identisches Pattern wie `PUPILInstructionGuide`: Collapsible, Dialog-Lightbox, localStorage-Persistenz
- Zwei Screenshots statt einem (je einer pro Phase)

