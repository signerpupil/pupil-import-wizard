
# Plan: Standalone HTML-Version (Pausiert)

## Status: Pausiert

Die Standalone-Build-Dateien wurden vorübergehend entfernt, da das `vite-plugin-singlefile` Package Konflikte mit dem GitHub Pages Deployment verursachte.

## Alternative Ansätze

### Option 1: Manueller Build (lokal)
Der Standalone-Build kann lokal durchgeführt werden:
1. `npm install vite-plugin-singlefile --save-dev`
2. Standalone-Dateien manuell erstellen
3. `npm run build:standalone` ausführen
4. Die generierte HTML-Datei manuell hosten

### Option 2: Separates Repository
Ein separates Repository für die Standalone-Version erstellen, das unabhängig vom Haupt-Repository deployed wird.

### Option 3: GitHub Actions anpassen
Den GitHub Actions Workflow so anpassen, dass er das Plugin nur bei Bedarf installiert.

## Download-Button Status

Der Download-Button im Footer ist weiterhin vorhanden, aber der Link funktioniert erst, wenn eine Standalone-HTML-Datei manuell unter `public/pupil-import-wizard-offline.html` bereitgestellt wird.

## Ursprünglicher Plan

Die App sollte als einzelne HTML-Datei exportierbar gemacht werden, die alle Funktionen (ausser dem Admin-Bereich) vollständig offline enthält.

### Was funktioniert offline
- Datei-Upload und Parsing (CSV/Excel via ExcelJS)
- Spalten-Prüfung gegen erwartete Definitionen
- Datenvalidierung (AHV, E-Mail, Datum, PLZ, etc.)
- Fehlerkorrektur (manuell und automatisch)
- Export als korrigierte CSV/Excel-Datei
- Korrektur-Gedächtnis via localStorage
