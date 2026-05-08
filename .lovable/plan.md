## Ziel

Im Lehrpersonen-Import sollen für ein und dieselbe Person fehlende E-Mail-Adressen (Privat und Schule) automatisch aus den anderen Zeilen derselben Person übernommen werden. Bei Konflikten (zwei verschiedene, nicht-leere E-Mails) erhält die Nutzerin eine Auswahl.

## Personen-Erkennung

Identitätsschlüssel pro Zeile:
1. `L_ID` (getrimmt) – wenn vorhanden
2. Fallback: normalisierter String aus `L_Name` + `L_Vorname` + `L_Geburtsdatum`

Zeilen mit gleichem Schlüssel gelten als dieselbe Person.

## Verhalten beim Datei-Upload (automatisch)

Direkt nach `setParseResult` läuft eine Auffüll-Routine über die Zeilen. Pro Personen-Gruppe und pro E-Mail-Spalte (`L_Privat_EMail`, `L_Schule_EMail`):

- Sammle alle nicht-leeren, normalisierten Werte (lowercased, trim; Platzhalter `-`, `null`, `keine` ignoriert wie in `lehrpersonenEmailCheck.ts`).
- **0 Werte**: nichts tun.
- **1 eindeutiger Wert**: alle leeren Zellen der Gruppe per `rowEmailOverrides` mit diesem Wert auffüllen.
- **2+ unterschiedliche Werte (Konflikt)**: nicht automatisch befüllen, Konflikt für UI vormerken.

Bestehende, manuell gepflegte `rowEmailOverrides` werden respektiert / nicht überschrieben.

## Konflikt-UI in Schritt 2

Neue Karte „E-Mail-Konflikte bei gleicher Person" oberhalb der Vorschau, nur sichtbar wenn Konflikte existieren. Pro Konflikt:

- Anzeige: Personenname + L_ID, betroffene Spalte (Privat/Schule), Liste der gefundenen E-Mails als Radio-Auswahl + Option „Manuell eingeben".
- Bei Auswahl wird der gewählte Wert für alle Zeilen der Gruppe in `rowEmailOverrides` gesetzt → die bestehende Duplikatsprüfung und Vorschau aktualisieren sich automatisch.
- Solange ein Konflikt offen ist: Warnung im „Weiter zum Export"-Flow (nicht-blockierend, analog zu bestehenden Warnungen).

## Technische Umsetzung

Neue Datei `src/lib/lehrpersonenEmailFill.ts`:

```ts
export interface EmailConflict {
  personKey: string;
  displayName: string;
  column: 'L_Privat_EMail' | 'L_Schule_EMail';
  candidates: string[];
  rowIndices: number[];
}

export interface EmailFillResult {
  autoFills: Record<number, Record<string, string>>; // rowIdx → { col → email }
  conflicts: EmailConflict[];
}

export function computeEmailFill(rows: ParsedRow[]): EmailFillResult
```

Logik: gruppiere Zeilen nach Identitätsschlüssel, je Spalte unique non-empty Werte ermitteln, entsprechend autoFill oder Conflict erzeugen.

Änderungen in `LehrpersonenImportWizard.tsx`:

- Beim `onFileLoaded` zusätzlich `computeEmailFill` aufrufen, `autoFills` in initialen `rowEmailOverrides` einspielen, `conflicts` in neuen State `emailConflicts` ablegen.
- Neue Komponente `EmailConflictResolver` (in der gleichen Datei oder als kleine eigene Datei) für die Konfliktauswahl. Bei Auswahl: `rowEmailOverrides` für alle `rowIndices` der Gruppe setzen und Konflikt aus dem State entfernen.
- Hinweis-Toast nach Upload, falls Auto-Fill erfolgt ist (z. B. „N E-Mail-Adressen automatisch ergänzt").
- Vorschautabelle markiert auto-aufgefüllte Zellen visuell wie bestehende Overrides (`text-primary font-medium`).

Keine Änderungen am Export-Pfad nötig – dieser nutzt bereits `rowEmailOverrides`.

## Tests

Neue Datei `src/test/lehrpersonenEmailFill.test.ts`:

- Eine Person, zwei Zeilen, eine E-Mail leer → wird befüllt.
- Eine Person, zwei verschiedene E-Mails → Konflikt, kein Auto-Fill.
- Personen-Erkennung: Fallback Name+Vorname+Geburtsdatum funktioniert ohne L_ID.
- Privat- und Schule-Spalte werden unabhängig behandelt.
- Platzhalter (`-`, `null`) zählen als leer.

## Geänderte / neue Dateien

- neu: `src/lib/lehrpersonenEmailFill.ts`
- neu: `src/test/lehrpersonenEmailFill.test.ts`
- bearbeitet: `src/components/import/LehrpersonenImportWizard.tsx`
