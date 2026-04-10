

## Unit-Tests für `findDuplicateEmails`

Neue Testdatei `src/test/lehrpersonenEmailCheck.test.ts` mit folgenden Szenarien:

1. **Duplikat erkannt** — gleiche E-Mail, verschiedene `L_ID`s → 1 Duplikat zurückgegeben
2. **Kein Duplikat bei gleicher Person** — gleiche E-Mail, gleiche `L_ID` → leeres Array
3. **Leere / null / "-" E-Mails ignoriert** → kein Duplikat
4. **Case-insensitive** — `A@B.ch` und `a@b.ch` als gleich erkannt
5. **Kreuz-Spalten-Duplikat** — E-Mail in `L_Privat_EMail` bei Person A, in `L_Schule_EMail` bei Person B
6. **Fallback auf Name+Vorname** wenn `L_ID` fehlt
7. **`getDuplicateEmailRowSet`** gibt korrekte Row-Indices zurück

