# LP-Zuweisung vereinfachen: Daten aus den Stammdaten-Importen übernehmen

## Ziel
Schritt 2 der LP-Klassenzuweisung soll ohne manuelle PUPIL-Exporte auskommen. Lehrpersonen und Klassen werden – wenn vorhanden – automatisch aus den bereits bereinigten Stammdaten-Importen übernommen; alternativ kann die bereinigte Datei hochgeladen und automatisch erkannt werden.

## Ausgangslage
- Schritt 2 verlangt heute zwei separate Uploads: eine "Personen-PUPIL"-Datei (Spalten Nachname/Vorname/Schlüssel) und eine PUPIL-Klassendatei (Spalte Klassenname).
- Die bereinigte Datei aus "Stammdaten Lehrpersonen" enthält bereits LID (= PUPIL-Schlüssel), Name und Vorname.
- Der bereinigte Export aus "Stammdaten SuS und EZB" enthält K_Name und K_Schulhaus_Name; in PUPIL entsteht daraus der Klassenname "K_Name K_Schulhaus_Name" (z. B. "B1a Oberstufenzentrum Test").
- Es gibt aktuell keinen aktiven Zwischenspeicher: Ein IndexedDB-Store ist vorhanden, wird aber nirgends genutzt. Nach Verlassen eines Wizards sind die Daten weg.

## Umsetzung

### 1. Lokaler Zwischenspeicher für abgeschlossene Importe
Ein kleiner lokaler Speicher (IndexedDB, wie bisher rein im Browser, keine Datenübertragung) hält nach einem Stammdaten-Import zwei kompakte Ergebnisse:
- Lehrpersonen: Nachname, Vorname, Schlüssel (LID)
- Klassen: zusammengesetzter Klassenname aus K_Name + K_Schulhaus_Name (Duplikate entfernt)

Gespeichert wird beim Erreichen des Export-Schritts. Kein Roh- oder Personendatensatz darüber hinaus; ein "Zwischenspeicher löschen"-Hinweis im jeweiligen Schritt.

### 2. Automatische Übernahme in Schritt "LP zuordnen"
Sind zwischengespeicherte Daten vorhanden, zeigt Schritt 2 statt der Upload-Karten je eine Übernahme-Karte:
- "X Lehrpersonen aus Ihrem Stammdaten-Lehrpersonen-Import übernehmen" (Quelle + Datum)
- "Y Klassen aus Ihrem SuS-Import übernehmen"
Ein Klick übernimmt die Daten; danach läuft das bestehende Namens- und Klassen-Matching unverändert weiter. Ein Link "Stattdessen Datei hochladen" blendet den bisherigen Upload wieder ein.

### 3. Formaterkennung beim Upload
Der Upload akzeptiert zusätzlich zu den bisherigen Spalten:
- Lehrpersonen: "LID" als Schlüssel, "Name" als Nachname (bereinigter LP-Export)
- Klassen: "K_Name" + "K_Schulhaus_Name" → zusammengesetzter Klassenname; "Klassenname" weiterhin unterstützt
Erkannt wird automatisch anhand der Kopfzeile; die Fehlermeldung nennt neu beide akzeptierten Formate.

### 4. Vereinfachte Darstellung
- Bereits zugeordnete Lehrpersonen/Klassen werden zu einer Zusammenfassungszeile eingeklappt; die Detailtabellen zeigen standardmässig nur die offenen Fälle.
- Die Anleitungen zu den PUPIL-Exporten bleiben, sind aber eingeklappt, da sie nur noch im Fallback nötig sind.

## Technische Details
- Neu: `src/lib/importHandoff.ts` – IndexedDB-Store (`pupil-import-wizard`, neuer Store `handoff`) mit `saveTeachers()`, `saveClasses()`, `getHandoff()`, `clearHandoff()`; Datum + Herkunft als Metadaten.
- `StammdatenLehrpersonenImportWizard.tsx`: beim Erreichen des Export-Schritts LP-Liste (LID/Name/Vorname) speichern.
- `src/pages/Index.tsx` bzw. `Step4Preview`: beim Erreichen von Schritt 4 für `schueler` die Klassenliste aus K_Name/K_Schulhaus_Name ableiten und speichern.
- `LPStep2Teachers.tsx`: Handoff laden, Übernahme-Karten, Fallback-Upload, erweiterte Header-Erkennung im Parser (`nachname|name|LID|schlüssel|klassenname|K_Name`).
- Bestehende Typen `PupilPerson` / `PupilClass` bleiben unverändert; Matching-Logik wird nicht angefasst.
- Tests: Header-Erkennung der bereinigten Exporte und Klassennamen-Zusammensetzung als Unit-Tests.
