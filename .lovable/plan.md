

# Bug-Analyse: Datum-Felder werden nicht automatisch korrigiert

## Ursache

In der Worker-Funktion `analyzeErrors` (`src/workers/validationWorker.ts`) gibt es einen **Off-by-One Fehler** bei der Mustererkennung:

- `fileParser.ts` erzeugt Fehler mit **1-indexierten** Zeilennummern (`rowNum = rowIndex + 1`, Zeile 1110)
- Der Worker liest aber `data[e.row]?.[e.column]` — also den Wert der **nächsten** Zeile statt der richtigen
- Bei Datums-Spalten liest der Worker somit den Wert einer falschen Zeile, die oft ein gültiges `DD.MM.YYYY`-Datum oder einen leeren Wert enthält → `formatDateDE()` gibt `null` zurück → alle Datumsfehler landen in "Manuelle Prüfung"

Bei Telefon/AHV-Mustern fällt der Fehler nicht auf, weil die Prüfkriterien breiter sind (z.B. "hat 9-13 Ziffern") und die verschobene Zeile diese oft auch erfüllt.

## Lösung

In der `analyzeErrors`-Funktion im Worker (`src/workers/validationWorker.ts`) bei **allen** Pattern-Checks `e.value` statt `data[e.row]?.[e.column]` verwenden. Der Fehler speichert den korrekten Wert bereits — es ist unnötig und fehleranfällig, nochmals in die Daten zu greifen.

### Betroffene Stellen (ca. 10 Vorkommen in `analyzeErrors`):
- AHV-Check (Zeile 79): `data[e.row]?.[e.column]` → `e.value`
- Phone-Check (Zeile 101): `data[e.row]?.[e.column]` → `e.value`
- Email-Check (Zeile 124): `data[e.row]?.[e.column]` → `e.value`
- PLZ-Check (Zeile 147): `data[e.row]?.[e.column]` → `e.value`
- Gender-Check (Zeile 169): `data[e.row]?.[e.column]` → `e.value`
- Name-Check (Zeile 191): `data[e.row]?.[e.column]` → `e.value`
- Street-Check (Zeile 213): `data[e.row]?.[e.column]` → `e.value`
- Ort-Check (Zeile 234): `data[e.row]?.[e.column]` → `e.value`
- IBAN-Check (Zeile 257): `data[e.row]?.[e.column]` → `e.value`
- Excel-Date-Check (Zeile 279): `data[e.row]?.[e.column]` → `e.value`
- Date-DE-Check (Zeile 303): `data[e.row]?.[e.column]` → `e.value`
- Whitespace-Check (Zeile 330): `data[e.row]?.[e.column]` → `e.value`

Alle Checks werden auf `e.value` umgestellt — ein einheitliches, korrektes Pattern.

