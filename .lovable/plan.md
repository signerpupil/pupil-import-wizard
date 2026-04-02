

# Fix: Cross-Slot Elternvergleich verwendet falschen Prefix

## Problem

Die Eltern-ID Konsolidierung nutzt einen **einheitlichen Pool** über ERZ1 und ERZ2, um auch Slot-Wechsel zu erkennen (z.B. Person ist in Zeile 36 als ERZ2 und in Zeile 50 als ERZ1 erfasst). Das ist korrekt.

**Der Bug:** Die UI verwendet immer den Prefix der **Fehlerspalte** (z.B. `P_ERZ1_`) für alle Zeilen — auch für die Referenzzeile. Wenn die Referenzzeile die Person aber als **ERZ2** hat, werden die falschen Elternfelder verglichen (ERZ1 statt ERZ2 der Referenzzeile).

**Konkret im Screenshot:** Flandra Lataj ist in der betroffenen Zeile (Ion) als ERZ1 erfasst, aber in der Referenzzeile (Zeile 36, Alea) als ERZ2. Die UI zieht aber `P_ERZ1_Name/Vorname` aus Zeile 36 — das ist **Esat Kryeziu** (der andere Elternteil). Deshalb zeigt der Vergleich "unterschiedliche Namen" obwohl es dieselbe Person ist.

## Lösung

### 1. Referenz-Slot aus Fehlermeldung extrahieren
Die Fehlermeldung enthält bereits den Slot: `"hat in Zeile 36 (Erziehungsberechtigte/r 2)"`. Daraus den Referenz-Prefix ableiten (ERZ1 oder ERZ2).

### 2. Interface erweitern
`ParentIdInconsistencyGroup` um `referencePrefix?: string` ergänzen (z.B. `"P_ERZ2_"`), damit die UI weiss, in welchem Slot die Person in der Referenzzeile steht.

### 3. Gruppierungscode anpassen (Zeile ~270)
- Regex: `hat in Zeile (\d+) \(Erziehungsberechtigte\/r (\d)\)` → Slot-Nummer extrahieren
- `referencePrefix = P_ERZ${slotNum}_`

### 4. `hasNameMismatch` korrigieren (Zeile ~300-318)
- Für die Referenzzeile `referencePrefix` statt `prefix` verwenden, um die richtigen Felder zu lesen

### 5. `parentName`/`parentAddress` korrigieren (Zeile ~286-297)
- Wenn `referenceRow` bekannt: Name/Adresse aus der Referenzzeile mit dem korrekten `referencePrefix` lesen (statt aus der betroffenen Zeile)

### 6. `getParentFieldComparison` anpassen (Zeile ~354-430)
- Neuen Parameter `referencePrefix?: string` akzeptieren
- Für die Referenzzeile `referencePrefix` statt `prefix` zum Lesen der Felder verwenden
- Alle Aufrufe (Zeile ~1717, ~1762) den neuen Parameter übergeben

### Betroffene Datei
- `src/components/import/Step3Validation.tsx` — 6 punktuelle Änderungen

