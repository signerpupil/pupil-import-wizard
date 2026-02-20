
## Analyse: Was wird korrekt gespeichert?

### Aktueller Stand

Das Korrektur-Gedächtnis basiert auf `CorrectionRule`-Objekten mit dem Matching-Prinzip: "Wenn Spalte X den Wert Y hat, ersetze ihn durch Z". Diese Regeln werden in Step 4 aus dem `changeLog` gebaut.

**Gespeichert werden:**
- Manuelle Einzelkorrekturen (type: `manual`) → Ja
- Bulk-Korrekturen inkl. Eltern-ID-Konsolidierung (type: `bulk`) → Ja, aber mit Einschränkungen
- Muster-Auto-Fixes (type: `bulk`) → Ja

**Probleme beim aktuellen Speichern:**

1. **Eltern-ID-Konsolidierung**: Die Regel lautet z. B. `P_ERZ1_ID: "20408" → "20406"`. Das funktioniert beim nächsten Import – aber nur für exakt dieselbe numerische ID. Da Eltern-IDs in der Regel stabil sind (eine Person hat immer dieselbe falsche ID), ist das tatsächlich sinnvoll und korrekt.

2. **Namenswechsel "Ignorieren"**: `dismissParentGroup` setzt currentId → currentId (gleicher Wert). Das erzeugt eine Regel die nichts tut und ist wertlos als gespeicherte Regel.

3. **changeLog-Einträge ohne "originalValue ≠ newValue"**: Wenn `dismissParentGroup` oder "Ignorieren" beim Namenswechsel gerufen wird, wird `originalValue === newValue` → solche Einträge sollten herausgefiltert werden.

4. **`matchType` immer `exact`**: In Step 4, Zeile 100, werden alle Regeln mit `matchType: 'exact'` gebaut – auch wenn es sinnvoller wäre, Eltern-ID-Korrekturen mit einem Identifier (AHV) zu binden. Das ist aber eine erweiterte Verbesserung.

### Konkrete Fixes

**Fix 1: changeLog-Einträge filtern wo `originalValue === newValue`**

In `Step4Preview.tsx` Zeile 94:
```ts
.filter(entry => (entry.type === 'manual' || entry.type === 'bulk') && entry.originalValue !== entry.newValue)
```
→ Verhindert wertlose "keine Änderung"-Regeln im Korrektur-Gedächtnis.

**Fix 2: `dismissParentGroup` und "Ignorieren" beim Namenswechsel nicht in den changeLog schreiben**

In `Step3Validation.tsx`: Die `dismissParentGroup`-Funktion ruft `onBulkCorrect` mit `currentId → currentId` auf. Stattdessen sollen "ignorierte" Einträge (wo keine echte Änderung stattfindet) gar nicht erst in den `changeLog` geschrieben werden.

Lösung: Ein neuer optionaler Parameter `onIgnore` (separater Callback der keine Regel erzeugt), oder einfach prüfen ob `originalValue !== newValue` bevor `changeLog` befüllt wird – was bereits in `Index.tsx` in `handleBulkCorrect` passiert:

```ts
if (originalValue !== c.value) {
  setChangeLog(...)
}
```

→ Das ist **bereits korrekt implementiert**! `handleBulkCorrect` in `Index.tsx` prüft bereits `originalValue !== c.value`. Dismiss-Aktionen, die den Wert gleich lassen, erzeugen also keinen `changeLog`-Eintrag.

### Fazit: Was wirklich fehlt

Nach genauer Prüfung funktioniert die Hauptlogik korrekt. Die einzige echte Lücke:

**In `Step4Preview.tsx` Zeile 94 fehlt der Filter `entry.originalValue !== entry.newValue`** als Sicherheitsnetz, falls doch mal ein unveränderter Eintrag in den changeLog gelangt.

**Zusätzlich**: Die `auto`-Korrekturen (Korrektur-Gedächtnis Wiedereinspielen von vorherigen Regeln) werden **nicht** als neue Regeln gespeichert. Das macht Sinn – sie wurden ja aus bestehenden Regeln angewendet. Aber Muster-Auto-Fixes (z. B. Telefonnummer-Format) werden mit `'bulk'` markiert und **werden** gespeichert, was korrekt ist.

### Technische Änderung

**Datei:** `src/components/import/Step4Preview.tsx`

Zeile 94, Filter erweitern:
```ts
// Vorher
.filter(entry => entry.type === 'manual' || entry.type === 'bulk')

// Nachher  
.filter(entry => (entry.type === 'manual' || entry.type === 'bulk') && entry.originalValue !== entry.newValue)
```

Das ist der einzige echte Fix. Die restliche Logik (Eltern-IDs speichern, Muster-Fixes speichern, Dedup in `allRules`) funktioniert bereits korrekt.
