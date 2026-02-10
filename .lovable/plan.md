

## Problem

Die Eltern-ID Konsistenzprüfung erkennt den Fall nicht, weil sie **ERZ1 und ERZ2 getrennt prüft**. Wenn dieselbe Person (z.B. "Bolt Nina") in einer Zeile als ERZ1 und in einer anderen als ERZ2 erfasst ist, wird die Inkonsistenz nicht erkannt.

Im konkreten Beispiel:
- Zeile 1: Bolt Nina als **ERZ2** mit ID `399423`
- Zeile 2: Bolt Nina als **ERZ2** mit ID `399423abc`

Zusätzlich könnte es auch vorkommen, dass dieselbe Person einmal als ERZ1 und einmal als ERZ2 aufgeführt ist -- auch das wird aktuell nicht erkannt.

## Lösung

Die Konsistenzprüfung wird so erweitert, dass **alle Eltern-Slots (ERZ1 + ERZ2) in einem einzigen, gemeinsamen Pool** verglichen werden. So werden Inkonsistenzen erkannt, egal in welchem Slot die Person steht.

## Technische Umsetzung

### 1. `checkParentIdConsistency` in `src/lib/fileParser.ts` anpassen

Statt zwei separate Durchläufe (einen für ERZ1, einen für ERZ2) wird ein **einziger, slot-übergreifender Pool** für die Matching-Maps (AHV, Name+Strasse, Name) verwendet.

Ablauf:
- Für jede Zeile werden **beide** ERZ-Slots ausgelesen
- Jeder gefundene Elternteil wird in die gemeinsamen Maps eingetragen
- Wenn derselbe Elternteil (via AHV oder Name) mit unterschiedlicher ID gefunden wird, wird ein Fehler generiert -- unabhängig davon, ob er als ERZ1 oder ERZ2 erfasst ist

### 2. Test erweitern in `src/test/duplicateMerging.test.ts`

Neuer Testfall: Derselbe Elternteil erscheint in zwei Zeilen in verschiedenen ERZ-Slots (z.B. ERZ1 in Zeile 1, ERZ2 in Zeile 2) mit unterschiedlichen IDs -- muss als Inkonsistenz erkannt werden.

### 3. Bestehende Tests beibehalten

Alle bestehenden Tests für die Konsistenzprüfung bleiben bestehen und müssen weiterhin bestanden werden.

