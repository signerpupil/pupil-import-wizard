# Globales Design mit Admin-Umschaltung

## Ziel
Das freigegebene 7-Education-Design wird auf die gesamte Anwendung übertragen. Alle vorhandenen Inhalte, Kachelanordnungen, Beschriftungen, Buttons und Abläufe bleiben unverändert. Im Adminbereich kann jederzeit global zwischen dem bisherigen und dem neuen Design gewechselt werden.

## Umsetzung
- Die vorhandenen 7-Education-Farben, der warme Hintergrund, die kompakteren Radien und die Switzer-Schrift als globale, umschaltbare Gestaltung verwenden.
- Den Design-Schalter auf sämtliche Seiten anwenden: Startseite, alle Aufbereitungsschritte, Login, Dokumentation, Edi und Adminbereich.
- Bestehende feste Farbwerte auf diesen Seiten durch gestaltungsabhängige Farben ersetzen, ohne Inhalt, Position, Reihenfolge oder Funktion zu ändern.
- Im Adminbereich einen neuen Reiter «Design» mit einem klaren Schalter «Bisheriges Design / 7-Education-Design» ergänzen.
- Die Auswahl zentral speichern, sodass sie für alle Besucher und Geräte gilt. Lesen ist öffentlich möglich; ändern dürfen nur Administratoren.
- Das bisherige Design bleibt vollständig als Rückfalloption erhalten.
- Die beiden reinen Vorschauseiten bleiben erreichbar, werden aber nicht Teil der produktiven Abläufe.

## Technische Details
- Globale Einstellung `theme` mit den Werten `pupil` und `seven-education`.
- Eine zentrale Design-Verwaltung lädt die Einstellung beim Start, setzt die passende Klasse am Anwendungsrahmen und aktualisiert offene Seiten nach dem Umschalten.
- Die bestehende `.seven-theme`-Tokenpalette wird um die bereits verwendeten PUPIL-Farbrollen ergänzt, damit auch Status-, Warn- und Fortschrittsanzeigen konsistent bleiben.
- Bei vorübergehend fehlender Verbindung wird das zuletzt bekannte Design verwendet; Standard bleibt zunächst das bisherige Design.

## Prüfung
- Beide Designs auf Startseite, Mitarbeitenden-Aufbereitung, Login, Dokumentation, Edi und Adminbereich prüfen.
- Umschaltung als Administrator testen und nach Neuladen sowie in einer öffentlichen Ansicht bestätigen.
- Sicherstellen, dass alle vorhandenen Texte, Kacheln, Buttons und Abläufe unverändert funktionieren.
