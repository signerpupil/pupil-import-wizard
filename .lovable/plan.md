
# CSV-Testdaten reparieren: Spaltenverschiebungen und fehlende Spalte

## Identifizierte Probleme

### 1. Fehlende Spalte `S_Nationalitaet`
Die Spalte `S_Nationalitaet` fehlt komplett im Header und in allen Datenzeilen. Laut `importTypes.ts` gehoert sie nach `S_Umgangssprache`. Ohne diese Spalte koennen Nationalitaets-Validierungen nicht getestet werden.

### 2. Systematische Spaltenverschiebung bei fehlendem ERZ2
**Betroffen: ca. 70 Zeilen** (alle Zeilen ohne zweiten Erziehungsberechtigten)

Das ERZ2-Feld umfasst 8 Positionen (P_ERZ2_ID bis P_ERZ2_TelefonPrivat). Bei leeren ERZ2-Daten sind aber nur 7 Semikola statt 8 vorhanden. Dadurch rutscht `K_Name` (Klassenname) eine Position nach links in das Feld `P_ERZ2_TelefonPrivat`, und `L_KL1_Vorname` (letzte Spalte) fehlt komplett.

**Beispiel (Zeile 52 - aktuell falsch):**
```
...079 111 00 11;;;;;;;6B;756.3012...;30012;Egli;Thomas
                 ^^^^^^^                              ^
                 7 leer (statt 8)                     L_KL1_Vorname fehlt
```

**Korrektur:**
```
...079 111 00 11;;;;;;;;6B;756.3012...;30012;Egli;Thomas
                 ^^^^^^^^
                 8 leer (korrekt)
```

### 3. Zeile 157 (Alleinerziehend Mia): Schwere Verschiebung
Diese Zeile hat keinen ERZ1, aber einen ERZ2. Die ERZ1-Felder (9 Positionen: P_ERZ1_ID bis P_ERZ1_Mobil) sind aber nur mit 4 leeren Feldern gefuellt statt 9. Dadurch ist die gesamte ERZ2- und Klassenstruktur verschoben, und die Zeile hat 36 statt 35 Felder.

### 4. Zeile 156 (Alleinerziehend Milo): Kein ERZ1 und kein ERZ2
Braucht leere Felder fuer beide ERZ-Bloecke (9 + 8 = 17 leere Felder), hat aber zu wenige.

## Geplante Aenderungen

### Datei: `public/test-stammdaten.csv`

1. **Header erweitern**: `S_Nationalitaet` als neue Spalte nach `S_Umgangssprache` einfuegen (Position 14, alle folgenden Spalten verschieben sich um +1 auf 36 Spalten total)

2. **Alle Datenzeilen**: Leeres Feld fuer `S_Nationalitaet` einfuegen (nach S_Umgangssprache). Fuer die Sprach-Testdaten (Zeilen 158-162) und einige regulaere Zeilen sinnvolle Nationalitaeten eintragen (z.B. "Schweiz", "Deutschland", "Türkei" fuer Testfaelle)

3. **~70 Zeilen mit leerem ERZ2**: Ein zusaetzliches Semikolon einfuegen, damit das ERZ2-Feld korrekt 8 leere Positionen hat

4. **Zeilen 156-157**: ERZ1/ERZ2-Felder vollstaendig korrigieren mit korrekter Anzahl leerer Felder

5. **Nationalitaets-Testdaten hinzufuegen**: Einige Zeilen erhalten bewusst fehlerhafte Nationalitaeten (z.B. "Kongo", "Türkei") fuer die Validierung, und korrekte wie "Schweiz", "Deutschland" fuer positive Tests

### Zusammenfassung

| Was | Anzahl betroffene Zeilen |
|---|---|
| Header: +1 Spalte (S_Nationalitaet) | 1 |
| Alle Datenzeilen: +1 Feld (Nationalitaet) | 161 |
| ERZ2-Verschiebung korrigieren (+1 Semikolon) | ~70 |
| Schwere Verschiebung reparieren (Alleinerziehend) | 2 |
| Nationalitaets-Testdaten einfuegen | ~15 |
