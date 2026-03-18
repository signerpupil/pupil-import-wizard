

# Folgefehler verhindern — Analyse & Plan

## Problemanalyse

Fehler werden **einmalig bei der Validierung** berechnet (in `fileParser.ts`) und bleiben danach als statische Liste im State. Wenn Korrekturen angewendet werden (z.B. ID-Konflikte lösen, Eltern-IDs konsolidieren), ändern sich die `rows`-Daten — aber die **Fehlerliste wird nicht neu berechnet**. Das erzeugt "Folgefehler", die nicht mehr aktuell sind.

### Betroffene Folgefehler-Typen

| Fehlertyp | Ursache | Wird stale nach... |
|---|---|---|
| **Geschwister-Inkonsistenz** | Gleiche Eltern-ID, unterschiedliche PLZ/Ort | ID-Konflikt oder Eltern-ID Konsolidierung ändert Gruppierung |
| **Inkonsistente ID (Eltern)** | Gleicher Elternteil, verschiedene IDs | Konsolidierung setzt alle IDs gleich |
| **PLZ↔Ort Mismatch** | PLZ passt nicht zum Ort | Geschwister-Korrektur ändert PLZ oder Ort |
| **Duplikat** | Gleiche S_ID in mehreren Zeilen | ID-Konflikt-Auflösung ändert die ID |

### Aktuelle Situation

- **Geschwister-Inkonsistenz**: ✅ Bereits mit `isSiblingInconsistencyStillOpen()` gefiltert (prüft `rows` live)
- **Alle anderen Typen**: ❌ Keine Live-Prüfung — stale Fehler bleiben sichtbar

## Lösung: Generischer `isErrorStillValid`-Filter

Statt für jeden Fehlertyp einen separaten Filter zu bauen, wird `isSiblingInconsistencyStillOpen` zu einem **generischen `isErrorStillValid`-Filter** erweitert, der alle relevanten Folgefehler gegen die aktuellen `rows`-Daten prüft.

### Prüflogik pro Fehlertyp

1. **Inkonsistente ID (Eltern-Konsolidierung)**: Prüfe ob die beiden referenzierten Zeilen tatsächlich noch unterschiedliche IDs haben
2. **ID-Konflikt**: Prüfe ob der Wert in der aktuellen Zeile noch identisch mit dem Konflikt-Wert ist
3. **Duplikat**: Prüfe ob der Wert in der aktuellen Zeile noch identisch mit dem Original-Duplikat-Wert ist
4. **PLZ↔Ort Mismatch**: Prüfe ob PLZ und Ort der aktuellen Zeile noch die gemeldete Kombination haben
5. **Geschwister-Inkonsistenz**: Bestehende Logik (bereits implementiert)

### Betroffene Datei

- **Edit**: `src/components/import/Step3Validation.tsx` — `isSiblingInconsistencyStillOpen` wird zu `isErrorStillValid` refactored und um die zusätzlichen Typen erweitert. Wird in `uncorrectedErrors` eingesetzt (gleiche Stelle wie bisher).

### Technische Details

```text
isErrorStillValid(error):
  1. Geschwister-Inkonsistenz → bestehende Logik (rows-basiert)
  2. Inkonsistente ID → parse Zeile aus Message, prüfe ob rows[error.row-1][error.column] noch error.value ist
  3. ID-Konflikt → prüfe ob rows[error.row-1][error.column] noch error.value ist
  4. Duplikat → prüfe ob rows[error.row-1][error.column] noch error.value ist
  5. PLZ↔Ort → prüfe ob rows[error.row-1][ortCol] noch error.value ist
  6. Alle anderen → true (immer anzeigen)
```

Die zentrale Idee: **Wenn der Wert in der aktuellen Zeile nicht mehr dem Fehlerwert entspricht, ist der Fehler stale und wird ausgeblendet.** Das deckt alle Folgefehler ab, die durch Bulk-Korrekturen entstehen.

