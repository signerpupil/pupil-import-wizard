

# LP-Vergleich: PUPIL vs. LehrerOffice

## Uebersicht

Die PUPIL-Klassen-Datei enthaelt eine Spalte "Klassenlehrpersonen" (kommagetrennt). Diese soll mit den aus LehrerOffice erkannten Lehrpersonen pro Klasse verglichen werden, um Unterschiede hervorzuheben -- z.B. LP in PUPIL eingetragen aber nicht in LO, oder umgekehrt.

## Aenderungen

### 1. `src/types/importTypes.ts` -- PupilClass erweitern

Feld `klassenlehrpersonen: string[]` hinzufuegen (die kommagetrennte Spalte wird beim Parsen gesplittet).

### 2. `src/components/import/lp-zuweisung/LPStep2Teachers.tsx` -- Klassenlehrpersonen parsen

Beim Upload der PUPIL-Klassen-Datei zusaetzlich die Spalte "Klassenlehrpersonen" auslesen und als Array speichern.

### 3. `src/components/import/lp-zuweisung/LPStep3Export.tsx` -- Vergleichs-Card

Neue optionale Card "Vergleich PUPIL vs. LehrerOffice" am Ende von Step 3:

- Nur anzeigen, wenn `pupilClasses` mit Lehrpersonen-Daten vorhanden sind
- Pro gematchte Klasse vergleichen:
  - **Nur in LO**: LP-Namen die in LO einer Klasse zugewiesen sind aber nicht in der PUPIL-Klassenlehrpersonen-Liste stehen
  - **Nur in PUPIL**: LP-Namen die in PUPIL stehen aber nicht in den LO-Zuweisungen
  - **Uebereinstimmend**: In beiden vorhanden
- Namens-Matching ueber `normalizeName` (case-insensitive, diakritik-tolerant)
- Tabelle mit Spalten: Klasse | Nur in LO | Nur in PUPIL | Uebereinstimmend
- Klassen ohne Unterschiede werden in einem zuklappbaren `<details>` Block angezeigt, Klassen mit Unterschieden prominent

### 4. `LPImportWizard.tsx` und Props

`pupilClasses` an `LPStep3Export` durchreichen (neues Prop), sowie `classData` fuer den LO-seitigen Vergleich.

