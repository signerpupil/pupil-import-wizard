

# Regel-Verbesserungen aus Test-Analyse

## Gefundene Probleme

### 1. BISTA-Sprachliste: Fehlende Einträge (Bug)
`LANGUAGE_AUTO_CORRECTIONS` mappt auf Werte, die **nicht** in `VALID_BISTA_LANGUAGES` existieren:
- `'Übrige süd- und südostasiatische Sprachen'` — fehlt (verwendet von: Singalesisch, Singhalesisch, Birmanisch, Burmesisch, Khmer)
- `'Übrige westasiatische Sprachen'` — fehlt (verwendet von: Usbekisch, Uzbekisch, Hebräisch)

**Folge**: Nach Auto-Korrektur wird der korrigierte Wert erneut als ungültig erkannt → Endlos-Korrektur-Schleife. Der parameterized Test kaschiert dies mit `|| expected.length > 0` Fallback (Zeile 241).

**Fix**: Beide Sprachen zu `VALID_BISTA_LANGUAGES` hinzufügen.

### 2. Clean-Data-Test erzeugt ungültige AHVs (Test-Bug)
Der "50 clean rows"-Test generiert AHVs wie `756.80000.0001.40` (5 Ziffern in der zweiten Gruppe statt 4). Der Test filtert AHV-Fehler nachträglich heraus, was den Zweck des Tests untergräbt.

**Fix**: AHV-Generierung im Test korrigieren, sodass gültige Prüfsummen erzeugt werden.

### 3. `formatName` ignoriert Namenszusätze
`'von der Mühle'` → `null` (keine Korrektur, weil mixed case). Aber `'VON DER MÜHLE'` → `'Von Der Mühle'` (falsch — `von`, `de`, `van` sollten klein bleiben).

**Fix**: Noble Präfixe (`von`, `van`, `de`, `del`, `della`, `di`, `da`, `le`, `la`, `el`, `al`) bei der Proper-Case-Konvertierung klein lassen.

### 4. Placeholder-ID `99999` zu aggressiv
5-stellige IDs wie `99999` können in grösseren Schulverwaltungssystemen legitim sein. 

**Fix**: `99999` aus der Platzhalter-Liste entfernen; stattdessen nur offensichtliche Platzhalter behalten (`0`, `00`, `000`, `0000`, `NULL`, `N/A`, `TBD`, `XXX`, `-1`).

### 5. `formatEmail` — fehlende Typo-Korrekturen
Häufige Schweizer Tippfehler fehlen noch:
- `@gmal.com` → `@gmail.com`
- `@outloo.com` → `@outlook.com`
- `@hitmail.com` → `@hotmail.com`
- `@bluwin.ch` → `@bluewin.ch`
- `@protonmial.ch` → `@protonmail.ch`

### 6. `isValidDate` — Zukunftsdatum-Warnung fehlt
Geburtsdaten in der Zukunft (z.B. `01.01.2030`) werden akzeptiert. Eine Warnung wäre sinnvoll, da dies fast immer ein Fehler ist.

### 7. Parameterized Test-Verbesserungen
- BISTA-Mapping-Test strenger machen (Fallback entfernen)
- Clean-Data-Test mit gültigen AHV-Prüfsummen
- Test für `formatName` mit Namenszusätzen ergänzen

---

## Änderungen

### `src/lib/fileParser.ts`
- 2 fehlende Sprachen zu `VALID_BISTA_LANGUAGES` hinzufügen
- `99999` aus `checkPlaceholderIds` entfernen
- Optional: Zukunftsdatum-Warnung in `validateFieldType` für `date`

### `src/lib/formatters.ts`
- `formatName`: Noble Präfixe klein lassen
- `formatEmail`: 5 weitere Typo-Korrekturen

### `src/test/parameterized.test.ts`
- BISTA-Test Fallback entfernen (strenger)
- AHV-Generierung in Clean-Data-Test fixen
- Noble-Prefix-Tests ergänzen
- Neue Email-Typo-Tests

