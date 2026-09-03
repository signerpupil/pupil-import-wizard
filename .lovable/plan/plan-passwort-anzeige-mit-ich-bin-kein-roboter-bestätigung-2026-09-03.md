# Plan: Passwort-Anzeige mit «Ich bin kein Roboter»-Bestätigung

## Ziel
Die Passwörter (PUPIL E-Learning Aargau und Schulungsunterlagen) sollen erst sichtbar werden, nachdem der Nutzer bestätigt hat, dass er kein Roboter ist.

## Gewählte Umsetzung: Selbst gebauter Check (kein Drittanbieter)
Ein echter Bot-Schutz (Google reCAPTCHA, Cloudflare Turnstile) würde externe Skripte laden und Daten an Dritte senden – das widerspricht dem 100%-lokalen, DSG-konformen Ansatz des Projekts. Ausserdem steht das Passwort ohnehin im ausgelieferten Code, sodass ein externer Dienst keinen echten Schutz bieten würde.

Stattdessen wird eine lokale Bestätigung im bekannten «Ich bin kein Roboter»-Stil eingebaut:

## Änderungen in `src/components/import/Step0TypeSelect.tsx`

1. **Neuer kleiner Robot-Check-Baustein** (Inline-Komponente in derselben Datei):
   - Kästchen mit Checkbox «Ich bin kein Roboter» im bekannten Look (analog reCAPTCHA).
   - Nach dem Anhaken erscheint kurz ein Lade-Spinner (~1 Sekunde), dann ein grünes Häkchen.
   - Als leichte Hürde wird zusätzlich eine einfache Mini-Aufgabe eingebaut (z. B. kleine Rechenfrage «3 + 4 = ?» mit Eingabefeld), damit es nicht nur ein simpler Klick ist.
   - Erst nach korrekter Lösung gilt der Check als bestanden.

2. **Einbindung an beiden Stellen** (E-Learning-Kachel und Schulungsunterlagen-Kachel):
   - Klick auf «Passwort anzeigen» öffnet zuerst den Robot-Check.
   - Nach bestandenem Check wird das Passwort wie bisher mit Kopieren-Button angezeigt.
   - Der bestandene Check bleibt für die Sitzung gemerkt (State), d. h. man muss sich nicht pro Kachel erneut verifizieren; «ausblenden»/«anzeigen» funktioniert danach ohne erneuten Check.
   - Klick-Propagation bleibt gestoppt (Kachel-Link wird nicht ausgelöst).

## Hinweis (Ehrlichkeit)
Das ist eine Sichtbarkeits-Hürde, kein echter Sicherheitsmechanismus – technisch versierte Bots können den im Code enthaltenen Wert weiterhin auslesen. Für echten Schutz müsste das Passwort serverseitig nach einem echten CAPTCHA ausgeliefert werden (möglich, aber aufwändiger und mit Drittanbieter). Für den Zweck «nicht sofort sichtbar / kein plain text auf der Seite» reicht die lokale Lösung.

## Technische Details
- Kein neues Paket, kein externes Script, keine Netzwerk-Calls.
- Neuer State: `robotVerified: boolean` in `Step0TypeSelect`.
- Wiederverwendung bestehender Styles (shadcn Checkbox, Button, border/bg-Klassen).
- Build-Verifikation nach der Umsetzung.
