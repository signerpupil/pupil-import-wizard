

# Diakritische Korrekturen deaktivieren

## Änderung

Die Funktion `checkDiacriticNameInconsistencies()` in `src/lib/fileParser.ts` wird komplett deaktiviert, indem der Aufruf in Zeile 2116-2117 auskommentiert bzw. entfernt wird.

### Betroffene Datei
- **`src/lib/fileParser.ts`** (Zeile ~2115-2117): Die zwei Zeilen entfernen/auskommentieren, die `checkDiacriticNameInconsistencies(rows)` aufrufen und die Ergebnisse in `errors` pushen.

Die Funktion selbst (`checkDiacriticNameInconsistencies`, Zeilen 1293-1351) kann bestehen bleiben (toter Code) oder ebenfalls entfernt werden — hat keinen Einfluss auf das Verhalten.

### Auswirkung
- Keine automatischen "Diakritische Korrektur"-Warnungen mehr (z.B. Leonard → Léonard, Chloe → Chloé)
- Alle anderen Validierungen (AHV, Eltern-ID, Namenswechsel etc.) bleiben unverändert

