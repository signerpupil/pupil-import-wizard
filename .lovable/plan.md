
## Systematische Erweiterung der PLZ-Datenbank

### Ausgangslage
- **Aktuell im Code**: 2100 PLZ-Einträge
- **Offizielles Verzeichnis (swisstopo)**: 3190 PLZ mit 4073 PLZ-Ort-Zuordnungen
- **Fehlende PLZ** (gar nicht vorhanden): ~1200
- **Unvollständige PLZ** (fehlende Ortsvarianten): 307

### Vorgehen

**Datenquelle**: Amtliches Ortschaftenverzeichnis von swisstopo (CSV, öffentlich zugänglich unter data.geo.admin.ch). Dies ist die offizielle Referenzdatenbank der Schweizerischen Post.

**Datei: `src/lib/swissPlzData.ts`**

1. **Merge-Skript**: Die bestehenden manuell gepflegten Einträge (inkl. Varianten wie "Egg b. Zürich", "Langnau a. Albis") werden beibehalten und mit den offiziellen Daten zusammengeführt.

2. **Alle 3190 PLZ** der Schweiz und Liechtensteins werden abgedeckt, inklusive aller offiziell zugeordneten Ortschaften pro PLZ.

3. **Bestehende Varianten bleiben erhalten**: Manuell hinzugefügte Schreibweisen (z.B. "Egg b. Zürich" neben "Egg", "Uitikon Waldegg" neben "Uitikon") werden nicht entfernt — nur ergänzt.

4. **Sortierung**: Einträge nach PLZ numerisch sortiert, gruppiert nach Kanton (wie bisher), mit Kommentaren für die Kantonsabschnitte.

### Ergebnis
- ~3200 PLZ-Einträge statt 2100 (alle Schweizer PLZ abgedeckt)
- Alle offiziellen Ortsvarianten pro PLZ enthalten
- Keine false-positive Validierungsfehler mehr bei korrekten PLZ-Ort-Kombinationen

### Dateien
- Nur `src/lib/swissPlzData.ts` wird aktualisiert (Datenteil, Funktionen bleiben unverändert)
