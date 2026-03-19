

# Mapping-Audit: Ergebnisse und Korrekturen

## Gefundene Fehler

### KRITISCH: Zielwerte nicht in gültiger Liste vorhanden

Diese Mappings zeigen auf Werte, die **nicht** in `VALID_NATIONALITIES` existieren und daher bei der Validierung scheitern:

1. **`'RW': 'Ruanda'`** — Die gültige Liste hat `'Rwanda'` (nicht 'Ruanda')
2. **`'Ruanda-Urundi': 'Ruanda'`** — Gleicher Fehler, muss `'Rwanda'` sein
3. **`'KG': 'Kirgistan'`** — Die gültige Liste hat `'Kirgisistan'` (nicht 'Kirgistan')

### FEHLER: Sprach-Mappings überschreiben gültige BISTA-Werte (Dead Code)

4. **`'Mongolisch': 'Ostasiatische Sprachen'`** — 'Mongolisch' ist bereits ein gültiger BISTA-Wert. Das Mapping wird nie erreicht und ist irreführend. Entfernen.
5. **`'Tibetisch': 'Ostasiatische Sprachen'`** — 'Tibetisch' ist bereits ein gültiger BISTA-Wert. Gleiches Problem. Entfernen.

### FEHLER: Falsche linguistische Zuordnung

6. **`'Moldawisch': 'Übrige osteuropäische Sprachen'`** — Moldawisch ist linguistisch identisch mit Rumänisch. Korrekt: `'Rumänisch'`
7. **`'Romani'/'Romanes': 'Übrige osteuropäische Sprachen'`** — Romani ist eine indoarische Sprache (verwandt mit Hindi/Sanskrit). Korrekt: `'Indoarische und drawidische Sprachen'`

### FRAGWÜRDIG: Mehrdeutige historische Regionen

Diese Mappings sind vereinfachend, da sie Regionen abdecken, die mehrere heutige Staaten umfassen. Empfehlung: Beibehalten aber mit Kommentar versehen:

8. **`'Kurdistan': 'Irak'`** — Umfasst Teile von Irak, Türkei, Syrien, Iran
9. **`'Indochina': 'Vietnam'`** — Umfasst Vietnam, Laos, Kambodscha
10. **`'Französisch-Westafrika': 'Senegal'`** — Umfasste 8 Länder (Senegal war Verwaltungssitz)
11. **`'Französisch-Äquatorialafrika': 'Kongo (Republik)'`** — Umfasste 4 Länder

### HINWEIS: Korrekte aber ungewöhnliche Zuordnungen (verifiziert)

- `'Berberisch': 'Afrikanische Sprachen'` — Korrekt (Afroasiatische Sprachfamilie, Nordafrika)
- `'Estnisch': 'Andere nordeuropäische Sprachen'` — Korrekt (Finno-ugrisch, Nordeuropa)
- `'Kapverdisch': 'Portugiesisch'` — Korrekt (Portugiesisch-basiertes Kreol)
- `'Krio': 'Afrikanische Sprachen'` — Korrekt (Kreolsprache Sierra Leones)
- `'Santali': 'Indoarische und drawidische Sprachen'` — Akzeptabel (Munda-Sprache, aber BISTA fasst Südasien zusammen)

## Umsetzung

### Datei: `src/lib/fileParser.ts`

**3 Nationality-Fixes:**
- `'RW': 'Ruanda'` → `'RW': 'Rwanda'`
- `'Ruanda-Urundi': 'Ruanda'` → `'Ruanda-Urundi': 'Rwanda'`
- `'KG': 'Kirgistan'` → `'KG': 'Kirgisistan'`

**2 Sprach-Einträge entfernen (Dead Code):**
- `'Mongolisch': 'Ostasiatische Sprachen'` entfernen
- `'Tibetisch': 'Ostasiatische Sprachen'` entfernen (Zeile 493 im Phase-4-Block; Tibetisch bleibt als gültiger BISTA-Wert erhalten)

**2 Sprach-Zuordnungen korrigieren:**
- `'Moldawisch': 'Übrige osteuropäische Sprachen'` → `'Moldawisch': 'Rumänisch'`
- `'Romani': 'Übrige osteuropäische Sprachen'` → `'Romani': 'Indoarische und drawidische Sprachen'`
- `'Romanes': 'Übrige osteuropäische Sprachen'` → `'Romanes': 'Indoarische und drawidische Sprachen'`

**Kommentare bei mehrdeutigen Regionen hinzufügen:**
- Bei Kurdistan, Indochina, Französisch-Westafrika, Französisch-Äquatorialafrika erklärende Kommentare ergänzen

### Datei: `src/test/newRules.test.ts`

- Tests für die korrigierten Werte aktualisieren (Romani, Moldawisch)

