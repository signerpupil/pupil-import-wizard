

# Analyse: "Unterschiedliche Namen erkannt" bei vertauschten Eltern-Slots

## Ursache gefunden

Das Problem liegt im **Elternpaar-Matching (Pass 2)** in `fileParser.ts`. Es gibt drei Matching-Strategien:

1. **Pass 1 (AHV / Name+Strasse)**: Fehlermeldung enthält den Slot → `(Erziehungsberechtigte/r 2)` → Cross-Slot-Fix funktioniert ✓
2. **Pass 2 (Elternpaar, name_only)**: Fehlermeldung enthält **KEINEN Slot** nach der Zeilennummer → `referencePrefix` bleibt `undefined` → Fallback auf `prefix` → **falscher Slot wird verglichen** ✗
3. **Pass 3 (Einzelperson name_only)**: Enthält Slot → funktioniert ✓

Pass 1 blockiert Pass 2 normalerweise via `resolvedByHigherStrategy`. **Aber**: Wenn die Eltern an **unterschiedlichen Adressen** wohnen (oder keine Strasse angegeben ist), greift Pass 1 (Name+Strasse) NICHT, und Pass 2 (Elternpaar) wird zur primären Erkennung. Dessen Fehlermeldung hat kein Slot-Label → `referencePrefix` ist `undefined` → die `hasNameMismatch`-Prüfung vergleicht die **falschen Felder** (z.B. ERZ1 der Referenzzeile statt ERZ2).

Auch bei den vorliegenden Daten: obwohl die Adresse gleich ist, kann es sein, dass die Reihenfolge der Passes oder ein anderer Grund dazu führt, dass das Pair-Matching feuert.

## Lösung

### 1. Pass-2-Fehlermeldung um Slot-Label ergänzen (`fileParser.ts`, ~Zeile 1515)

Die Fehlermeldung des Elternpaar-Matchings bekommt ebenfalls den Slot-Hinweis:

```
// Vorher:
`...hat in Zeile ${existing.firstRow} die ID '${existingId}'...`

// Nachher:
`...hat in Zeile ${existing.firstRow} (${existingSlotLabel}) die ID '${existingId}'...`
```

Dazu muss der `parentPairMap`-Eintrag die Slot-Labels der ersten Zeile speichern (`erz1SlotLabel`, `erz2SlotLabel`), damit beim Fehler der korrekte Slot referenziert werden kann.

### 2. Robustere `hasNameMismatch`-Prüfung als Fallback (`Step3Validation.tsx`, ~Zeile 305-326)

Falls `referencePrefix` nicht extrahiert werden kann, **beide** Slot-Varianten durchprobieren:

```
// Wenn referencePrefix undefined:
// Versuche P_ERZ1_ und P_ERZ2_ als referencePrefix
// Wenn Name mit EINEM davon matcht → kein Mismatch
```

### Betroffene Dateien
- `src/lib/fileParser.ts` — Slot-Label in Pass-2-Fehlermeldung einfügen + NameOnlyEntry erweitern
- `src/components/import/Step3Validation.tsx` — Fallback-Logik bei fehlendem referencePrefix

