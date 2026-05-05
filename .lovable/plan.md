## Ziel

1. Neuer Importbereich **«Stammdaten Lehrpersonen»** an **erster Position** der Auswahl-Kacheln (vor «Stammdaten SuS und EZB»).
2. Bestehender Bereich **«Stammdaten»** wird umbenannt zu **«Stammdaten SuS und EZB»**.
3. Bestehender Bereich «Lehrpersonen» (LehrerOffice → PUPIL) bleibt unverändert.

## Verhalten des neuen Bereichs

Vereinfachter 2-Schritt-Wizard (Datei hochladen → Export):

- **Eingabe**: Original-LehrerOffice-Export (48 Spalten, identisches Schema wie bestehender Lehrpersonen-Import).
- **Header-Mapping**: positionell, identisch zur Musterdatei `Bereinigter_Export_Lehrpersonen.xlsx` Zeile 1 (52 Spalten – am Ende kommen 4 zusätzliche leere Spalten dazu). Mapping z.B. `Q_System→IDVRSG`, `L_AHV→AHV-V-Nr`, `L_ID→LID`, `L_Name→Name`, `L_Vorname→Vorname`, `L_Geschlecht→Ges`, `L_Geburtsdatum→Geb`, `L_Funktion→Beruf`, `L_Nationalitaet→Nationalitaet`, `L_Mobil→Natel`, `L_Eintritt→Eintritt`, `L_Anrede→Anrede`, `L_Privat_Strasse→Strasse`, `L_Privat_PLZ→Plz`, `L_Privat_Ort→Ort`, `L_Privat_Land→Land`, `L_Privat_EMail→EMail_P`, `L_Privat_Telefon→Tel_P`, `L_Schule_EMail→EMail_G`, `L_Schule_Telefon→Tel_G`. Restliche Spalten: leerer Header (Daten bleiben erhalten in Spalten ohne Header).
- **Beruf-Spalte (L_Funktion)**: für **alle befüllten Datenzeilen** wird der Wert mit `"Spezial - Deaktiviert"` überschrieben.
- **Standard-User-Zeile** wird **fix** als Zeile 3 eingefügt (Inhalt aus Musterdatei):
  - `LID=PUP6546654679797`, `Name=Testuser`, `Vorname=Pupil`, `Ges=m `, `Geb=01.01.1990`, `Beruf=Spezial - Deaktiviert`, `EMail_G=lp@einfach.schule`, restliche Felder leer.
- **Reihenfolge**: Zeile 1 = Headerzeile, Zeile 2 = Standard-User, Zeile 3+ = transformierte LO-Daten.
- **Export-Dateiname**: `<originalname>_Bereinigt.xlsx` bzw. `Stammdaten_Lehrpersonen_Bereinigt_<YYYY-MM-DD>.xlsx`.

## Technische Umsetzung

### Neue Dateien
- `src/lib/stammdatenLehrpersonenExport.ts` — Header-Mapping (52 Spalten), Standard-User-Konstante, `exportStammdatenLehrpersonenToXlsx()` mit ExcelJS analog zu `lehrpersonenExport.ts`. Alle Werte über `sanitizeCellValue` und Spalten-Format `@` für Datums-/Zahlentreue.
- `src/components/import/StammdatenLehrpersonenImportWizard.tsx` — Neuer Wizard (Schritt 1 Upload via `Step1FileUpload`, Schritt 2 kompakte Vorschau + Export-Button). Keine Beruf-Auswahl, keine Zellenedition.

### Änderungen
- `src/types/importTypes.ts`
  - `ImportType` um `'stammdaten-lehrpersonen'` erweitern.
  - In `importConfigs`: neuer Eintrag mit `name: 'Stammdaten Lehrpersonen'`, Icon `UserCog` (oder `BookUser`).
  - Bestehenden Eintrag `type: 'schueler'` umbenennen: `name: 'Stammdaten SuS und EZB'`.
- `src/components/import/Step0TypeSelect.tsx`
  - `iconMap` ggf. erweitern.
  - Filter `.filter(...)` ergänzt um `'stammdaten-lehrpersonen'`.
  - Reihenfolge im Grid sicherstellen: Stammdaten Lehrpersonen → Stammdaten SuS und EZB → Gruppenzuweisungen → LP-Klassenzuweisungen → Lehrpersonen. (Über expliziten Sortier-Array statt importConfigs-Reihenfolge.)
  - `isSpecialType` um neuen Typ ergänzen.
- `src/pages/Index.tsx`
  - Neue Variable `showStammdatenLPWizard` und in `showSpecialWizard`/`showSummary` einbinden.
  - Komponente einbinden: `{showStammdatenLPWizard && <StammdatenLehrpersonenImportWizard onReset={handleReset} />}`.
- `src/components/import/WizardSummary.tsx` / `getImportTypeName` in Index.tsx funktionieren automatisch via `importConfigs`.

### Memory
- `mem://index.md`: Eintrag «User Guidance and Naming» aktualisieren (Stammdaten → «Stammdaten SuS und EZB»).
- Neue Memory-Datei `mem://features/stammdaten-lehrpersonen-export` mit Standard-User-Daten + fixem Beruf.

## Nicht im Scope
- Validierung/Auto-Korrekturen für den neuen Bereich (analog bestehendem schlanken Lehrpersonen-Wizard nicht nötig).
- Änderungen am bestehenden «Lehrpersonen»-Bereich.
