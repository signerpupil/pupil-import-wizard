

# Fix: 34 fehlschlagende Nationalitäts-Tests in parameterized.test.ts

## Problem

`NATIONALITY_AUTO_CORRECTIONS` enthält ~34 Einträge, bei denen der Schlüssel **identisch** mit einem Eintrag in `VALID_NATIONALITIES` ist (z.B. `'Iran': 'Iran'`, `'Sudan': 'Sudan'`, `'Portugal': 'Portugal'`, `'Liechtenstein': 'Liechtenstein'`, `'Chile': 'Chile'`, etc.).

Da `isValidNationality()` für diese Werte `true` zurückgibt, wird die Korrektur-Logik übersprungen → kein Error/keine `correctedValue` → Test erwartet `natErrors.length === 1`, bekommt aber `0`.

## Lösung

**Entferne die redundanten Einträge** aus `NATIONALITY_AUTO_CORRECTIONS` in `src/lib/fileParser.ts`.

Einträge wo `key === value` UND `key` bereits in `VALID_NATIONALITIES` ist, sind sinnlos — sie würden nie ausgelöst. Konkret betrifft das alle Selbst-Mappings wie:

```
'Iran': 'Iran',
'Sudan': 'Sudan', 
'Ghana': 'Ghana',
'Nigeria': 'Nigeria',
'Senegal': 'Senegal',
'China': 'China',
'Japan': 'Japan',
'Thailand': 'Thailand',
'Vietnam': 'Vietnam',
'Myanmar': 'Myanmar',
'Nepal': 'Nepal',
'Sri Lanka': 'Sri Lanka',
'Bangladesh': 'Bangladesh',
'Pakistan': 'Pakistan',
'Afghanistan': 'Afghanistan',
'Chile': 'Chile',
'Peru': 'Peru',
'Venezuela': 'Venezuela',
'Ecuador': 'Ecuador',
'Honduras': 'Honduras',
'Guatemala': 'Guatemala',
'El Salvador': 'El Salvador',
'Nicaragua': 'Nicaragua',
'Panama': 'Panama',
'Costa Rica': 'Costa Rica',
'Haiti': 'Haiti',
'Paraguay': 'Paraguay',
'Uruguay': 'Uruguay',
'Ukraine': 'Ukraine',
'Portugal': 'Portugal',
'Liechtenstein': 'Liechtenstein',
```

### Datei: `src/lib/fileParser.ts`

- Alle Einträge in `NATIONALITY_AUTO_CORRECTIONS` entfernen, bei denen `key === value` und der key bereits in `VALID_NATIONALITIES` enthalten ist
- Die englischen Varianten die auf **andere** Werte mappen bleiben erhalten (z.B. `'Germany': 'Deutschland'`)

### Kein Funktionsverlust

Diese Einträge haben **nie funktioniert** — `isValidNationality()` hat sie immer als gültig erkannt und die Korrektur übersprungen. Das Entfernen ändert also kein Laufzeitverhalten, bereinigt nur die Datenstruktur und lässt die Tests bestehen.

