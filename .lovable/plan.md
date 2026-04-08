

## Schüler-Deduplizierung: Gleiche Person, verschiedene S_IDs erkennen

### Problem
Wenn ein Schüler in der Primarschule und Oberstufe unterschiedliche `S_ID`-Werte hat, erkennt das System dies aktuell nicht. Die Person erscheint doppelt im Export.

### Lösung
Eine neue Erkennungsfunktion `checkStudentIdDuplicates` in `fileParser.ts`, die Schüler anhand von **S_AHV** oder **Name+Vorname+Geburtsdatum** als identisch erkennt und eine Warnung mit Zusammenführungsvorschlag erzeugt. Dazu eine neue UI-Karte `StudentDeduplicationCard` in Step 3, die diese Fälle gruppiert anzeigt und eine Bulk-Korrektur (ID vereinheitlichen) ermöglicht.

### Änderungen

**1. `src/types/importTypes.ts`** — Neuen Error-Typ hinzufügen
- `type` um `'student_duplicate_id'` erweitern in der `ValidationError`-Definition (Zeile 36)

**2. `src/lib/fileParser.ts`** — Erkennungslogik
- Neue Funktion `checkStudentIdDuplicates(rows)`:
  - **Strategie 1 (AHV):** Gruppiert Zeilen mit gleicher `S_AHV` aber unterschiedlicher `S_ID` → Fehler mit `type: 'student_duplicate_id'`
  - **Strategie 2 (Name+Vorname+Geburtsdatum):** Normalisiert `S_Name` + `S_Vorname` + `S_Geburtsdatum`, gruppiert und prüft auf verschiedene `S_ID`
  - Beide Strategien erzeugen Warnungen mit Info, welche IDs betroffen sind und welche ID als "korrekt" vorgeschlagen wird (z.B. die häufigste oder erste)
- Aufruf in `validateData()` nach den bestehenden Checks (nach Zeile ~2259)

**3. `src/components/import/StudentDeduplicationCard.tsx`** — Neue UI-Komponente
- Filtert Errors mit `type === 'student_duplicate_id'`
- Gruppiert nach Identifikator (AHV oder Name+Gebdat)
- Zeigt pro Gruppe: Schülername, die verschiedenen S_IDs, Zeilen, Erkennungsmethode
- Button "Alle vereinheitlichen" → setzt alle S_IDs in der Gruppe auf die vorgeschlagene ID via `onBulkCorrect`
- Design analog zu `SiblingInconsistencyCard` / `IdConflictBatchCard`

**4. `src/components/import/Step3Validation.tsx`** — Integration
- Import der neuen `StudentDeduplicationCard`
- Einbau zwischen `SiblingInconsistencyCard` und `Eltern-ID Konsolidierung` (nach Zeile ~1463)
- `student_duplicate_id`-Errors aus der allgemeinen Fehlertabelle ausfiltern (Zeile ~1188, analog zu `id_conflict`)

### Keine weiteren Änderungen
Es werden ausschliesslich die oben genannten 4 Dateien bearbeitet. Bestehende Logik (Parent-ID-Konsolidierung, ID-Konflikte, Geschwister-Checks etc.) bleibt unverändert.

