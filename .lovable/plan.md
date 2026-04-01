

# Fix: Eltern-Konsolidierung – gleiche Kindernamen & fehlender Referenz-Vergleich

## Gefundene Probleme

### 1. Tooltip zeigt falsche Referenzzeile
Zeile 1568: `Aus Zeile {group.affectedRows[0]?.row}` zeigt die erste **betroffene** Zeile statt die **Referenzzeile** (`group.referenceRow`). Die Referenzzeile ist der Eintrag mit der "korrekten" ID.

### 2. "betroffene Kinder" zeigt identische Namen
Wenn derselbe Schüler in mehreren Zeilen vorkommt (z.B. Duplikate), wird `getStudentNameForRow()` für beide Zeilen denselben Namen zurückgeben: "Sarina Khushy ✕, Sarina Khushy ✕". Es fehlt eine Unterscheidung durch Zeilennummer.

### 3. "alle gleich" trotz unterschiedlicher Daten
Die Referenzzeile wird zwar im Code via `group.referenceRow` extrahiert, aber in der Feldvergleichs-Berechnung (`getParentFieldComparison`) nur einbezogen, wenn `referenceRow != null`. Falls die Regex-Extraktion fehlschlägt oder der Wert `undefined` ist, werden nur die betroffenen Zeilen verglichen — die naturgemäss identisch sind (selber Elternteil, selbes Kind).

## Lösung

### Datei: `src/components/import/Step3Validation.tsx`

**Fix 1 – Tooltip korrigieren (Zeile 1568, 1572):**
- `group.affectedRows[0]?.row` → `group.referenceRow ?? group.affectedRows[0]?.row`

**Fix 2 – Kindernamen disambiguieren (Zeile 1579-1588):**
- Bei doppelten Kindernamen Zeilennummer anhängen: "Sarina Khushy (Z. 515)" statt nur "Sarina Khushy"
- Logik: Prüfe ob `studentName` in der Liste mehr als einmal vorkommt → wenn ja, `(Z. {row})` anhängen

**Fix 3 – Aktueller-Stand-Einträge disambiguieren (Zeile 1673-1680):**
- Gleiche Logik für die Einträge in "Aktueller Stand" und "Nach Konsolidierung": bei identischen Schülernamen Zeilennummer ergänzen

**Fix 4 – Referenzzeile als Fallback sichern:**
- Falls `referenceRow` undefiniert ist (Regex-Match fehlgeschlagen), als Fallback die `correctId` nutzen, um in `rows` nach der Referenzzeile zu suchen: erste Zeile finden, deren `[column]`-Wert === `correctId`
- So ist die Referenzzeile immer im Vergleich enthalten

## Betroffene Datei
- `src/components/import/Step3Validation.tsx` — 4 punktuelle Änderungen

