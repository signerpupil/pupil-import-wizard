

## Analyse der Fehler

Die gemeldeten Fehler fallen in **4 Kategorien**:

### 1. Nationalität: Adjektivformen fehlen (15 Fehler)
"Schweizer", "Schweizerin", "Deutsch", "deutsch" sind Adjektivformen der Nationalität, die weder in `VALID_NATIONALITIES` noch in `NATIONALITY_AUTO_CORRECTIONS` enthalten sind.

**Fix:** Mappings in `src/lib/fileParser.ts` hinzufügen:
- `'Schweizer' → 'Schweiz'`
- `'Schweizerin' → 'Schweiz'`
- `'Deutsch' → 'Deutschland'`
- `'deutsch' → 'Deutschland'` (case-insensitive bereits, aber explizit)

### 2. Nationalität: Doppelbürgerschaft mit Slash (4 Fehler)
"Schweiz/Deutsch", "Schweiz / Panama", "Schweiz / Portugal", "Schweiz / Italien" — das System kennt keine Dual-Nationalitäten mit `/`.

**Fix:** Logik in `findNationalityCorrection` erweitern: Wenn ein Wert `/` enthält, beide Teile separat validieren/korrigieren und als `"Land1 / Land2"` zusammensetzen. Automatische Korrektur nur, wenn beide Teile sicher aufgelöst werden können.

### 3. E-Mail: Platzhalter-Werte (3 Fehler)
"Keine", "-", "verstorben 2021" sind keine gültigen E-Mails, sondern Platzhalter. Das System behandelt sie als Validierungsfehler statt sie stillschweigend zu leeren.

**Fix:** E-Mail-Platzhalter-Erkennung in `validateFieldByType` (case `'email'`): Bekannte Platzhalter wie "Keine", "-", "verstorben", "n/a" automatisch leeren und als Auto-Korrektur behandeln (analog zur Sprach-Platzhalter-Logik).

### 4. Mobilnummer zu lang / Leere Pflichtfelder (3 Fehler)
- "S_Mobil" und "P_ERZ1_Mobil" zu lang → Liegt an der Formatierung (bereits von `formatSwissPhone` abgedeckt, aber die Korrektur greift möglicherweise nicht vor der Validierung)
- "K_Name" und "L_KL1_ID" leer → Korrekt erkannt, keine Code-Änderung nötig (echte Datenfehler)

---

## Änderungen

### Datei: `src/lib/fileParser.ts`

1. **Adjektiv-Nationalitäten** zu `NATIONALITY_AUTO_CORRECTIONS` hinzufügen:
   ```
   'Schweizer': 'Schweiz',
   'Schweizerin': 'Schweiz', 
   'Schweizerisch': 'Schweiz',
   'Deutsch': 'Deutschland',
   'Französisch': 'Frankreich',
   'Italienisch': 'Italien',
   'Österreichisch': 'Österreich',
   'Türkisch': 'Türkiye',
   'Spanisch': 'Spanien',
   'Portugiesisch': 'Portugal',
   'Britisch': 'Vereinigtes Königreich',
   'Amerikanisch': 'Vereinigte Staaten von Amerika',
   ```
   (Gängige Adjektivformen für CH-Schulen)

2. **Dual-Nationalität-Logik** in `findNationalityCorrection`: Vor dem Fuzzy-Match prüfen, ob der Wert `/` enthält. Falls ja, beide Hälften trimmen und einzeln durch `isValidNationality` + `findNationalityCorrection` schicken. Wenn beide aufgelöst werden können, als `"Land1 / Land2"` zurückgeben mit `matchType: 'explicit'`.

3. **E-Mail-Platzhalter** in `validateFieldByType` (case `'email'`): Vor der Regex-Prüfung eine Liste bekannter Platzhalter testen (`keine`, `-`, `verstorben`, `n/a`, `nicht vorhanden`, `unbekannt`). Bei Treffer: `correctedValue: ''` zurückgeben mit Severity `'warning'` und Hinweismeldung.

4. **Mobilnummer-Längenproblem**: Prüfen, ob die automatische Telefon-Korrektur greift bevor die Längenvalidierung läuft. Falls nicht, die Reihenfolge anpassen oder die Längenprüfung nach Korrektur erneut ausführen.

