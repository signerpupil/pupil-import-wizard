# Klicktutorial an Layout von «Interaktives Tutorial» angleichen

## Ziel
Der Dialog des Klicktutorials («Import Stammdaten Mitarbeitende») erhält dasselbe Layout wie das bestehende «Interaktives Tutorial» im Bereich «Pupil Instanz einrichten» (TutorialDialog), damit beide Tutorials konsistent aussehen.

## Ist-Zustand (geprüft)
- `TutorialDialog.tsx`: Dialog 95vw/90vh, Header `border-b` mit Titel links und Button «In neuem Tab öffnen» rechts, Footer `border-t` mit kleinem Hinweistext (`text-xs text-muted-foreground`).
- `MitarbeitendeTutorialDialog.tsx`: eigener Header mit Badge «Schritt x/9» + Titel + Beschreibung, Bildbereich in der Mitte, Fusszeile mit Zurück/Weiter und Fortschritts-Punkten.

## Umsetzung
In `MitarbeitendeTutorialDialog.tsx`:
1. Dialoghöhe von `92vh` auf `90vh` angleichen (gleiche Grösse wie TutorialDialog).
2. Header wie TutorialDialog aufbauen: Titelzeile mit Dialogtitel links («Klicktutorial – Stammdaten Mitarbeitende»), Badge «Schritt x / 9» als rechtebündiges Element in derselben Zeile. Beschreibung des aktuellen Schritts bleibt darunter erhalten.
3. Fusszeile im selben Stil wie TutorialDialog (`border-t`, kompakt): Hinweistext `text-xs text-muted-foreground` ergänzen, Navigation (Zurück/Punkte/Weiter) bleibt funktional unverändert.
4. Keine funktionalen Änderungen: Schritte, Screenshots und Hotspots bleiben unverändert.

## Technisch
- Nur `src/components/import/MitarbeitendeTutorialDialog.tsx` wird geändert.
- Styling über bestehende shadcn-Klassen/Design-Tokens, keine hartcodierten Farben.
- Nach der Änderung Build-Log prüfen und Dialog im Preview per Screenshot verifizieren.
