

# Inline AHV-Edit bei Name-Mismatch in Eltern-Konsolidierung

## Problem
Wenn zwei Personen dieselbe AHV teilen aber unterschiedliche Namen haben (z.B. Michael vs Michaela Brunner), wird die Konsolidierung blockiert. Der Benutzer hat aktuell keine Möglichkeit, die fehlerhafte AHV direkt zu korrigieren — er müsste dafür die Validierungsansicht verlassen.

## Lösung
Bei `hasNameMismatch`-Gruppen einen Inline-Edit für die AHV-Nummer der betroffenen Zeilen anbieten, direkt unterhalb der Warnmeldung.

### Änderungen in `src/components/import/Step3Validation.tsx`

1. **State für AHV-Inline-Edit**: Neuen State `editingAhv` als `Map<string, string>` (Key: `row:column`, Value: neuer AHV-Wert) für aktive Inline-Edits.

2. **UI unter der Name-Mismatch-Warnung erweitern** (Zeile ~1625-1630):
   - Für jede betroffene Zeile mit AHV eine editierbare Zeile anzeigen:
     - Label: Kindername + Zeilennummer
     - Aktueller AHV-Wert als editierbares Input-Feld
     - "Speichern"-Button zum Anwenden der Korrektur
   - AHV-Spaltenname aus dem `prefix` ableiten (z.B. `P_ERZ1_AHV`)
   - Beim Speichern: `onErrorCorrect` aufrufen mit dem neuen AHV-Wert für die betroffene Zeile → die Validierung wird automatisch neu ausgelöst und der Mismatch verschwindet, wenn die AHV nun eindeutig ist

3. **Referenzzeile ebenfalls editierbar machen**: Falls die AHV der Referenzzeile falsch ist, auch dort einen Edit anbieten. Dazu `onErrorCorrect` direkt auf die Referenzzeile + AHV-Spalte aufrufen (auch wenn kein expliziter Fehler existiert, wird `setCorrectedRows` aktualisiert).

4. **Visuelle Gestaltung**: 
   - Input mit `font-mono` Styling, kleiner (text-xs)
   - Roter Rahmen wenn ungültig (AHV-Format prüfen)
   - Pencil-Icon als Edit-Trigger, bei Klick wird das Input sichtbar

