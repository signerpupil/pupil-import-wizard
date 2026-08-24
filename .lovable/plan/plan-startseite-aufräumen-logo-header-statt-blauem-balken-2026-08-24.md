# Plan: Startseite aufräumen, Logo-Header statt blauem Balken

## Ziel
Das Pupil-Logo steht als ruhiger, weisser Header über allem (auf jeder Wizard-Stufe). Der blaue Farbbalken oben entfällt. Die Startseite wird in eine klare, ruhige Hierarchie gebracht: erst der Ablauf (Import/Migration), danach Hilfe & Ressourcen.

## 1. Neuer App-Header (ersetzt den blauen Balken)
Datei: `src/components/import/WizardHeader.tsx`, eingebunden in `src/pages/Index.tsx`

- Blauer Gradient-Balken mit Diagonalmuster wird entfernt.
- Neu: weisser, oben klebender Header (`sticky top-0`, `bg-card`, feine untere Border, sehr dezenter Schatten).
- Inhalt links: Pupil-Logo (`/pupil-logo.png`, Höhe ca. 40px) + Trennstrich + Titel "PUPIL@AG" mit kleinem Untertitel "Migration LehrerOffice – Import in Pupil".
- Rechts: aktueller Schritt-Titel als dezentes Badge (nur ab Schritt 1), damit die Orientierung erhalten bleibt.
- Der Header gilt für alle Schritte, also steht das Logo wirklich über allem.

## 2. Logo-Block auf der Startseite entfernen
Datei: `src/components/import/Step0TypeSelect.tsx`

- Die aktuelle Logo-/Hero-Karte innerhalb von Step 0 entfällt (Logo lebt jetzt im Header).
- Stattdessen eine schlanke Seiten-Einleitung: H1 "Migration LehrerOffice – Import in Pupil" + ein Satz Erklärung, linksbündig, ohne Kasten.

## 3. Neue Anordnung der Startseite
Reihenfolge von oben nach unten, klar nach Ablauf sortiert:

```text
[Header: Logo | PUPIL@AG]
1  Titel + Einleitung
2  SCHRITT 1 – Import starten (4 Import-Kacheln + Weiter-Button)   Primary/Blau
3  Pupil Instanz einrichten (Tutorial, Rollen)                     Teal
4  Hilfe & Kontakt (2 Karten nebeneinander)                        neutral
      - Login & Onboarding  -> pipy.app (neuer Tab)
      - Kontakt Projektleitung -> Dialog wie bisher
5  Schulung & Ressourcen (E-Learning + 4 Ressourcen-Kacheln,
   in EINEM Bereich zusammengeführt)                               dezent
```

Konkret:
- "Login & Onboarding" und "Kontakt zur Projektleitung" wandern von ganz oben nach unten in einen gemeinsamen, zweispaltigen Bereich "Hilfe & Kontakt". Beide Funktionen und Links bleiben unverändert (inkl. Ja/Nein-Dialog).
- Der bisher separate Bereich "E-Learnings für den Kanton Aargau" (nur 1 Kachel) wird mit "Weitere Ressourcen & Schulung" zu einem Bereich "Schulung & Ressourcen" zusammengelegt – gleiche Kacheln, ein Raster, weniger Bruchstellen.
- Der Import-Bereich bekommt den optischen Vorrang: als einziger Bereich mit Primary-Akzent und leicht kräftigerem Rahmen.

## 4. Visuelle Beruhigung
- Weniger Farbtöne gleichzeitig: Primary nur für den Import-Bereich, Teal für Instanz-Setup, ein einziger dezenter Ton für Schulung & Ressourcen (statt Amber + Violett nebeneinander). Der Amber-Kontakt-Akzent wird auf eine dezente Umrandung reduziert.
- Einheitliche Sektions-Optik: gleicher Innenabstand, gleiche Rundung, gleiche Border-Stärke, konsistente Sektionsüberschrift mit kleinem Icon und optionaler Kurzbeschreibung.
- Einheitliche Kachel-Optik: gleiche Icon-Grösse, gleiche Titel-/Text-Grössen, gleiche Hover-Reaktion in allen Bereichen.
- Abstände: `space-y-10` zwischen Bereichen, `gap-5` in Rastern – klare Trennung ohne Lücken-Chaos.
- Nur semantische Design-Tokens, keine hartkodierten Farben. Nicht mehr benötigte Tokens (`--pupil-learning`, `--pupil-onboarding`) bleiben bestehen, werden aber ggf. nicht mehr verwendet.

## 5. Nicht Teil dieser Änderung
- Keine Änderungen an Import-Logik, Validierung oder Exporten.
- Alle Links, Dialoge und Passwort-Anzeige bleiben funktional identisch.

## Technische Details
- Betroffene Dateien: `src/components/import/WizardHeader.tsx`, `src/components/import/Step0TypeSelect.tsx`, ggf. minimale Anpassung in `src/pages/Index.tsx` (Header-Props / Abstand `main`).
- Prüfung nach Umsetzung: Playwright-Screenshots bei 1440px und 1024px Breite sowie mobil (390px), um Überlappungen und Umbrüche vor der Rückmeldung auszuschliessen.

## Akzeptanzkriterien
- [ ] Kein blauer Balken mehr; oben weisser Header mit Logo auf jeder Stufe.
- [ ] Startseite ohne doppelten Logo-Block.
- [ ] Bereiche in der Reihenfolge Import → Instanz → Hilfe & Kontakt → Schulung & Ressourcen.
- [ ] Einheitliche Kachel- und Sektionsgestaltung, reduzierte Farbvielfalt.
- [ ] Alle bestehenden Links/Dialoge funktionieren unverändert.
- [ ] Build fehlerfrei, Screenshots ohne Überlappungen.
