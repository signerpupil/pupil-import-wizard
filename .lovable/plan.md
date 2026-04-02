

# Fix: Eltern-ID Konsolidierung vereint Kinder nicht über ERZ-Slots hinweg

## Problem

Wenn derselbe Elternteil bei verschiedenen Kindern in **unterschiedlichen ERZ-Slots** erscheint (z.B. Flandra Lataj ist ERZ2 bei Alea, ERZ1 bei Jon, ERZ2 bei Aron), werden diese als **separate Gruppen** behandelt. Der Gruppierungsschlüssel `${error.column}:${identifier}` trennt nach Spalte (P_ERZ1_ID vs P_ERZ2_ID), obwohl es sich um denselben Elternteil handelt.

**Konkretes Beispiel aus den Daten:**
- Alea Lataj → ERZ2 = Flandra Lataj (ID: MM1KH49CIGNB4606) — **Referenz**
- Jon Lataj → ERZ1 = Flandra Lataj (ID: MMYJG3JER8OA5197) — Fehler auf `P_ERZ1_ID`
- Aron Kryeziu → ERZ2 = Flandra Lataj (ID: MMNGD28GK0DR7163) — Fehler auf `P_ERZ2_ID`

→ Statt einer Gruppe "Flandra Lataj – 2 betroffene Kinder" gibt es zwei separate Gruppen mit je 1 Kind.

## Lösung

### Datei: `src/components/import/Step3Validation.tsx`

**Änderung: Gruppierung nach Eltern-Identität statt nach Spalte**

Den Gruppierungsschlüssel von `${error.column}:${identifier}` auf nur `${identifier}` ändern (oder genauer: den normalisierten Elternteil-Identifier). Dadurch werden alle Fehler für denselben Elternteil — unabhängig davon, ob sie in P_ERZ1_ID oder P_ERZ2_ID auftreten — in **einer einzigen Gruppe** zusammengefasst.

Konkret:
1. **Gruppierungsschlüssel** (Zeile 250): Nur den `identifier` verwenden, nicht `error.column` einbeziehen
2. **Spalte pro Zeile speichern**: Da die betroffenen Zeilen unterschiedliche Spalten haben können (P_ERZ1_ID vs P_ERZ2_ID), muss die `column`-Information in die `affectedRows`-Einträge verschoben werden statt auf Gruppenebene
3. **`ParentIdInconsistencyGroup` Interface anpassen**: `column` wird optional auf Gruppenebene (oder ein Array), und jede `affectedRow` bekommt ein eigenes `column`-Feld
4. **Konsolidierung anpassen**: `applyBulkParentIdCorrection` und der Details-View müssen pro Zeile die korrekte Spalte verwenden (nicht eine globale column pro Gruppe)

### Interface-Änderung

```text
ParentIdInconsistencyGroup.affectedRows[]:
  + column: string  // z.B. "P_ERZ1_ID" oder "P_ERZ2_ID" — pro Zeile

ParentIdInconsistencyGroup:
  column → wird zum "primären" column der Referenz (für Display)
```

### Betroffene Stellen

- **Gruppierung** (Zeile 230-358): Neuer Schlüssel + column pro affectedRow
- **Konsolidierung** (Zeile 513-541): `onBulkCorrect` muss pro Zeile die richtige Spalte nehmen
- **Dismiss** (Zeile 366-380): Gleiches Prinzip
- **Detail-Rendering** (IdConflictBatchCard oder inline): Zeigt an, dass Slot-Wechsel vorliegt
- **Name-Mismatch-Check** (Zeile 306-341): Muss beide Prefixes pro affectedRow berücksichtigen

