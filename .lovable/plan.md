

# Automatische Sprach-Korrektur fuer S_Muttersprache

## Uebersicht
Werte in der Spalte "S_Muttersprache" (und "S_Umgangssprache"), die nicht in der offiziellen BISTA-Liste stehen, sollen automatisch in die korrekte BISTA-Sprache umgewandelt werden. Es wird eine explizite Zuordnungstabelle eingefuehrt, analog zur bestehenden Nationalitaeten-Auto-Korrektur.

## Zuordnungstabelle

| Eingabe | BISTA-Sprache |
|---|---|
| Tigrinya | Afrikanische Sprachen |
| Dari | Westasiatische Sprachen |
| Bangala | Indoarische und drawidische Sprachen |
| Detusch | Deutsch |
| Hindi | Indoarische und drawidische Sprachen |
| Kosovarisch | Albanisch |
| Farsi | Westasiatische Sprachen |
| Tagalog | Ostasiatische Sprachen |
| Malayalam | Indoarische und drawidische Sprachen |
| Indische Sprachen | Indoarische und drawidische Sprachen |
| Paschto | Westasiatische Sprachen |
| Urdu | Indoarische und drawidische Sprachen |
| Swahili | Afrikanische Sprachen |
| Amharisch | Afrikanische Sprachen |
| Nepalesisch | Indoarische und drawidische Sprachen |
| Slovakisch | Slowakisch |
| Bengalisch | Indoarische und drawidische Sprachen |
| Uigurisch | Westasiatische Sprachen |
| Litauisch | Uebrige osteuropaeische Sprachen |
| Paschtou | Westasiatische Sprachen |
| Persisch | Westasiatische Sprachen |
| Kantonesisch | Chinesisch |
| Mandarin | Chinesisch |

## Technische Aenderungen

### Datei: `src/lib/fileParser.ts`

1. **Neue Konstante `LANGUAGE_AUTO_CORRECTIONS`** (nach `BISTA_NORMALIZED`, ca. Zeile 201): Eine exportierte Map analog zu `NATIONALITY_AUTO_CORRECTIONS` mit allen 24 Zuordnungen (Duplikate wie "Paschto" werden nur einmal erfasst).

2. **Normalisierte Lookup-Map** `LANGUAGE_CORRECTIONS_NORMALIZED`: Case-insensitive Map fuer schnellen Zugriff, analog zu `NATIONALITY_CORRECTIONS_NORMALIZED`.

3. **`findSimilarLanguage` erweitern**: Vor der Prefix-Suche zuerst die Auto-Corrections-Map pruefen. Wenn ein Treffer gefunden wird, diesen zurueckgeben. So werden die definierten Zuordnungen immer bevorzugt.

### Datei: `src/lib/localBulkCorrections.ts`

Keine Aenderung noetig -- die bestehende `detectLanguagePattern`-Funktion erkennt bereits Fehler mit `correctedValue` und bietet Bulk-Fix an. Die neuen Auto-Corrections werden automatisch erkannt, da `findSimilarLanguage` das `correctedValue`-Feld im Validierungsfehler setzt.

