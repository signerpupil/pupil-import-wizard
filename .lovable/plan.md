

# Analyse: Eltern-ID Konsolidierung zeigt "alle gleich" trotz unterschiedlicher Eltern

## Gefundenes Problem

Der Feldvergleich ("Felder der Elternperson") in der Konsolidierungs-UI vergleicht nur die **betroffenen Zeilen** untereinander, aber **nicht die Referenzzeile** (die Zeile mit der "korrekten" ID). Wenn es nur 1 betroffene Zeile gibt, zeigt der Vergleich immer "alle gleich" — selbst wenn die Referenzzeile komplett andere Elterndaten hat (z.B. anderen Vornamen).

Das heisst: Wenn die `name_strasse`-Strategie zwei Einträge matcht (gleicher Nachname + gleicher Vorname + gleiche Strasse), und es nur 1 betroffene Zeile + 1 Referenzzeile gibt, können Unterschiede in ANDEREN Feldern (z.B. E-Mail, Telefon, Rolle) unsichtbar bleiben.

**Für das Vorname-Problem**: Die Erkennungslogik selbst kann verschiedene Vornamen bei "Mittlere Zuverlässigkeit" eigentlich NICHT matchen (der Key enthält den Vornamen). Das Problem liegt darin, dass die UI den Referenz-Eintrag nicht vergleicht und daher Unterschiede nicht sichtbar macht. Zusätzlich fehlt ein Sicherheitscheck, der die tatsächlichen Felddaten vor der Konsolidierung nochmals prüft.

## Lösung

### 1. Referenzzeile in den Vergleich einbeziehen (`Step3Validation.tsx`)

- Referenzzeilennummer aus der Fehlermeldung extrahieren (`hat in Zeile (\d+)`) und in `ParentIdInconsistencyGroup` speichern
- `getParentFieldComparison` erweitern: Referenzzeile als ersten Eintrag in den Vergleich aufnehmen
- UI: Referenzzeile als "Referenz (Zeile X)" in der linken Karte anzeigen

### 2. Sicherheitscheck für kritische Felder (`Step3Validation.tsx`)

- Vor der Konsolidierung prüfen, ob **Vorname** und **Nachname** zwischen Referenzzeile und betroffenen Zeilen übereinstimmen
- Bei Abweichung im Vornamen: 
  - Konsolidierung **blockieren** (Button deaktiviert)
  - Prominente Warnung anzeigen: "Unterschiedliche Vornamen erkannt — keine automatische Konsolidierung möglich"
  - Nur "Ignorieren" erlauben

### 3. "Alle konsolidieren" Batch-Aktion absichern

- Gruppen mit Vorname-Abweichung automatisch aus der Batch-Aktion ausschliessen
- Badge-Hinweis im Header: "X Gruppen übersprungen (Namensunterschied)"

### 4. Erkennungslogik absichern (`fileParser.ts`)

- In der `name_strasse`-Strategie nach dem Map-Lookup einen **Post-Check** einbauen: Vorname des aktuellen Eintrags gegen den gespeicherten Vorname vergleichen (redundant, aber als Sicherheitsnetz)
- `ParentEntry`-Typ um `vorname` und `name` Felder erweitern, damit der Vergleich möglich ist

### Betroffene Dateien

- `src/components/import/Step3Validation.tsx` — Referenzzeile extrahieren, Feldvergleich erweitern, Sicherheitscheck, Batch-Absicherung
- `src/lib/fileParser.ts` — `ParentEntry` erweitern, Post-Check in `addError`

