
## Neue Prüfung: BISTA-Sprachcodes für S_Muttersprache und S_Umgangssprache

### Problem & Lösung

Die Felder `S_Muttersprache` und `S_Umgangssprache` werden derzeit nur auf Pflichtfeld geprüft, aber nicht auf gültige BISTA-Sprachbezeichnungen. Jede beliebige Zeichenkette wird akzeptiert – z.B. "Englisch und Spanisch", "Englsh" (Tippfehler) oder "English" (falsche Sprache).

Die Lösung integriert sich nahtlos in das bestehende Validierungssystem: ein neuer `validationType: 'language'` in den Spaltendefinitionen, eine `checkLanguageValidity`-Funktion in `fileParser.ts`, und eine optionale Ähnlichkeitssuche für häufige Tippfehler (z.B. "Englsh" → "Englisch").

---

### BISTA-Sprachliste (49 gültige Werte)

Die vollständige Liste wird als Konstante `VALID_BISTA_LANGUAGES` in `fileParser.ts` hinterlegt:

```
Afrikanische Sprachen, Albanisch, Andere nordeuropäische Sprachen,
Andere westeuropäische Sprachen, Arabisch, Armenisch, Bosnisch,
Bulgarisch, Chinesisch, Dänisch, Deutsch, Englisch, Finnisch,
Französisch, Griechisch, Indoarische und drawidische Sprachen,
Italienisch, Japanisch, Koreanisch, Kroatisch, Kurdisch,
Mazedonisch, Mongolisch, Montenegrinisch, nicht definiert,
Niederländisch, Norwegisch, Ostasiatische Sprachen, Polnisch,
Portugiesisch, Rätoromanisch, Rumänisch, Russisch, Schwedisch,
Serbisch, Serbo-Kroatisch, Slowakisch, Slowenisch, Spanisch,
Tamil, Thai, Tibetisch, Tschechisch, Türkisch,
Übrige osteuropäische Sprachen, Übrige slawische Sprachen,
Ukrainisch, Ungarisch, Vietnamesisch, Westasiatische Sprachen
```

---

### Benutzerführung & Fehlermeldungen

Die Validierung unterscheidet drei Fälle:

**Fall 1 – Exakter Treffer:** Kein Fehler.

**Fall 2 – Ähnlicher Treffer (Tippfehler / falscher Case):**
- Erkennung per Normalisierung (lowercase, Leerzeichen-Trim)
- Fehlermeldung: `"Englsh" ist keine gültige BISTA-Sprache. Meinten Sie "Englisch"?`
- Severity: `warning` (gelb)
- `correctedValue` wird automatisch gesetzt → Auto-Fix-Button erscheint im UI

**Fall 3 – Kein Treffer:**
- Fehlermeldung: `"English" ist keine gültige BISTA-Sprache. Gültige Werte: Englisch, Französisch, Deutsch, ...`
- Severity: `error` (rot)
- Keine Auto-Korrektur möglich, manuelle Auswahl nötig

---

### Technische Umsetzung

#### Datei 1: `src/types/importTypes.ts`

**Änderung 1 – neuer validationType:**
```ts
validationType?: 'date' | 'ahv' | 'email' | 'number' | 'text' | 'plz' | 'gender' | 'phone' | 'language';
```

**Änderung 2 – Spalten-Definitionen für S_Muttersprache und S_Umgangssprache:**
```ts
{ name: 'S_Muttersprache', required: false, category: 'Schüler', validationType: 'language' },
{ name: 'S_Umgangssprache', required: false, category: 'Schüler', validationType: 'language' },
```

#### Datei 2: `src/lib/fileParser.ts`

**Änderung 1 – BISTA-Konstante** (nach den bestehenden Konstanten, ca. Zeile 183):
```ts
export const VALID_BISTA_LANGUAGES = new Set([
  'Afrikanische Sprachen', 'Albanisch', 'Andere nordeuropäische Sprachen',
  'Andere westeuropäische Sprachen', 'Arabisch', 'Armenisch', 'Bosnisch',
  'Bulgarisch', 'Chinesisch', 'Dänisch', 'Deutsch', 'Englisch', 'Finnisch',
  'Französisch', 'Griechisch', 'Indoarische und drawidische Sprachen',
  'Italienisch', 'Japanisch', 'Koreanisch', 'Kroatisch', 'Kurdisch',
  'Mazedonisch', 'Mongolisch', 'Montenegrinisch', 'nicht definiert',
  'Niederländisch', 'Norwegisch', 'Ostasiatische Sprachen', 'Polnisch',
  'Portugiesisch', 'Rätoromanisch', 'Rumänisch', 'Russisch', 'Schwedisch',
  'Serbisch', 'Serbo-Kroatisch', 'Slowakisch', 'Slowenisch', 'Spanisch',
  'Tamil', 'Thai', 'Tibetisch', 'Tschechisch', 'Türkisch',
  'Übrige osteuropäische Sprachen', 'Übrige slawische Sprachen',
  'Ukrainisch', 'Ungarisch', 'Vietnamesisch', 'Westasiatische Sprachen',
]);

// Normalisierte Lookup-Map für Ähnlichkeitssuche
const BISTA_NORMALIZED = new Map(
  [...VALID_BISTA_LANGUAGES].map(lang => [lang.toLowerCase().trim(), lang])
);
```

**Änderung 2 – isValidLanguage + findSimilarLanguage:**
```ts
function isValidLanguage(value: string): boolean {
  return VALID_BISTA_LANGUAGES.has(value.trim());
}

function findSimilarLanguage(value: string): string | null {
  const normalized = value.toLowerCase().trim();
  // Exact match via normalized
  if (BISTA_NORMALIZED.has(normalized)) return BISTA_NORMALIZED.get(normalized)!;
  // Partial prefix match (first 5 chars)
  if (normalized.length >= 5) {
    for (const [key, lang] of BISTA_NORMALIZED) {
      if (key.startsWith(normalized.slice(0, 5)) || normalized.startsWith(key.slice(0, 5))) {
        return lang;
      }
    }
  }
  return null;
}
```

**Änderung 3 – validateFieldType switch, neuer 'language' case:**
```ts
case 'language':
  if (!isValidLanguage(value)) {
    const similar = findSimilarLanguage(value);
    return {
      row: rowNum,
      column: columnName,
      value,
      message: similar
        ? `"${value}" ist keine gültige BISTA-Sprache. Meinten Sie "${similar}"?`
        : `"${value}" ist keine gültige BISTA-Sprache (kein BISTA-Code vorhanden)`,
      type: 'format',
      severity: similar ? 'warning' : 'error',
      correctedValue: similar ?? undefined,
    };
  }
  break;
```

#### Datei 3: `src/workers/validationWorker.ts`

Die Sprach-Validierung läuft bereits im `validateData`-Flow des Workers via `formatRules`. Da die Haupt-Prüfung aber in `fileParser.ts`/`validateFieldType` liegt (nicht im Worker), ist hier **keine Änderung nötig** – der Worker kennt keine `validationType: 'language'` und muss das auch nicht, da die fileParser-Logik die primäre Validierung übernimmt.

#### Datei 4: `src/lib/localBulkCorrections.ts`

Für Auto-Fix via Mustererkennung: eine neue `detectLanguagePattern`-Funktion die `correctedValue`-Fehler erkennt (d.h. Fehler die bereits eine Korrektur haben – also Tippfehler-Matches) und als Gruppe zusammenfasst:

```ts
function detectLanguagePattern(index: ErrorIndex): PatternGroup[] {
  const languageColumns = ['S_Muttersprache', 'S_Umgangssprache'];
  // ... wie detectGenderPattern, aber für language
}
```

Diese erscheint dann in Step 3 unter "Muster erkannt" mit dem Label "BISTA-Sprache" und einem Wort-Icon.

---

### Testdaten für test-stammdaten.csv

Es werden 4–5 neue Zeilen am Ende der Testdatei angehängt:

| S_ID | S_Muttersprache | S_Umgangssprache | Erwartet |
|------|-----------------|------------------|----------|
| 10300 | Englisch | Deutsch | Kein Fehler |
| 10301 | Englsh | Deutsch | Warning + Auto-Fix → "Englisch" |
| 10302 | English | Englisch | Error (kein BISTA-Code, kein Ähnlichkeits-Treffer) |
| 10303 | Spanisch | Türkisch | Kein Fehler |
| 10304 | Arabisch | Berberdialekt | Error (kein BISTA-Code für "Berberdialekt") |

---

### Zusammenfassung der Änderungen

| Datei | Änderung | Priorität |
|---|---|---|
| `src/types/importTypes.ts` | `validationType: 'language'` hinzufügen + Spalten-Definitionen aktualisieren | Kritisch |
| `src/lib/fileParser.ts` | `VALID_BISTA_LANGUAGES`, `isValidLanguage`, `findSimilarLanguage`, neuer `case 'language'` in `validateFieldType` | Kritisch |
| `src/lib/localBulkCorrections.ts` | `detectLanguagePattern` für Auto-Fix-Anzeige in Step 3 | Mittel |
| `public/test-stammdaten.csv` | 5 neue Testzeilen für Sprach-Validierung | Niedrig |

Keine Änderungen an UI-Komponenten nötig – die neuen Fehler erscheinen automatisch in der bestehenden Fehlertabelle in Step 3, und Auto-Fixes (Tippfehler-Korrekturen) werden automatisch in der Muster-Erkennung angezeigt.
