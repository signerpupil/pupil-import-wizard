
## Neuer Import-Typ: LP-Klassenzuweisungen (Faecher der Stundentafel)

### Zusammenfassung

Ein weiterer Import-Typ wird dem Wizard hinzugefuegt, der LP-Klassenzuweisungen fuer "Faecher der Stundentafel" erstellt. Der Workflow ist aehnlich zum Gruppenzuweisungs-Import: Copy-Paste von LehrerOffice-Daten, eine Personen-Datei hochladen, und am Schluss ein Excel exportieren.

### Ablauf

```text
Schritt 0: Typ waehlen --> "LP-Klassenzuweisungen" auswaehlen
Schritt 1: Klassen erfassen (Copy-Paste aus LehrerOffice-Klassenexport)
Schritt 2: Lehrpersonen zuordnen (Excel/CSV Upload der Personen-PUPIL-Datei mit Nachname, Vorname, Schluessel)
Schritt 3: Export (Excel-Datei "LP-Zuteilung.xlsx" herunterladen)
```

### Eingabedaten

**LO-Export Klassen (Copy-Paste, Tab-getrennt):**
- Enthalt pro Klasse: Klassenname, Status (aktiv/inaktiv), und bis zu 14 Lehrpersonen-Zuweisungen in den Rollen:
  - Klassenlehrperson 1-3 (Spalten ca. 10-12)
  - Weitere Lehrperson 1-3 (Spalten ca. 13-15)  
  - Heilpaedagoge/in 1-3 (Spalten ca. 17-19)
  - Weitere Foerderlehrperson 1-3 (Spalten ca. 21-23)
  - Vikariat (Spalte ca. 24-25)
- Nur Zeilen mit Status "aktiv" werden uebernommen
- LP-Namen stehen als "Vorname Nachname" oder "Nachname Vorname" in den Zellen

**Personen-PUPIL (Excel/CSV Upload):**
- Spalten: Nachname, Vorname, Kuerzel, Schluessel, E-Mail, Adresse, Geburtsdatum
- Relevant fuer uns: Nachname, Vorname, Schluessel (z.B. "PID6970")
- Wird genutzt um LP-Namen aus dem Klassenexport mit PUPIL-Schluesseln abzugleichen

### Ausgabe-Excel: LP-Zuteilung.xlsx

Jede Zeile im Export stellt eine einzelne LP-Klassen-Zuweisung dar mit folgenden Spalten:

| LP Name | LP Schluessel | Rolle | Klasse | Fach |
|---------|--------------|-------|--------|------|
| Ackermann Susanne | PID6970 | Klassenlehrperson | PS1a Herrenberg | Faecher der Stundentafel |
| Weber Hunziker Jeannette | PID3987 | Klassenlehrperson | PS1a Herrenberg | Faecher der Stundentafel |
| Bernet Gubser Andrea | PID6975 | Weitere Lehrperson | PS1a Herrenberg | Faecher der Stundentafel |

- **LP Name**: Zur besseren Uebersicht (Nachname Vorname)
- **LP Schluessel**: PUPIL-ID fuer den Import
- **Rolle**: Klassenlehrperson, Weitere Lehrperson, Heilpaedagoge/in, Weitere Foerderlehrperson, oder Vikariat
- **Klasse**: Name der Klasse
- **Fach**: Immer "Faecher der Stundentafel"

LPs ohne gefundenen PUPIL-Schluessel werden markiert, damit der Benutzer diese manuell ergaenzen kann.

### Technische Umsetzung

#### 1. Import-Typ erweitern (`src/types/importTypes.ts`)

- `ImportType` um `'lp-zuweisung'` erweitern
- Neuen `importConfig`-Eintrag hinzufuegen (Name: "LP-Klassenzuweisungen", Icon: `UserCheck` oder `ClipboardList`)
- Neue Interfaces definieren:
  - `TeacherAssignment`: klasse, lpName, rolle, lpSchluessel
  - `PupilPerson`: nachname, vorname, schluessel

#### 2. Neue Komponenten

**`src/components/import/LPImportWizard.tsx`**
- Eigenstaendiger 3-Schritt-Wizard (analog zu GroupImportWizard)
- Verwaltet den State: geparste Klassen mit LP-Zuweisungen, Personen-Liste, fertige Zuweisungen

**`src/components/import/lp-zuweisung/LPStep1Classes.tsx`**
- Textarea fuer Copy-Paste des LehrerOffice-Klassenexports (Tab-getrennt)
- Parser-Logik:
  - Header-Zeile dynamisch erkennen (Suche nach "Klasse" in erster Spalte mit vielen Tabs)
  - Spaltenindizes fuer LP-Rollen dynamisch bestimmen anhand bekannter Muster im LO-Export
  - Nur aktive Klassen uebernehmen (Status = "aktiv")
  - Pro Klasse: Klassenname + bis zu 14 LP-Namen mit ihren Rollen extrahieren
- Vorschau der erkannten Klassen und LP-Zuweisungen als Tabelle
- Anzeige: X Klassen mit Y LP-Zuweisungen erkannt

**`src/components/import/lp-zuweisung/LPStep2Teachers.tsx`**
- Excel/CSV-Upload fuer Personen-PUPIL-Datei (bestehender fileParser wird wiederverwendet)
- Spalten auslesen: Nachname, Vorname, Schluessel
- Automatischer Namensabgleich: LP-Namen aus Schritt 1 werden mit Personen-Liste abgeglichen
  - Matching-Logik: "Vorname Nachname" und "Nachname Vorname" pruefen
  - Fuzzy-Toleranz fuer Sonderzeichen/Diakritika (z.B. "Rene" vs "René")
- Anzeige der Zuordnungsergebnisse:
  - Erfolgreich zugeordnet (Name + Schluessel)
  - Nicht zugeordnet (LP-Name ohne Match - manuell behebbar)
- Bearbeitungsmoeglichkeit fuer fehlgeschlagene Zuordnungen (Dropdown mit Personen-Liste)

**`src/components/import/lp-zuweisung/LPStep3Export.tsx`**
- Vorschau der finalen Zuweisungstabelle (LP Name, Schluessel, Rolle, Klasse, Fach)
- Warnung bei LPs ohne Schluessel
- Export-Button: "LP-Zuteilung.xlsx" mit exceljs generieren
- Paginierung fuer grosse Datensaetze (200+ Zuweisungen)

#### 3. Integration in Step0TypeSelect

- "LP-Klassenzuweisungen" als neue Kachel anzeigen (neben Schuelerdaten und Gruppenzuweisungen)
- Aufbereitungsmodus wird fuer diesen Typ ausgeblendet (wie bei Gruppen)
- Grid auf `md:grid-cols-3` beibehalten (passt fuer 3 Kacheln)

#### 4. Integration in Index.tsx

- Neue Variable `showLPWizard = importType === 'lp-zuweisung' && currentStep >= 1`
- Wenn aktiv, wird `LPImportWizard` angezeigt statt des normalen Wizard-Flows
- Analog zur bestehenden `showGroupWizard`-Logik

#### 5. LP-Rollen-Zuordnung im LO-Export

Basierend auf der Analyse des Klassenexports sind die LP-Spalten wie folgt angeordnet (die exakten Positionen werden dynamisch bestimmt):

```text
Spalte ~10: Lehrperson 1 (= Klassenlehrperson 1)
Spalte ~11: Lehrperson 2 (= Klassenlehrperson 2)
...bis zu 14 LP-Positionen mit festen Rollen
```

Die Rollen-Zuordnung erfolgt positionsbasiert analog zur Referenz-Datei:
- Position 1-3: Klassenlehrperson
- Position 4-6: Weitere Lehrperson
- Position 7-9: Heilpaedagoge/in
- Position 10-12: Weitere Foerderlehrperson
- Position 13-14: Vikariat

#### 6. Namensabgleich-Algorithmus

1. Personen-Lookup-Map erstellen: `"nachname vorname"` (lowercase) -> Schluessel
2. Fuer jeden LP-Namen aus dem Klassenexport:
   - Direkte Suche (lowercase)
   - Umgedrehte Reihenfolge pruefen ("vorname nachname" -> "nachname vorname")
   - Normalisierte Suche (Diakritika entfernen)
3. Bei Mehrdeutigkeiten (gleicher Name, verschiedene Personen): Benutzer um Aufloesung bitten

### Nicht betroffen

- Bestehende Wizard-Schritte und Import-Typen bleiben unveraendert
- GroupImportWizard wird nicht veraendert
- Validierungslogik und Korrektur-Gedaechtnis sind fuer diesen Typ nicht relevant
