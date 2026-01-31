
# Plan: Standalone HTML-Datei für Offline-Nutzung

## Zusammenfassung
Erstellung einer vollständigen, eigenständigen HTML-Datei (`pupil-import-wizard-offline.html`) im `public`-Ordner, die alle Import-Wizard-Funktionen enthält und ohne Internetverbindung funktioniert.

---

## Warum eine einzelne HTML-Datei?
- **Offline-Nutzung**: Benutzer können die Datei lokal speichern und ohne Internet nutzen
- **Einfache Verteilung**: Eine Datei zum Herunterladen und Teilen
- **Datenschutz**: Alle Daten bleiben lokal im Browser

---

## Was wird enthalten sein?

### Funktionen
- Datei-Upload (CSV & Excel)
- Spalten-Prüfung gegen die definierten Spalten-Definitionen
- Datenvalidierung (AHV, Datum, E-Mail, PLZ, Geschlecht, Telefon)
- Fehler-Korrektur (manuell und automatische Formatierung)
- Export als bereinigte CSV-Datei
- Korrektur-Gedächtnis (localStorage)

### Import-Typen
- Schülerdaten
- Journaldaten  
- Förderplaner (Diagnostik, Förderplanung, Lernberichte)

---

## Technische Umsetzung

### Datei-Struktur
Die Standalone-HTML-Datei wird als **vollständige, in sich geschlossene Datei** erstellt:

```text
public/pupil-import-wizard-offline.html
├── <!DOCTYPE html>
├── <head>
│   ├── Meta-Tags & Titel
│   └── <style> (eingebettetes CSS mit Tailwind-ähnlichen Klassen)
│       
├── <body>
│   ├── <div id="app">  (React-ähnliche UI-Struktur)
│   │   ├── Header mit Logo
│   │   ├── Wizard-Fortschritt
│   │   └── Step-Container
│   │       ├── Step 0: Typ-Auswahl
│   │       ├── Step 1: Datei-Upload
│   │       ├── Step 2: Spalten-Check
│   │       ├── Step 3: Validierung
│   │       └── Step 4: Export
│   │
│   └── <script>
│       ├── Spalten-Definitionen (aus importTypes.ts)
│       ├── Validierungslogik (aus fileParser.ts)
│       ├── Korrektur-Funktionen (aus localBulkCorrections.ts)
│       ├── CSV/Excel-Parser (SheetJS/ExcelJS)
│       └── UI-Steuerung (Vanilla JS)
```

### Bibliotheken (eingebettet)
- **SheetJS (xlsx.mini.min.js)**: Excel-Parsing - wird als CDN-Link eingebunden oder inline
- **Vanilla JavaScript**: Keine React-Abhängigkeit für Standalone

### Validierungsregeln
Alle Validierungstypen aus dem Hauptprojekt:
- `date`: DD.MM.YYYY, YYYY-MM-DD, Excel-Seriennummern
- `ahv`: 756.XXXX.XXXX.XX
- `email`: Standard E-Mail-Format
- `plz`: 4-5 Ziffern
- `gender`: M, W, D
- `phone`: Schweizer Telefonnummern

---

## Änderungen am bestehenden Code

### 1. Neue Datei erstellen
**`public/pupil-import-wizard-offline.html`**

Eine vollständige HTML-Datei (~2500-3000 Zeilen) mit:
- Eingebettetem CSS (Tailwind-inspiriertes Styling)
- Vollständiger JavaScript-Logik
- Alle Spalten-Definitionen
- Alle Validierungsregeln

### 2. Footer anpassen
**`src/components/layout/Footer.tsx`**

Änderung der Download-URL, um sowohl für Lovable Publishing als auch GitHub Pages zu funktionieren:

```typescript
// Dynamische URL basierend auf aktuellem Host
const getStandaloneDownloadUrl = () => {
  const host = window.location.hostname;
  
  // GitHub Pages (mit Subdirectory)
  if (host.includes('github.io')) {
    return `${window.location.origin}/pupil-import-wizard/pupil-import-wizard-offline.html`;
  }
  
  // Lovable Publishing oder lokale Entwicklung
  return `${window.location.origin}/pupil-import-wizard-offline.html`;
};
```

---

## Dateien die erstellt/geändert werden

| Datei | Aktion | Beschreibung |
|-------|--------|--------------|
| `public/pupil-import-wizard-offline.html` | Erstellen | Vollständige Standalone-HTML-Datei |
| `src/components/layout/Footer.tsx` | Ändern | Dynamische URL für Download |

---

## Testen nach Implementierung

1. **Lokaler Test**: 
   - Datei im Browser öffnen
   - CSV-Datei hochladen
   - Validierung durchführen
   - Export testen

2. **Deployment-Test**:
   - Auf Lovable Publishing prüfen
   - Auf GitHub Pages prüfen

3. **Offline-Test**:
   - Datei lokal speichern
   - Internet trennen
   - Funktionalität prüfen

---

## Einschränkungen der Standalone-Version

- **Kein Excel-Export**: Nur CSV-Export (Excel würde zu große Bibliotheken erfordern)
- **Vereinfachte UI**: Grundlegende Styling ohne alle Animationen
- **Keine Echtzeit-Vorschau**: Reduzierte Vorschau-Funktionen
- **Kein Worker-Threading**: Validierung läuft im Hauptthread

