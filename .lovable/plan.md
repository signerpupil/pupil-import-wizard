

## Interaktive Anleitung fuer LPStep1Classes

Der aktuelle Schritt 1 hat nur einen kurzen Hinweis-Text. Der User moechte eine visuelle Schritt-fuer-Schritt-Anleitung mit den hochgeladenen Screenshots, die das Kopieren aus LehrerOffice erklaeren.

### Konzept: Aufklappbare Anleitung mit nummerierten Schritten und Screenshots

Statt die Screenshots nur statisch einzubetten, baue ich eine **aufklappbare Anleitung** (Collapsible/Accordion) direkt in die Card ein, die standardmaessig eingeklappt ist, damit erfahrene User nicht gestoert werden.

### Aenderungen

**1. Screenshots ins Projekt kopieren**
- `user-uploads://2026-03-03-06-40-43.png` → `src/assets/lo-anleitung-ansicht.png` (Ansicht > Alles)
- `user-uploads://2026-03-03-06-41-05.png` → `src/assets/lo-anleitung-kopieren.png` (Bearbeiten > Tabelle kopieren)

**2. `src/components/import/lp-zuweisung/LPStep1Classes.tsx` erweitern**

Den bestehenden `Alert`-Hinweis ersetzen durch eine aufklappbare Anleitung:

- **Collapsible-Bereich** mit Titel "Anleitung: Daten aus LehrerOffice kopieren" und einem Toggle-Button
- **Zwei nummerierte Bloecke** (Phase A: Alles auswaehlen, Phase B: Tabelle kopieren):

  **Phase A — Alle Spalten einblenden:**
  1. Klassen im linken Menu anklicken
  2. Registerkarte **Ansicht** waehlen
  3. **Alles** auswaehlen (damit alle Spalten sichtbar sind)
  
  Screenshot `lo-anleitung-ansicht.png` darunter, klickbar (oeffnet in Dialog/Lightbox gross)

  **Phase B — Tabelle kopieren:**
  1. Registerkarte **Bearbeiten** waehlen
  2. **Tabelle kopieren** auswaehlen
  3. Hier im Textfeld mit **Ctrl+V** einfuegen

  Screenshot `lo-anleitung-kopieren.png` darunter, klickbar

- Klickbare Screenshots oeffnen eine **Dialog-Lightbox** mit dem Bild in voller Groesse
- Der Collapsible-Zustand wird in `localStorage` gespeichert, damit wiederkehrende User die Anleitung nicht jedes Mal sehen

### Technische Details

- Verwende `@radix-ui/react-collapsible` (bereits installiert) fuer den aufklappbaren Bereich
- Screenshots als ES6-Imports aus `src/assets/`
- Lightbox via `Dialog` aus shadcn/ui
- Nummerierung mit gestylten Kreisen (1, 2, 3) und fetten Schluesselbegriffen
- Kompakte Darstellung: Screenshots mit `max-h-[200px] object-contain cursor-pointer rounded-lg border` im eingeklappten Zustand

