
Problem erkannt: Die zwei verbleibenden Konflikte sind sehr wahrscheinlich keine reinen Anzeigezahlen, sondern echte ID-Konflikt-Gruppen, die nach dem Klick auf „auflösen“ weiterhin als offen gelten.

Warum das passiert
- ID-Konflikte werden im Parser nur für die späteren Vorkommen erzeugt (Zeilen 2..n), nicht für die erste Referenzzeile.
- Die Konflikt-Analyse rekonstruiert diese erste Referenzzeile zusätzlich aus der Fehlermeldung („wird in Zeile X … verwendet“) und nimmt sie in `resolvableRows` auf.
- Beim Anwenden der Korrektur markiert `handleBulkCorrect` aber nur vorhandene Fehler als `correctedValue`, also nur Zeilen, für die es tatsächlich einen `ValidationError` gibt.
- Wenn die automatisch zu ändernde Zeile ausgerechnet diese Referenz-/Erstzeile ist, wird zwar der Datenwert geändert, aber kein Fehlerobjekt als korrigiert markiert.
- Folge: `analyzeIdConflicts()` sieht weiterhin offene `id_conflict`-Fehler und baut die Gruppe erneut auf. Deshalb bleiben am Schluss typischerweise 2 Konflikte sichtbar.

Umsetzung
1. ID-Konflikt-Analyse robust machen
- In `src/lib/idConflictAnalysis.ts` die Konfliktgruppen nicht mehr auf Basis der Zeilen aus der Fehlermeldung aufbauen.
- Stattdessen:
  - unkorrektierte `id_conflict`-Fehler nach `column + value` sammeln
  - alle Zeilen in `rows` durchsuchen, deren aktueller Feldwert noch diesem Konfliktwert entspricht
  - daraus die beteiligten Personen/Gruppen bilden
- Vorteil: Nach einer Korrektur verschwindet die betroffene Zeile sofort aus der Gruppe, auch wenn sie nie ein eigenes Fehlerobjekt hatte.

2. Auflösungslogik an aktuelle Daten koppeln
- `resolvableRows` und `suggestedReplacements` nur aus den aktuell noch konfliktträchtigen Zeilen ableiten.
- Damit stimmt die Anzeige immer mit `correctedRows` überein, nicht mit veralteten Fehlerreferenzen.

3. UI-Zähler konsistent halten
- `IdConflictBatchCard` kann grundsätzlich bleiben, aber die Detailanzeige und Counts sollen ausschließlich aus den neu berechneten Gruppen kommen.
- Dadurch verschwinden Badge, Statistik und „Details anzeigen“-Zahl gleichzeitig.

4. Tests ergänzen
- In `src/test/idConflictAnalysis.test.ts` einen Fall ergänzen, bei dem:
  - die „erste“ Zeile diejenige ist, die eine neue ID bekommen soll
  - nach simulierter Änderung im `rows`-Array bei unveränderten Fehlerobjekten keine Konfliktgruppe mehr entsteht
- Zusätzlich ein Test für den Placeholder-Fall mit mehreren Personen, damit die Gruppen nach Teil-/Vollkorrektur sauber neu berechnet werden.

Erwartetes Ergebnis
- Nach „Alle 2 auflösen“ bleibt nicht mehr dauerhaft „2 Konflikte“ stehen.
- Konfliktkarten verschwinden sofort, sobald die zugrunde liegenden Datenwerte geändert wurden.
- Die Restanzeige entspricht wirklich offenen Konflikten, nicht historischen Fehlerobjekten.

Technische Details
```text
Heute:
errors (historisch) -> analyzeIdConflicts -> Gruppe bleibt offen
          \
           \__ erste Referenzzeile hat oft keinen eigenen Error

Neu:
errors (nur als Konfliktschlüssel)
+ rows (aktueller Zustand)
-> finde alle Zeilen mit demselben aktuellen ID-Wert
-> bilde Personen und offene Gruppen daraus
```

Betroffene Dateien
- `src/lib/idConflictAnalysis.ts`
- `src/test/idConflictAnalysis.test.ts`

Validierung nach Umsetzung
- CSV mit den aktuell reproduzierbaren 2 Restkonflikten erneut importieren
- „Alle auflösen“ klicken
- prüfen, dass Karte, Badge, Statistik und Progress danach konsistent sind
