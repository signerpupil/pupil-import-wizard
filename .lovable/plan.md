
# Plan: Standalone HTML-Version ohne Admin-Bereich

## Zusammenfassung

Die App wird als einzelne HTML-Datei exportierbar gemacht, die alle Funktionen (ausser dem Admin-Bereich) vollständig offline enthält. Dies wird durch einen separaten Build-Befehl ermöglicht, der das `vite-plugin-singlefile` Plugin nutzt.

## Technische Analyse

### Was funktioniert offline
- Datei-Upload und Parsing (CSV/Excel via ExcelJS)
- Spalten-Prüfung gegen erwartete Definitionen
- Datenvalidierung (AHV, E-Mail, Datum, PLZ, etc.)
- Fehlerkorrektur (manuell und automatisch)
- Export als korrigierte CSV/Excel-Datei
- Korrektur-Gedächtnis via localStorage

### Was entfernt werden muss
- Admin-Bereich (`/admin` Route)
- Login-Seite (`/login` Route)
- Supabase-Authentifizierung (AuthProvider)
- React Router (nicht nötig für Single-Page)

## Implementierungsansatz

Anstatt den bestehenden Code zu modifizieren, wird ein **separater Einstiegspunkt** für den Standalone-Build erstellt:

```text
src/
├── main.tsx          (bestehend - für Online-Version)
├── mainStandalone.tsx (NEU - für Standalone HTML)
└── StandaloneApp.tsx  (NEU - ohne Router/Auth)
```

## Betroffene Dateien

| Datei | Aktion |
|-------|--------|
| `package.json` | Erweitern - neues Script `build:standalone` hinzufügen |
| `vite.standalone.config.ts` | Neu erstellen - separates Vite-Config für Singlefile-Build |
| `src/mainStandalone.tsx` | Neu erstellen - Einstiegspunkt ohne Auth/Router |
| `src/StandaloneApp.tsx` | Neu erstellen - vereinfachte App-Komponente |
| `index.standalone.html` | Neu erstellen - HTML-Template für Standalone |

## Detaillierte Implementierung

### 1. Neues Dev-Dependency installieren
Das Plugin `vite-plugin-singlefile` muss installiert werden.

### 2. Separate Vite-Konfiguration (vite.standalone.config.ts)

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [react(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: "dist-standalone",
    rollupOptions: {
      input: "index.standalone.html",
    },
  },
});
```

### 3. Standalone HTML Template (index.standalone.html)

Vereinfachtes Template ohne GitHub Pages Scripts.

### 4. Standalone Entry Point (src/mainStandalone.tsx)

Minimaler Einstiegspunkt ohne Auth/Router:
- Importiert StandaloneApp statt App
- Keine Supabase-Client-Initialisierung nötig
- Keine AuthProvider

### 5. Standalone App (src/StandaloneApp.tsx)

Vereinfachte Version der App:
- Kein React Router
- Kein AuthProvider
- Nur die Index-Seite direkt rendern
- TooltipProvider und Toaster bleiben für UI-Komponenten

### 6. Package.json Script

```json
{
  "scripts": {
    "build:standalone": "vite build --config vite.standalone.config.ts"
  }
}
```

## Build-Prozess

Nach der Implementierung kann die HTML-Datei so erstellt werden:

1. `npm run build:standalone` ausführen
2. Die Datei `dist-standalone/index.standalone.html` enthält die komplette App
3. Diese Datei kann heruntergeladen und offline verwendet werden

## Vorteile dieses Ansatzes

- **Keine Änderung am Haupt-Code**: Die Online-Version bleibt unverändert
- **Vollständige Funktionalität**: Alle Import/Export-Features funktionieren
- **Echte Offline-Fähigkeit**: Keine Internetverbindung erforderlich
- **Einfache Verteilung**: Eine einzige HTML-Datei zum Teilen/Downloaden
- **localStorage bleibt**: Korrektur-Gedächtnis funktioniert weiterhin

## Einschränkungen der Standalone-Version

- Kein Admin-Zugang (absichtlich entfernt)
- Kein Login/Authentifizierung
- Keine dynamischen Regeln aus der Datenbank
- Dateigrösse: ca. 2-4 MB (alle JS/CSS inline)

## Download-Button (optional)

Optional kann ein Download-Button auf der Hauptseite hinzugefügt werden, der auf eine gehostete Version der Standalone-HTML-Datei verlinkt.
