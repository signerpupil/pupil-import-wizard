

# Fix: "Schweizerdeutsch" wird fälschlich als "Schwedisch" korrigiert

## Problem

"Schweizerdeutsch" hat kein explizites Mapping. Bei der Sprach-Erkennung greift der **Prefix-Match (Schritt 3)**: Die ersten 5 Zeichen "schwe" matchen "schwedisch" → System schlägt "Schwedisch" vor. Das ist offensichtlich falsch — Schweizerdeutsch ist ein deutscher Dialekt.

Dasselbe Problem besteht potenziell für weitere Dialekte/Varianten wie "Berndeutsch", "Züridütsch", "Baseldeutsch" etc.

## Lösung

### 1. Explizite Mappings hinzufügen (`src/lib/fileParser.ts`, LANGUAGE_AUTO_CORRECTIONS)

Neue Einträge:
```
'Schweizerdeutsch': 'Deutsch',
'Schwyzerdütsch': 'Deutsch',
'Züridütsch': 'Deutsch',
'Berndeutsch': 'Deutsch',
'Baseldeutsch': 'Deutsch',
'Mundart': 'Deutsch',
'Dialekt': 'Deutsch',
'Schweizer Deutsch': 'Deutsch',
'Swiss German': 'Deutsch',
```

### 2. Prefix-Match verschärfen (`findSimilarLanguage`, Schritt 3)

Der aktuelle Prefix-Match mit nur 5 Zeichen ist zu aggressiv. Erhöhung der Mindestlänge des Prefix-Vergleichs — oder besser: Prefix-Match nur akzeptieren, wenn die Längendifferenz zwischen Eingabe und Match maximal 3 Zeichen beträgt. So wird "schweizerdeutsch" (16 Zeichen) nicht mehr auf "schwedisch" (10 Zeichen) gematcht.

### Betroffene Datei
- `src/lib/fileParser.ts` — Neue Einträge in `LANGUAGE_AUTO_CORRECTIONS` + robusterer Prefix-Match

