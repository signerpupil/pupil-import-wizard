# Plan: Startseite Step0 visuell überarbeiten

## Ziel
Die Startseite des Import Wizards (`Step0TypeSelect`) erhält einen klaren Seitentitel, eine linksbündige Einleitung und visuell abgegrenzte Bereiche.

## Geplante Änderungen

### 1. Titel und Einleitung
- Hero-Bereich umstrukturieren:
  - Haupttitel: **"Migration LehrerOffice - Import in Pupil"**
  - Untertitel: "Was möchten Sie importieren? Wählen Sie den passenden Import-Typ für Ihre Daten aus LehrerOffice."
  - Ausrichtung: **linksbündig** (statt zentriert)
  - Info-Badge **"Import-Typ und Modus auswählen"** direkt unter dem Titel platzieren
  - "Willkommen im Import Wizard"-Badge entfernen

### 2. Bereiche farblich abgrenzen
Aktuell sind alle drei Bereiche sehr ähnlich gestaltet. Vorschlag:

| Bereich | Visuelle Kennzeichnung |
|---|---|
| Import Wizard (4 Import-Kacheln) | Standard-Cards mit Primary-Blau-Akzenten, leichter Hintergrund `bg-primary/[0.02]` um den Block |
| Pupil Instanz einrichten | Beibehaltung des Teal-Tons (`pupil-teal`), zusätzlich leicht gerundeter Container mit `bg-pupil-teal/[0.04]` |
| E-Learnings für den Kanton Aargau | Neuer weicher Akzent, z. B. warmes Lern-Orange oder ruhiges Sky-Blau, als eigener semantischer Design-Token `--pupil-learning` |

#### Farboptionen für den E-Learning-Bereich
- **Option A (Teal-Konsistenz):** Alle drei Bereiche im Teal-Ton, aber unterschiedliche Hintergrundintensitäten und Icon-Farben.
- **Option B (Bereichs-Farbcodierung):** Import = Primary-Blau, Pupil Instanz = Teal, E-Learnings = neuer weicher Lern-Akzent (z. B. HSL 38 92% 50% als weiche Variante).
- **Option C (Subtile Trennung):** Keine neuen Farben, sondern abwechselnde helle Hintergründe (`bg-muted/30`, `bg-primary/[0.02]`, `bg-pupil-teal/[0.03]`) und unterschiedliche Titel-Icon-Farben.

Empfohlen: **Option B**, da sie die drei Bereiche am schnellsten erfassbar macht, ohne vom minimalistischen Teal/Cyan-Design abzuweichen.

### 3. Technische Umsetzung
- Betroffene Datei: `src/components/import/Step0TypeSelect.tsx`
- Keine neuen hartkodierten Farben; neue semantische Tokens in `src/index.css` ergänzen, falls Option B gewählt wird.
- Keine Änderungen an Geschäftslogik, nur Darstellung.

## Akzeptanzkriterien
- [ ] Titel lautet "Migration LehrerOffice - Import in Pupil"
- [ ] Untertitel ist linksbündig unter dem Titel
- [ ] Info "Import-Typ und Modus auswählen" ist sichtbar
- [ ] Die drei Bereiche sind visuell voneinander unterscheidbar
- [ ] Build läuft fehlerfrei durch
