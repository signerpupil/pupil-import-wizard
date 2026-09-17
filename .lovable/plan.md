# Datumsformat beim Mitarbeitenden-Export korrigieren

## Umsetzung
- Die Datumsregel für „Geb“ und „Eintritt“ erweitert auch LehrerOffice-Werte mit zweistelligem Jahr wie `13.07.67`.
- Zweistellige Jahre eindeutig in vierstellige Jahre umwandeln und ungültige Kalendertage ablehnen.
- Beide Spalten weiterhin als echte Excel-Datumszellen im Format `TT.MM.JJJJ` exportieren.
- Einen automatisierten Test für vierstellige, zweistellige und ISO-Datumswerte ergänzen.
- Den Export anhand der hochgeladenen Beispieldatei kontrollieren.

## Technische Details
Die hochgeladene Datei enthält in „Geb“ den Textwert `13.07.67`. Die bisherige Regel verarbeitet nur Jahre mit vier Stellen; deshalb blieb dieser Wert trotz Datumsformatierung technisch Text. Die neue Regel wandelt ihn vor dem Export in einen echten Excel-Datumswert um.
