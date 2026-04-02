

## PLZ-Mapping Korrektur

### Problem
PLZ 8905 listet nur `['Arni AG']`, aber die Schweizerische Post ordnet PLZ 8905 auch **Islisberg** und **Arni-Islisberg** zu. Wenn ein Schüler "Islisberg" als Ort hat, wird fälschlicherweise ein Fehler gemeldet.

Dies ist wahrscheinlich ein systematisches Problem — viele PLZ im Datensatz könnten unvollständige Ortslisten haben.

### Lösung

**Datei: `src/lib/swissPlzData.ts`**

1. **PLZ 8905 korrigieren**:
   ```
   '8905': ['Arni AG', 'Islisberg', 'Arni-Islisberg'],
   ```

2. **Systematische Prüfung** der häufigsten fehlenden Varianten im Umkreis der bestehenden PLZ — insbesondere für PLZ im Kanton Aargau und Zürich, die oft mehrere Ortsteile abdecken. Dazu werde ich die offizielle Schweizer Post PLZ-Datenbank als Referenz verwenden und bekannte Mehrfach-Ort-PLZ ergänzen.

3. **Stichprobenartige Erweiterung** weiterer bekannter Fälle (z.B. PLZ mit Gemeindezusammenlegungen oder Doppelnamen), um zukünftige False Positives zu vermeiden.

### Umfang
- Nur `src/lib/swissPlzData.ts` wird geändert
- Keine Logik-Änderung nötig — `validatePlzOrt` und `getOrteForPlz` funktionieren korrekt mit Arrays

