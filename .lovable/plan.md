

## Lehrpersonen-Import Wizard

### Übersicht
Neuer Import-Typ "Lehrpersonen" als eigenständiger Wizard (analog zu Gruppen und LP-Zuweisung). Der Wizard liest eine LehrerOffice CSV/XLSX-Datei ein, erlaubt das Festlegen eines Standard-"Beruf"-Werts, benennt die Spalten um und exportiert als XLSX.

### Workflow (3 Schritte)

```text
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│ 1. Upload    │───>│ 2. Beruf wählen  │───>│ 3. Export    │
│ CSV/XLSX     │    │ + Vorschau       │    │ XLSX         │
└──────────────┘    └──────────────────┘    └──────────────┘
```

**Schritt 1 — Datei hochladen**: CSV oder XLSX Upload (analog Step1FileUpload)
**Schritt 2 — Beruf festlegen**: Dropdown/Combobox mit Optionen "MA", "Lehrperson", "Deaktiviert-Spezial" + manueller Freitext. Vorschau der Daten mit umbenannten Spalten. Einzelne Zeilen können einen abweichenden Beruf-Wert erhalten.
**Schritt 3 — Export**: XLSX-Download mit umbenannten Spalten und eingesetztem Beruf-Wert.

### Spalten-Mapping (Position-basiert)

| LehrerOffice (Original) | PUPIL (Export) |
|---|---|
| Q_System | IDVRSG |
| L_AHV | AHV-V-Nr |
| L_ID | LID |
| L_Name | Name |
| L_Vorname | Vorname |
| L_Geschlecht | Ges |
| L_Geburtsdatum | Geb |
| L_Funktion | Beruf (überschrieben mit gewähltem Wert) |
| L_Mobil | Natel |
| L_Privat_Strasse | Strasse |
| L_Privat_PLZ | Plz |
| L_Privat_Ort | Ort |
| L_Privat_Land | Land |
| L_Privat_EMail | EMail_P |
| L_Privat_Telefon | Tel_P |
| L_Schule_EMail | EMail_G |
| L_Schule_Telefon | Tel_G |
| Alle anderen Spalten | Header leer, Daten beibehalten |

### Dateien

1. **`src/types/importTypes.ts`** — Neuen Typ `'lehrpersonen'` zu `ImportType` hinzufügen, neue `importConfig` und Spalten-Mapping-Konstante definieren.

2. **`src/components/import/LehrpersonenImportWizard.tsx`** — Neuer Wizard (analog GroupImportWizard) mit 3 Schritten:
   - `LPStep1Upload.tsx` — Datei-Upload und Parsing
   - `LPStep2BerufConfig.tsx` — Beruf-Auswahl (Combobox mit Preset-Werten + Freitext), Tabellen-Vorschau mit umbenannten Spalten, pro Zeile überschreibbarer Beruf-Wert
   - `LPStep3Export.tsx` — XLSX-Export mit Spalten-Umbenennung

3. **`src/components/import/Step0TypeSelect.tsx`** — Neuen Import-Typ "Lehrpersonen" in der Auswahl anzeigen (4. Kachel), als `isSpecialType` behandeln.

4. **`src/pages/Index.tsx`** — `showLehrpersonenWizard`-Logik analog zu `showGroupWizard` / `showLPWizard`, Rendering des neuen Wizards.

5. **`src/lib/lehrpersonenExport.ts`** — Spalten-Mapping-Logik und XLSX-Export-Funktion (Header-Umbenennung, Beruf-Wert-Einsetzung).

