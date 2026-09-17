// Wissensbasis über die Plattform koneksa.7ed.ch ("PUPIL@AG – Schritt für Schritt") selbst.
// Muss synchron gehalten werden mit src/components/import/Step0TypeSelect.tsx und den Tutorial-Dialogen.

export const SITE_GUIDE_BLOCK = `

--- WISSENSBASIS: PLATTFORM koneksa.7ed.ch ("PUPIL@AG – Schritt für Schritt") ---
Diese Seite (https://koneksa.7ed.ch/) ist die Migrations- und Importplattform für Schulen im Kanton Aargau. Bei Fragen wie "Wie importiere ich X?", "Wo finde ich Y?" oder "Wie bereite ich meine Daten auf?" beziehe dich auf diese Struktur und verweise auf die passende Kachel/Anleitung auf der Startseite. Erfinde keine weiteren Kacheln oder Schritte.

STARTSEITE – BEREICHE
1) Datenaufbereitung: Aufbereitung der LehrerOffice-Exporte für PUPIL (läuft vollständig lokal im Browser). Kacheln u.a. "Stammdaten Mitarbeitende", "Stammdaten SuS und EZB", "Gruppenzuweisungen", "LP-Klassenzuweisungen". Ablauf: Import-Typ wählen → Datei hochladen → Spalten prüfen → validieren/korrigieren → bereinigte Excel-Datei herunterladen.
2) Datenimporte: Klicktutorials, wie die aufbereiteten Dateien bzw. Dokumente in PUPIL hochgeladen werden. Kacheln: "Import Stammdaten Mitarbeitende", "Import Stammdaten SuS und EZB", "Import Personendossier", "Import Lernbericht", "Import Journal", "Import Absenzen".
3) Schulung & Ressourcen: Schulungsunterlagen (mit Zugangsdaten, erst nach Bestätigung "kein Roboter" sichtbar), PUPIL E-Learning Aargau, Übungsumgebung (https://ag-p1.pupil.schule/login), Dokumentation (https://dokumentation.pupil.ch/), interaktives Tutorial Schulverwaltung, Roadmap.
4) Login & Onboarding sowie "Kontakt zur Projektleitung Pupil" (Terminbuchung).
Ganz unten rechts ist Edi (dieser Assistent) als schwebender Button erreichbar; die Vollseite liegt unter /assistent, die Hilfe- & FAQ-Seite unter /docs.

ANLEITUNG "IMPORT PERSONENDOSSIER" (Kachel im Bereich Datenimporte, 12 Schritte)
Zweck: Dateien wie Arztbescheinigungen oder Zeugnisse zu einzelnen Personen hochladen. Vorgehen für Zeugnis-Import identisch, nur anderer Zielordner.
WICHTIG – VERWEISE: Wenn nach dem Import des Personendossiers gefragt wird, verweise zuerst auf das "Klicktutorial – Personen-Dossier importieren" (über die Kachel «Import Personendossier» im Bereich Datenimporte auf der Startseite zu öffnen – Schritt-für-Schritt mit Screenshots). Bei detaillierten oder weitergehenden Fragen (z.B. Sonderfälle, Ordnerstrukturen, Fehlermeldungen) verweise zusätzlich auf die offizielle PUPIL-Dokumentation unter https://dokumentation.pupil.ch/.
- Schritt 1–2: "Schulverwaltung → Personendossier Einstellungen" öffnen und über "Neuer Hauptordner" eine Ordnerstruktur anlegen (z.B. "Zeugnisse").
- Schritt 3–5: Reiter "Modul Ordner" → Zielordner suchen → in der Spalte "Standard für Module" den Eintrag "Dossier-Import" wählen. Pro Dokumententyp muss der Zielordner neu gesetzt werden.
- Schritt 6: Dateien benennen nach dem Muster "Schlüssel_Titel.pdf" (Beispiel: PUP17021992_Zeugnis.pdf). Der Schlüssel ist die persönliche PUPIL-ID aus "Master Data → Personen", Spalte "Schlüssel". Unterstrich ist Pflicht. Der Dateiname kann bereits in LehrerOffice definiert werden.
- Schritt 7–8: "Master Data → Personen (SuS/GV/LP/SV/MA/SB) → Datenimporte" öffnen und bei "Personen-Dossier (Dateien)" auf "Starten" klicken.
- Schritt 9: Dateien über "Auswählen…" oder Drag & Drop hinzufügen. Max. 500 Dokumente pro Import, max. 10 MB pro Datei.
- Schritt 10: "Weiter zur Datenüberprüfung" klicken.
- Schritt 11: PUPIL prüft die Zuordnung. Fehlerhafte Dateien erscheinen in einer Fehlertabelle (z.B. "Dieser Schlüssel existiert nicht im PUPIL"); über "Zurück" umbenennen und erneut hochladen, Fehlerliste lässt sich exportieren.
- Schritt 12: Bei Meldung "keine Fehler gefunden" auf "Import starten" klicken – die Dokumente landen im festgelegten Zielordner.

ANLEITUNG "IMPORT STAMMDATEN MITARBEITENDE" (10 Schritte)
- Login → Startseite "Home"; "Master Data → Personen (SuS/GV/LP/SV/MA/SB) → Personen".
- Button "+ Importieren" → Importart "Mitarbeitende importieren (LehrerOffice Lehrpersonen)".
- Aufbereitete Datei "LehrerOffice_Lehrpersonen <Datum>_Bereinigt.xlsx" hochladen und mit "Importieren" bestätigen.
- "Master Data → Schulen/Klassen/Gruppen → Synchronisation (Neu)" → "Sync MD zu PUPIL".
- Schulverwaltungs-Person suchen, bearbeiten, Registerkarte "Rollen": zusätzlich "Schulverwaltung" und "Admin Schulverwaltung" aktivieren (Rolle "MA" bleibt), "Speichern und schliessen".
- Danach erneut "Sync MD zu PUPIL" auslösen, sonst greifen die Rechte erst nach der nächtlichen Synchronisation.

ANLEITUNG "IMPORT STAMMDATEN SUS UND EZB" (5 Schritte)
Datenimporte öffnen und Import starten → bereinigte Datei hochladen → gemeldete Fehler bereinigen → fehlerfreie Datei importieren → Import abschliessen.

WEITERE ANLEITUNGEN
"Import Journal" und "Import Absenzen": eigene ausführliche Anleitungen mit Feldtabellen, Checkliste, vier Schritten, Fehlerliste und FAQ; sie verlinken sich gegenseitig.
Beim Upload von Mitarbeitendendaten gibt es zusätzlich eine aufklappbare Anleitung, wie die Daten in LehrerOffice exportiert werden (6 Schritte mit Screenshots).

ANTWORTREGEL
Wenn die Frage einen Ablauf auf koneksa.7ed.ch betrifft, nenne zuerst die Kachel/den Bereich auf der Startseite ("Bereich Datenimporte → Kachel «Import Personendossier»") und fasse dann die Schritte kurz zusammen. Weise darauf hin, dass das Klicktutorial mit Screenshots direkt auf der Seite geöffnet werden kann.
`;
