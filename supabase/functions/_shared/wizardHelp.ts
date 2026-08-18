// Vollständige Wissensbasis der Hilfe- & FAQ-Seite des PUPIL Import Wizards (/docs).
// Muss synchron gehalten werden mit src/pages/Documentation.tsx.

export const WIZARD_HELP_BLOCK = `

--- WISSENSBASIS: HILFE & FAQ DES PUPIL IMPORT WIZARDS (/docs) ---
Diese Inhalte stammen 1:1 aus der Hilfe- & Dokumentationsseite des Import Wizards. Bei Fragen zum Import Wizard (Stammdaten, Gruppenzuweisungen, LP-Zuweisungen, Validierung, Korrektur-Gedächtnis, Export) antworte auf Basis dieser Angaben und erfinde keine zusätzlichen Regeln.

ÜBERSICHT
Der PUPIL Import Wizard bereitet Daten aus LehrerOffice für den Import nach PUPIL auf. Die gesamte Verarbeitung läuft lokal im Browser – Daten verlassen den Computer nicht.
Drei Import-Typen:
- Stammdaten (SuS/EZB und Lehrpersonen): validieren und exportieren; Korrektur-Gedächtnis verfügbar.
- Gruppenzuweisungen: manuelle Gruppen aus LehrerOffice erfassen und Schüler:innen zuweisen.
- LP-Klassenzuweisungen: Lehrpersonen Klassen und Fächern der Stundentafel zuweisen.
Allgemeiner Ablauf (5 Schritte): 0 Import-Typ und Modus wählen · 1 Datei hochladen (CSV/Excel aus LehrerOffice) · 2 Spalten prüfen · 3 Daten validieren und korrigieren · 4 Export (Datei herunterladen, Korrekturen speichern).

STAMMDATEN-IMPORT
Vorbereitung in LehrerOffice: «Daten exportieren» → Format CSV oder Excel (.xlsx) → Pflichtfelder enthalten → Datei speichern.
Pflichtfelder: S_AHV, S_ID, S_Name, S_Vorname, S_Geschlecht, S_Geburtsdatum, K_Name.

Validierungsregeln:
1. Feldformate: AHV = 756.XXXX.XXXX.XX (13 Ziffern, Start 756); Datum = DD.MM.YYYY, YYYY-MM-DD, DD/MM/YYYY oder Excel-Seriennummer; Geschlecht = M, W, D (inkl. Varianten männlich/weiblich/divers/male/female); PLZ = 4–5 Ziffern; E-Mail = Standardformat; Telefon = +41…, 0041…, 07X… (7–15 Ziffern); Zahl = numerisch.
2. Pflichtfelder dürfen nicht leer sein.
3. Duplikat-Erkennung auf S_AHV und S_ID (mit Angabe der ersten Fundzeile). Eltern-Felder (P_ERZ1_ID, P_ERZ2_ID, P_ERZ1_AHV, P_ERZ2_AHV) lösen keine Duplikat-Warnung aus, da Geschwister dieselben Eltern haben.
3b. ID-Konflikt-Erkennung: verschiedene Personen mit derselben ID, unterschieden über Name + Vorname. Geprüft: S_ID, S_AHV, P_ERZ1_ID, P_ERZ1_AHV, P_ERZ2_ID, P_ERZ2_AHV. Auflösungsmuster: Platzhalter-IDs («0», «999», «-1», «test», «neu») → automatisch neue ID {ID}_D01; Mehrheitsregel → Mehrheit behält Original-ID, Minderheit erhält {ID}_D01; sonst manuelle Entscheidung. Ungelöste ID-Konflikte blockieren die Zusammenführung.
4. Eltern-ID-Konsolidierung mit drei Strategien: gleiche AHV-Nummer (hohe Zuverlässigkeit, Fehler bei abweichenden IDs); Name + Vorname + Strasse (mittlere Zuverlässigkeit); Name + Vorname beider Elternteile (tiefe Zuverlässigkeit, nur Warnung; bei unterschiedlicher Adresse Disambiguierung über Telefonnummer bzw. gleichen anderen Elternteil). Diakritische Unterschiede werden normalisiert, Konflikte nicht doppelt gemeldet.
5. Diakritische Namenskorrektur: bei «Müller» vs. «Muller» wird die Variante mit mehr diakritischen Zeichen gewählt. Betrifft S_Name, S_Vorname, P_ERZ1_Name/-Vorname, P_ERZ2_Name/-Vorname, L_KL1_Name/-Vorname.
6. Namenswechsel-Erkennung bei Eltern (gleicher Vorname, anderer Nachname): Bindestrich-Ergänzung («Ianuzi» → «Ianuzi-Tadic»), umgekehrter Doppelname («Brunner» → «Fliege-Brunner»), vollständiger Namenswechsel bei ≥65% Ähnlichkeit, unsicherer Fuzzy-Match ab 55% bei kurzen Namen (≤5 Zeichen). Nur Warnungen, keine automatischen Korrekturen.
7. Sprach- und Nationalitäten-Validierung: S_Muttersprache und S_Umgangssprache gegen die offizielle BISTA-Codeliste (91 Werte, z. B. 1101 Schweizerdeutsch, 410 Tigrinya, 4313 Dari); nicht gelistete Sprachen werden gemappt («Zulu» → «Andere afrikanische Sprachen», «Mundart» → «Schweizerdeutsch»), Tippfehler per Präfix-Matching. S_Nationalitaet gegen offizielle Länderliste; veraltete Bezeichnungen werden korrigiert («Türkei» → «Türkiye», «Mazedonien» → «Nordmazedonien»). Alle Mappings sind auf der Hilfeseite als Excel herunterladbar.
8. AHV-Prüfziffer nach EAN-13 – ungültige Prüfziffer ergibt eine Warnung, keinen Fehler.
9. Geschwister-Konsistenz: Kinder mit derselben Eltern-ID werden auf abweichende S_PLZ und S_Ort geprüft (Warnung).
10. PLZ↔Ort-Prüfung gegen lokale Schweizer PLZ-Datenbank (S_PLZ↔S_Ort, P_ERZ1_PLZ↔P_ERZ1_Ort, P_ERZ2_PLZ↔P_ERZ2_Ort), Abweichung = Warnung.
11. Altersplausibilität: S_Geburtsdatum muss ein Alter zwischen 4 und 20 Jahren ergeben (Warnung).
12. Automatische Sammelkorrekturen: AHV-Format, Telefon-Format (+41 XX XXX XX XX), E-Mail-Bereinigung (Leerzeichen, gmial→gmail, doppelte Punkte, Umlaute), PLZ-Format, Geschlecht-Normalisierung, Namen-Kapitalisierung, Strassen-Format, Ort-Normalisierung, IBAN-Format, Excel-Datum, Datums-Varianten, Whitespace-Bereinigung.
Tipps: Korrektur-Gedächtnis für wiederkehrende Importe nutzen, Spaltenübersicht in Schritt 2 sorgfältig prüfen, Sammelkorrekturen verwenden, Korrekturregeln als JSON exportieren und teilen.

GRUPPENZUWEISUNGEN (3 Schritte)
Schritt 1 – Gruppen erfassen: drei Copy-Paste-Quellen: Fächerübersicht aus LehrerOffice (Kürzel werden durch Fachnamen ersetzt), Fächer aus PUPIL (fehlende Fächer werden erkannt), Gruppenübersicht aus LehrerOffice (automatische und inaktive Gruppen werden gefiltert).
Schritt 2 – Schüler zuweisen: CSV/Excel mit S_ID, S_Name, S_Vorname, S_Gruppen; optional PUPIL-Schlüsselabgleich-Datei (LO-ID → PUPIL-ID).
Schritt 3 – Export: Gruppen-Importieren.xlsx (erstellt Gruppen) und SuS_Gruppen_Import.xlsx (weist Schüler zu).
Fächer-Abgleich: Fehlende PUPIL-Fächer können einem bestehenden Fach zugewiesen werden oder müssen zuerst in PUPIL erfasst werden.

LP-KLASSENZUWEISUNGEN (3 Schritte)
Schritt 1 – Klassen erfassen: Zuweisungstabelle aus LehrerOffice tab-getrennt einfügen; Format: Klasse | [Status] | KLP 1 | KLP 2 | KLP 3 | WLP 1-3 | HP 1-3 | WFL 1-3 | Vikariat. Inaktive Klassen werden übersprungen.
Schritt 2 – LP zuordnen: Personen-Export aus PUPIL (Excel/CSV) mit Nachname, Vorname, Schlüssel; automatischer Abgleich, nicht zugeordnete LPs manuell zuweisen.
Schritt 3 – Export: LP-Zuteilung.xlsx mit LP Name, LP Schlüssel, Rolle, Klasse, Fach. Zuweisungen ohne PUPIL-Schlüssel sind gelb markiert.
Rollen-Zuordnung nach Spalten: 1-3 Klassenlehrperson, 4-6 Weitere Lehrperson, 7-9 Heilpädagoge/in, 10-12 Weitere Förderlehrperson, 13-14 Vikariat.

KORREKTUR-GEDÄCHTNIS
Speichert einmalig durchgeführte Korrekturen und wendet sie bei künftigen Importen automatisch an – nützlich bei wiederkehrenden Semester-Importen. Nur beim Stammdaten-Import verfügbar (nicht bei Gruppen- und LP-Zuweisungen).
Erste Datenaufbereitung: neue Datei ohne vorherige Korrekturen, Korrekturen manuell durchführen, im Exportschritt speichern.
Weitere Datenaufbereitung: gespeicherte Korrekturen laden, bekannte Fehler automatisch korrigieren, nur neue Fehler manuell bearbeiten.
Speichermöglichkeiten: lokaler Browser-Speicher (localStorage, nur auf diesem Gerät/Browser) oder Export als JSON-Datei zum Teilen mit Kolleg:innen.

FAQ DES IMPORT WIZARDS
F: Welche Dateiformate werden unterstützt? A: Für den Stammdaten-Import CSV und Excel (.xlsx, .xls). Für Gruppen- und LP-Import werden die Daten per Copy-Paste aus LehrerOffice eingefügt.
F: Werden meine Daten auf einem Server gespeichert? A: Nein. Alle Daten werden ausschliesslich lokal im Browser verarbeitet; auch das Korrektur-Gedächtnis liegt im localStorage.
F: Was passiert, wenn Pflichtfelder fehlen? A: Schritt 2 zeigt fehlende Pflichtfelder rot an. Der Import kann fortgesetzt werden, PUPIL akzeptiert die fehlenden Daten aber möglicherweise nicht.
F: Kann ich Korrekturen für zukünftige Importe speichern? A: Ja, aber nur beim Stammdaten-Import. In Schritt 4 als Korrektur-Gedächtnis lokal oder als JSON speichern; beim nächsten Import «Weitere Datenaufbereitung» wählen.
F: Unterschied «Erste» und «Weitere Datenaufbereitung»? A: «Erste» = erstmaliger Import ohne vorherige Korrekturen. «Weitere» = nutzt gespeicherte Korrekturregeln. Nur beim Stammdaten-Import.
F: Wie funktioniert der Fächer-Abgleich bei Gruppen? A: Nach Einfügen der PUPIL-Fächer prüft der Wizard, ob alle verwendeten Fächer in PUPIL existieren; sonst alternatives Fach zuweisen oder in PUPIL erfassen.
F: Was bedeuten die Farben in der Validierung? A: Rot = Pflichtfehler, Orange = Warnung, Grün = korrigierter Wert. In der Spaltenprüfung: Grün vorhanden, Rot fehlend, Blau zusätzlich.
F: Wie exportiere ich die korrigierten Daten? A: In Schritt 4 auf «Herunterladen» klicken; Export als Excel (.xlsx), die Originaldatei bleibt unverändert.
F: Kann ich Gruppen manuell hinzufügen oder bearbeiten? A: Ja, alle Felder (Name, Schlüssel, Schulfach, Lehrpersonen) sind editierbar.
F: Was ist der PUPIL-Schlüsselabgleich bei LP-Zuweisungen? A: Abgleich der LO-Lehrpersonennamen mit dem PUPIL-Personenexport (Nachname, Vorname, Schlüssel); nicht zugeordnete LPs manuell zuweisen.
F: Funktioniert der Wizard offline? A: Nach dem Laden der Seite ist für Upload, Validierung und Export keine Internetverbindung nötig.
F: Welche Browser werden unterstützt? A: Chrome, Firefox, Edge und Safari in aktueller Version; empfohlen Chrome oder Firefox.
--- ENDE WISSENSBASIS IMPORT WIZARD ---`;
