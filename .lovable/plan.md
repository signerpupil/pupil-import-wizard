

## E-Mail-Inline-Bearbeitung in der Lehrpersonen-Vorschau

### Übersicht
E-Mail-Felder (`L_Privat_EMail` / `L_Schule_EMail`) werden in der Vorschautabelle direkt editierbar — gleiche UX wie beim Beruf-Feld (Hover → Pencil-Icon → Inline-Input → Enter/Escape).

### Änderungen

**1. `src/components/import/LehrpersonenImportWizard.tsx`**
- Neuer State: `rowEmailOverrides: Record<number, Record<string, string>>` — speichert pro Zeile + Spaltenname den überschriebenen Wert
- State für Inline-Editing erweitern: `editingCell: { row: number; col: string } | null` + `editValue` (bestehenden `editingRow`/`editValue` zu einem generischen Editing-State refactoren)
- In der Vorschautabelle: E-Mail-Spalten (`L_Privat_EMail`, `L_Schule_EMail`) erhalten dieselbe Edit-Logik wie `L_Funktion` — Pencil-Button bei Hover, Input bei Klick
- Überschriebene Werte werden visuell hervorgehoben (blaue Schrift wie bei Beruf)
- E-Mail-Duplikat-Prüfung (`findDuplicateEmails`) wird nach Anwenden der Overrides neu berechnet, sodass Duplikate in Echtzeit verschwinden wenn der User eine E-Mail korrigiert
- Angepasste Zeilen-Anzahl im Export-Step anzeigen (Beruf + E-Mail zusammen)

**2. `src/lib/lehrpersonenExport.ts`**
- `exportLehrpersonenToXlsx` erhält neuen Parameter `emailOverrides: Record<number, Record<string, string>>`
- Beim Erstellen der Datenzeilen werden E-Mail-Overrides berücksichtigt (analog zu Beruf-Overrides)

### UX-Details
- Edit-Modus: Klick auf Pencil → Input-Feld mit aktuellem Wert → Enter speichert, Escape bricht ab
- Geänderte E-Mails erscheinen in blauer Schrift
- Duplikat-Warnung aktualisiert sich sofort nach Änderung

