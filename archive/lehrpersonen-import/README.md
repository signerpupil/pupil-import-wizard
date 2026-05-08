# Archiv: Lehrpersonen-Import (entfernt)

Dieser Ordner enthält die ursprünglichen Quelldateien des eigenständigen
"Lehrpersonen"-Imports, der aus der App entfernt wurde. Die E-Mail-Auto-Fill
Logik (für mehrfach vorkommende Lehrpersonen) wurde in den Import
"Stammdaten Lehrpersonen" übernommen — siehe `src/lib/lehrpersonenEmailFill.ts`
und `src/components/import/StammdatenLehrpersonenImportWizard.tsx`.

## Inhalt (`.bak`-Endung, damit nicht kompiliert/gebündelt)

- `LehrpersonenImportWizard.tsx.bak` – kompletter eigenständiger Wizard
  (Step 0 Type-Select, Upload, Email-Konflikt-UI, Export).
- `lehrpersonenExport.ts.bak` – XLSX-Export Logik (Spalten-Mapping,
  Beruf-Defaulting, rowEmailOverrides).
- `lehrpersonenEmailCheck.ts.bak` – frühere Email-Dedup-/Konflikt-Erkennung.
- `lehrpersonenEmailCheck.test.ts.bak` – zugehörige Vitest-Tests.

## Reaktivierung

Bei Bedarf einzelne Dateien zurück nach `src/...` kopieren, `.bak` entfernen,
ggf. Imports anpassen und in `src/types/importTypes.ts` (`ImportType`,
`importConfigs`) sowie `src/components/import/Step0TypeSelect.tsx` und
`src/pages/Index.tsx` wieder einbinden. Stand der Dateien: kurz vor Entfernung
aus dem Hauptcode (siehe Git-History).

> Hinweis: Diese Dateien sind **bewusst nicht** Teil des Builds. Die
> `.bak`-Endung verhindert, dass Vite/TypeScript sie auflöst.