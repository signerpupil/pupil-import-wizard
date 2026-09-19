# Klick-Tutorials für Journal und Absenzen

## Umsetzung
- Die bestehenden Kacheln «Import Journal» und «Import Absenzen» öffnen künftig je ein klickbares Tutorial im gleichen Aufbau wie «Import Förderplanung».
- Beide Tutorials starten mit einer verpflichtenden, anklickbaren Checkliste. Erst wenn alle Punkte bestätigt sind, kann der Ablauf gestartet werden.
- Danach folgen die geführten Schritte: Importtyp wählen, Datei auswählen, Validierungsfehler prüfen, Import starten und Ergebnis kontrollieren.
- Für die Import-Schritte werden dieselben fünf PUPIL-Screenshots wie beim Förderplaner verwendet; Markierungen und Beschriftungen werden passend auf «Journal» beziehungsweise «Absenzen» angepasst.
- Das Journal-Tutorial übernimmt Inhalte, Begriffe und Warnungen aus der verlinkten PUPIL-Anleitung.
- Das Absenzen-Tutorial übernimmt die bereits vorhandenen fachlichen Inhalte der Absenzen-Anleitung in dieser Anwendung. Beide Importe verwenden `Koneksa_Journal.csv`, filtern aber unterschiedliche Einträge.
- Im letzten Schritt erscheint wie beim Förderplaner ein deutliches Pop-up, dass der Import nur einmal durchgeführt werden darf. Beim Schliessen wird der Ablauf vollständig zurückgesetzt.

## Unverändert
- Die bestehenden Importfunktionen, Datenlogik und übrigen Kacheln bleiben unverändert.
- Die ausführlichen fachlichen Informationen werden in die neuen geführten Schritte übernommen, nicht inhaltlich neu erfunden.

## Prüfung
- Checklisten-Sperre, Vor-/Zurück-Navigation, Markierungen und Warn-Pop-up für beide Tutorials testen.
- Erneutes Öffnen muss wieder bei der Checkliste starten und darf das Schluss-Pop-up nicht sofort anzeigen.
- Desktop-Darstellung, Laufzeitfehler und automatischen Build prüfen.
