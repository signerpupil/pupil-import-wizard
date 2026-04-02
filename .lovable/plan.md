

# Fix: Referenz-Kind in Eltern-ID Konsolidierung anzeigen

## Problem

Die Konsolidierungsgruppe für Flandra Lataj zeigt nur **2 betroffene Kinder** (Jon Lataj, Aron Kryeziu), obwohl **3 Kinder** zur Familie gehören. Alea Lataj (Zeile 36) fehlt, weil sie die **Referenzzeile** ist — sie hat bereits die korrekte ID und erscheint daher nicht in der Fehlerliste.

Aus Nutzersicht ist das verwirrend: Man erwartet alle Kinder der Familie zu sehen, um den Kontext zu verstehen.

## Lösung

Das Referenz-Kind als zusätzlichen Kontext in der UI anzeigen — **nicht** als "betroffen", sondern als Bezugspunkt.

### Datei: `src/components/import/Step3Validation.tsx`

**1. Referenz-Kind-Name ermitteln (Zeile ~284-289)**
- Beim Aufbau der Gruppe den Schüler-Namen der Referenzzeile extrahieren (`referenceStudentName`)
- Dazu `getStudentNameForRow(referenceRow)` aufrufen und im Gruppen-Objekt speichern

**2. Interface erweitern (Zeile ~44-60)**
- `ParentIdInconsistencyGroup` um `referenceStudentName?: string` ergänzen

**3. UI-Anzeige anpassen (Zeile ~1648-1669)**
- Statt `"2 betroffene Kinder: Jon Lataj ✕, Aron Kryeziu ✕"` anzeigen:
  - `"3 Kinder in Familie: Alea Lataj ✓ (Referenz), Jon Lataj ✕, Aron Kryeziu ✕"`
- Zähler: `affectedRows.length + (referenceStudentName ? 1 : 0)` = Gesamtzahl Kinder
- Referenz-Kind wird mit grünem Häkchen (✓) statt rotem Kreuz dargestellt
- Label ändert sich von "betroffene Kinder" zu "Kinder in Familie"

**4. Summary-Zähler unverändert lassen**
- Die Batch-Zähler ("Betroffene Kinder" im Summary-Header) bleiben bei der Anzahl der **zu korrigierenden** Zeilen, da das die operative Kennzahl ist

### Ergebnis

```text
Vorher:  "2 betroffene Kinder: Jon Lataj ✕, Aron Kryeziu ✕"
Nachher: "3 Kinder in Familie: Alea Lataj ✓ (Referenz), Jon Lataj ✕, Aron Kryeziu ✕"
```

