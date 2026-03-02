

# LP-Klassenzuweisungen: Dynamischer Header-basierter Parser

## Problem

Der aktuelle Parser in `LPStep1Classes.tsx` verwendet **hartcodierte Rollen-Offsets** (`ROLE_POSITIONS`), die nicht zum tatsaechlichen LehrerOffice-Export passen. Das fuehrt zu falschen Rollenzuordnungen:

| Spalte im Export | Aktuelle (falsche) Rolle | Korrekte Rolle |
|---|---|---|
| Vikariat (Offset 3) | Weitere Lehrperson | Vikariat |
| Lehrperson 6 (Offset 6) | Heilpaedagoge/in | Weitere Lehrperson |
| Schulsozialarbeiter/in (Offset 9) | Weitere Foerderlehrperson | Schulsozialarbeiter/in |
| Foerderlehrperson 3 (Offset 12) | Vikariat | Foerderlehrperson |
| Weitere Stellvertretung (Offset 13) | Vikariat | Weitere Stellvertretung |

Zusaetzlich:
- Abschnitts-Ueberschriften ("Kindergarten", "Primarschule", "Bezirksschule", "Realschule", "Sekundarschule") werden als Datenzeilen gelesen
- Es fehlt eine Rolle "Schulsozialarbeiter/in" im System

## Loesung: Dynamische Header-Erkennung

### Datei: `src/components/import/lp-zuweisung/LPStep1Classes.tsx`

1. **`ROLE_POSITIONS` entfernen** -- die statische Zuordnungstabelle wird nicht mehr benoetigt.

2. **Neue Funktion `detectTeacherColumns(headerCols)`**: Iteriert ueber alle Header-Spalten und erkennt Lehrer-Spalten anhand von Schluesselbegriffen im Spaltennamen. Fuer jede erkannte Spalte wird der Index und die Rolle gespeichert:

```text
Header-Name enthaelt...        → Rolle
"klassenlehrperson"            → Klassenlehrperson
"vikariat"                     → Vikariat
"lehrperson" (generisch)       → Weitere Lehrperson
"heilpädagog"                  → Heilpädagoge/in
"schulsozialarbeiter"          → Schulsozialarbeiter/in
"förderlehrperson"             → Förderlehrperson
"weitere stellvertretung"      → Weitere Stellvertretung
```

3. **Parser-Logik anpassen**: Statt feste Offsets ab `lpStartIndex` zu verwenden, wird fuer jede Datenzeile ueber die dynamisch erkannten Spalten-Indizes iteriert und der Wert + die zugehoerige Rolle ausgelesen.

4. **Abschnitts-Ueberschriften filtern**: Zeilen, bei denen der erste Tab-Wert einem bekannten Abschnittsnamen entspricht ("Kindergarten", "Primarschule", "Bezirksschule", "Realschule", "Sekundarschule", "Sonder") und kein Status-Feld "aktiv" haben, werden uebersprungen.

5. **Info-Alert aktualisieren**: Die statische Format-Beschreibung wird durch einen dynamischeren Hinweis ersetzt, der erklaert, dass Header automatisch erkannt werden.

### Datei: `src/types/importTypes.ts`

Die `ClassTeacherData`-Typen bleiben unveraendert -- die Struktur `{ klasse, teachers: { name, rolle }[] }` passt bereits.

## Ergebnis

- Rollen werden korrekt aus den Header-Namen abgeleitet, unabhaengig von der Spaltenreihenfolge
- Neue Rollen wie "Schulsozialarbeiter/in" werden automatisch erkannt
- Abschnitts-Zeilen und "Sonder"-Klassen stoeren nicht mehr

