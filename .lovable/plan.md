

## Neuer Import-Typ: Gruppenzuweisungen

### Zusammenfassung

Ein neuer Import-Typ "Gruppenzuweisungen" wird dem Wizard hinzugefuegt. Er hat einen eigenen 3-Schritt-Workflow mit mehreren Eingabequellen und zwei Export-Dateien.

### Ablauf

```text
Schritt 0: Typ waehlen --> "Gruppenzuweisungen" auswaehlen
Schritt 1: Gruppen erfassen (Copy-Paste aus LehrerOffice)
Schritt 2: Schueler-Zuweisungen (CSV/Excel-Upload + optionaler PUPIL-Schluesselabgleich)
Schritt 3: Export (Schuljahr/Semester/Schuleinheiten eingeben + zwei Excel-Dateien herunterladen)
```

### Technische Umsetzung

#### 1. Import-Typ erweitern (`src/types/importTypes.ts`)

- `ImportType` um `'gruppen'` erweitern
- Neuen `importConfig`-Eintrag fuer "Gruppenzuweisungen" hinzufuegen

#### 2. Neue Komponenten

**`src/components/import/GroupImportWizard.tsx`**
- Eigenstaendiger 3-Schritt-Wizard mit eigener Navigation und Progress-Anzeige
- Verwaltet den gesamten State (Gruppen, Schueler-Zuweisungen, Export-Einstellungen)

**`src/components/import/groups/GroupStep1Groups.tsx`**
- Textarea fuer Copy-Paste der LehrerOffice-Gruppendaten (Tab-getrennt)
- Parser: Header-Zeile erkennen ("Lehrperson 1"), Spaltenindizes dynamisch bestimmen
- Nur Zeilen mit Status "aktiv" und nicht-automatischer Selektion uebernehmen
- Schluessel automatisch generieren, falls leer
- Bearbeitbare Gruppenliste (Name, Schluessel, Lehrpersonen 1-8, Schulfach)

**`src/components/import/groups/GroupStep2Students.tsx`**
- CSV/Excel-Upload fuer Schuelerdaten (bestehender fileParser wird wiederverwendet)
- Spalten auslesen: S_ID, S_Gruppen (komma-/semikolon-getrennt), S_Name, S_Vorname
- Abgleich: Nur Zuweisungen behalten, deren Gruppenschluessel in den manuellen Gruppen existieren
- Optional: PUPIL-Schluessel-Mapping-Datei hochladen (LO-ID zu PUPIL-ID) und S_ID ersetzen

**`src/components/import/groups/GroupStep3Export.tsx`**
- Eingabefelder fuer Schuljahr, Semester und Schuleinheiten (werden in die Export-Dateien geschrieben)
- Vorschau der beiden Export-Dateien
- Export-Button 1: "Gruppen-Importieren.xlsx"
  - Spalten: Gruppe, Schluessel, Lehrperson 1-8, Schulfach, Schuleinheiten
- Export-Button 2: "SuS_Gruppen_Import.xlsx"
  - Spalten: Q_Schuljahr, Q_Semester, S_ID, S_Gruppen, (SuS Name), (Gruppen Name)
  - Verifikationsspalten (Name, Gruppenname) werden von PUPIL ignoriert

#### 3. Integration in Step0TypeSelect

- "Gruppenzuweisungen" als neue Kachel anzeigen
- Aufbereitungsmodus (initial/continued) wird fuer diesen Typ ausgeblendet

#### 4. Integration in Index.tsx

- Wenn `importType === 'gruppen'` und Step 0 abgeschlossen, wird `GroupImportWizard` angezeigt statt des normalen Wizard-Flows

### Nicht betroffen

- Bestehende Wizard-Schritte (Step1-Step4) bleiben unveraendert
- Validierungslogik, Korrektur-Gedaechtnis und Duplikat-Erkennung sind fuer diesen Typ nicht relevant
- Bestehende Tests werden nicht veraendert

