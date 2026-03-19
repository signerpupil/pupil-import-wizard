

# Parameterized & Multi-Variant Tests

## Ziel
Alle Validierungsregeln mit vielen verschiedenen Datenvarianten automatisch durchspielen, um die Zuverlässigkeit zu maximieren. Statt einzelner handgeschriebener `it()`-Blöcke verwenden wir Vitest's `it.each()` / `describe.each()` mit Datentabellen, sodass jeder Testfall automatisch mit Dutzenden unterschiedlicher Eingaben läuft.

## Ansatz
Neues Testfile `src/test/parameterized.test.ts` mit folgenden Sektionen:

### 1. Datum-Validierung — Exhaustive Varianten
Tabelle mit ~30 Datumswerten, je markiert als `valid: true/false`:
- Gültige Daten: `01.01.2000`, `29.02.2024`, `31.12.2023`, `15.06.1990`, `28.02.2019`
- Ungültige Tage: `00.01.2020`, `32.01.2020`, `31.04.2020`, `31.06.2020`, `31.09.2020`, `31.11.2020`
- Ungültige Monate: `15.00.2020`, `15.13.2020`
- Schaltjahr-Matrix: `29.02.` für Jahre 2000, 2004, 2019, 2020, 2100, 1900
- Randwerte: `01.01.1900`, `31.12.2099`, `01.01.1899` (ungültig), `01.01.2101` (ungültig)
- Falsche Formate: `2020-01-15`, `15/01/2020`, `15-01-2020`

### 2. AHV-Validierung — Varianten
Tabelle mit ~15 AHV-Nummern: korrekte Prüfsummen, falsche Prüfsummen, zu kurze/lange, ohne 756-Prefix, mit/ohne Punkte.

### 3. PLZ-Validierung — Varianten
Tabelle mit ~15 PLZ-Werten: gültige (1000-9999), ungültige (0000, 99999, ABC, leer), Grenzwerte.

### 4. Gender-Validierung — Varianten
Alle gültigen (`M`, `W`, `m`, `w`, `1`, `2`, `männlich`, `weiblich`) und ungültigen (`X`, `3`, `abc`, leer).

### 5. Email-Typo-Korrekturen — Exhaustive
Alle bekannten Typo→Fix Paare aus `formatEmail()` als Tabelle durchspielen, plus korrekte Emails die unverändert bleiben sollen.

### 6. Sprach-/Nationalitäts-Mappings — Komplett
Alle Keys aus `LANGUAGE_AUTO_CORRECTIONS` und `NATIONALITY_AUTO_CORRECTIONS` via `Object.entries()` iterieren und sicherstellen, dass jeder Mapping-Wert auch tatsächlich bei `validateData` als `correctedValue` erscheint.

### 7. ERZ1=ERZ2 — Varianten
- Gleiche AHV, verschiedene Namen
- Verschiedene AHV, gleiche Namen (case-insensitive)
- Gleiche AHV mit Leerzeichen-Unterschied
- Ein ERZ leer → kein Fehler
- Beide leer → kein Fehler

### 8. Placeholder-IDs — Varianten
Alle Platzhalter (`0`, `00`, `000`, `0000`, `-1`, `99999`, `NULL`, `null`, `N/A`, `TBD`, `XXX`) plus negative Tests mit normalen IDs.

### 9. Student=Parent — Varianten
- S_AHV == ERZ1_AHV, S_AHV == ERZ2_AHV, S_AHV == beide
- AHVs mit/ohne Formatierung (Punkte)

### 10. Cross-Validierung Stabilität
- 50 zufällig generierte gültige Rows → 0 Fehler erwartet
- 50 Rows mit je einem zufälligen Fehler → genau 50 Fehler erwartet
- Validierung 3x hintereinander auf gleichen Daten → identisches Ergebnis (Determinismus-Test)

## Technisch
- Ein einziges neues File: `src/test/parameterized.test.ts`
- Nutzt `it.each()` für kompakte, datengetriebene Tests
- ~150+ Testfälle automatisch aus ~20 Datentabellen generiert
- Keine manuelle Interaktion nötig

## Betroffene Dateien
- `src/test/parameterized.test.ts` — neu erstellen

