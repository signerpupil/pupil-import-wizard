

# Fix: Falsche Namenswarnung bei Elternpaar-Konsolidierung

## Befund

Bei der Tippkemper-Familie werden **"Unterschiedliche Namen erkannt"** angezeigt, obwohl es sich um korrekte Daten handelt. Der Grund:

**Pass 2** (Elternpaar-Matching) erzeugt Fehler für **beide** Elternteile (P_ERZ1_ID für Bernd, P_ERZ2_ID für Fabienne) unter dem gleichen Identifier `"Bernd Tippkemper & Fabienne Tippkemper"`. In der Konsolidierungsgruppe wird dann:

1. `referencePrefix` = `P_ERZ1_` (aus dem **ersten** Fehler der Gruppe)
2. Für **alle** affected rows wird der Name mit dem Reference-Prefix verglichen
3. Der affected-Row-Eintrag für P_ERZ2_ID liest aber den Namen über sein eigenes Prefix `P_ERZ2_` → **Fabienne**
4. Vergleich: Reference ERZ1 "Bernd" ≠ Affected ERZ2 "Fabienne" → **falscher Name-Mismatch**

## Lösung

### Datei: `src/components/import/Step3Validation.tsx` — Namensvergleich (Zeilen ~330-350)

Für jeden affected row den Vergleich **slot-korrekt** machen: Wenn der affected row's Column `P_ERZ2_ID` ist, gegen den Reference-Row's `P_ERZ2_`-Namen vergleichen, nicht gegen `P_ERZ1_`.

```typescript
// Für jeden affected row: den passenden Reference-Prefix bestimmen
const arPrefix = ar.column.replace(/_ID$/, '_');
// Vergleiche gegen den GLEICHEN Slot im Reference-Row
const refPrefixForThisRow = arPrefix; // statt immer tryPfx
const refVornameForRow = String(refRow[`${refPrefixForThisRow}Vorname`] ?? '').trim();
const refNameForRow = String(refRow[`${refPrefixForThisRow}Name`] ?? '').trim();
```

Statt alle affected rows gegen **einen festen** Reference-Prefix zu vergleichen, wird jeder affected row gegen den **korrespondierenden Slot** im Reference-Row verglichen. So wird Bernd mit Bernd und Fabienne mit Fabienne verglichen.

### Ergebnis

```text
Vorher:  "Unterschiedliche Namen erkannt" (Bernd ≠ Fabienne) → Konsolidierung blockiert
Nachher: Bernd=Bernd ✓, Fabienne=Fabienne ✓ → Konsolidierung möglich
```

