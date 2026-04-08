

## Schüler-Eltern ID-Überschneidung erkennen

### Problem
Eine `S_ID` kann identisch mit einer `P_ERZ1_ID` oder `P_ERZ2_ID` sein. Das ist normalerweise ein Fehler (falsche ID vergeben), kann aber bei mehrjährigen Imports korrekt sein (ehemaliger Schüler ist jetzt Elternteil).

### Bestehende Checks
- `checkStudentIsParent`: Prüft nur **innerhalb derselben Zeile**, ob `S_AHV == P_ERZ_AHV` (Schüler ist eigener Erziehungsberechtigter).
- Es gibt **keinen zeilenübergreifenden Check** für `S_ID == P_ERZ_ID`.

### Lösung
Eine neue Prüfung `checkStudentParentIdOverlap`, die alle `S_ID`-Werte mit allen `P_ERZ1_ID`/`P_ERZ2_ID`-Werten abgleicht. Treffer werden als **Warnung** (nicht Fehler) gemeldet, da es im Mehrjahres-Szenario korrekt sein kann. Die UI zeigt die betroffenen Zeilen mit Kontext (Schüler-Name, Eltern-Name, Alter wenn verfügbar), damit der Benutzer entscheiden kann.

### Änderungen

**1. `src/types/importTypes.ts`** — Neuen Error-Typ
- `type` um `'student_parent_id_overlap'` erweitern

**2. `src/lib/fileParser.ts`** — Erkennungslogik
- Neue Funktion `checkStudentParentIdOverlap(rows)`:
  - Sammelt alle `S_ID → Zeilen-Indizes` in eine Map
  - Iteriert über alle Zeilen, prüft ob `P_ERZ1_ID` oder `P_ERZ2_ID` in der S_ID-Map vorkommt
  - **Ausschluss**: Gleiche Zeile (bereits durch `checkStudentIsParent` abgedeckt)
  - Erzeugt Warnungen mit: betroffene IDs, Schüler-Name und Eltern-Name, Zeilennummern
  - Heuristik: Wenn Geburtsdaten vorhanden und Altersunterschied plausibel (>14 Jahre), wird ein Hinweis "Möglicherweise ehemaliger Schüler → Elternteil" angezeigt
- Aufruf in `validateData()` nach `checkStudentIsParent`

**3. `src/components/import/StudentParentOverlapCard.tsx`** — Neue UI-Komponente
- Zeigt Gruppen von überlappenden IDs mit Schüler- und Eltern-Kontext
- Pro Gruppe: beteiligte Zeilen, Namen, Geburtsdaten (falls vorhanden)
- Zwei Aktionen pro Gruppe:
  - **"Korrekt (ehem. Schüler)"** → Warnung als resolved markieren (ignorieren)
  - **"ID korrigieren"** → Inline-Edit oder Suffix-Vorschlag für die Eltern-ID
- "Alle als korrekt markieren"-Button für den Mehrjahres-Fall

**4. `src/components/import/Step3Validation.tsx`** — Integration
- Import und Einbau der neuen `StudentParentOverlapCard`
- `student_parent_id_overlap`-Errors aus der Haupttabelle filtern

### Keine weiteren Änderungen
Bestehende Logik (Eltern-ID Konsolidierung, Schüler-Deduplizierung, ID-Konflikte etc.) bleibt unverändert.

