# 5. Kachel: Interaktives Tutorial

## Ziel
Auf der Startseite (Import-Typ-Auswahl) kommt ganz rechts eine fünfte Kachel dazu, die sich farblich von den vier Import-Kacheln abhebt und das klickbare Tutorial öffnet — ohne die Seite zu verlassen, damit der KI-Assistent weiterhin verfügbar bleibt.

## Verhalten
- Kachel „Interaktives Tutorial" (Teal/Cyan-Akzent statt Primary-Blau, eigenes Icon, kein Auswahl-/Radio-Verhalten).
- Klick öffnet ein grosses Overlay (fast bildschirmfüllend) mit dem Tutorial als eingebettete Seite.
- Overlay hat Kopfzeile mit Titel, Button „In neuem Tab öffnen" und Schliessen-Button; Escape und Klick daneben schliessen ebenfalls.
- Der schwebende Hilfe-Assistent bleibt sichtbar und nutzbar, da wir die Seite nie verlassen.
- Grid wird von 4 auf 5 Spalten erweitert (Desktop), mobil weiterhin gestapelt.

## Machbarkeit iFrame
Geprüft: die Tutorial-Seite sendet weder `X-Frame-Options` noch eine framebeschränkende CSP — Einbettung per iFrame funktioniert.

## Technisch
- `src/components/import/Step0TypeSelect.tsx`: fünfte Kachel als eigenständiges Element nach der `.map()`-Liste, Grid auf `lg:grid-cols-5`, lokaler State `tutorialOpen`.
- Neue Komponente `src/components/import/TutorialDialog.tsx`: shadcn `Dialog` mit `<iframe src="https://tutorial-schulverwaltung.lovable.app" allow="clipboard-write; fullscreen" />`, Höhe ca. `85vh`.
- Farbliche Abgrenzung über bestehende Design-Tokens (`--pupil-teal`), keine Hardcoded-Farben.
- Fallback-Hinweis im Dialog-Footer mit Link, falls die Seite die Einbettung künftig blockiert.
