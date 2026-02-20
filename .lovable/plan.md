
## Verbesserung der Konsolidierungs-Detailansicht: Feldweiser Vergleich aller Zeilen

### Problem

Die aktuelle "Einträge im Vergleich"-Ansicht zeigt bei einer Familie mit 4 Kindern nur die ID-Spalte pro Kind:

```
Aktueller Stand          | Nach Konsolidierung
Kind 1: 70001            | Kind 1: ✓ bereits korrekt
Kind 2: 70002            | Kind 2: 70002 → 70001
Kind 3: 70002            | Kind 3: 70002 → 70001
Kind 4: 70003            | Kind 4: 70003 → 70001
```

Der Benutzer sieht aber **nicht**, welche anderen Felder (Name, Adresse, Telefon, E-Mail, AHV) bei den verschiedenen Kindern eingetragen sind. Bei 4 Kindern können Adresswechsel oder Datenfehler auftreten – der Benutzer kann nicht beurteilen, ob es sich wirklich um dieselbe Person handelt oder ob Daten abweichen.

### Lösung: Feldweiser Vergleich

Im expandierten Bereich der Konsolidierungskarte wird die bisherige 2-Karten-Darstellung (Aktueller Stand / Nach Konsolidierung) ergänzt um eine **Feldvergleichs-Tabelle**, die alle verfügbaren Felder des Elternteils über alle betroffenen Zeilen hinweg vergleicht:

- **Gleiche Werte** (in allen Zeilen identisch) → grün mit Häkchen, kompakt
- **Unterschiedliche Werte** (mind. eine Zeile weicht ab) → gelb hervorgehoben, jede Zeile einzeln angezeigt
- **Leere Werte** → grau

### Aufbau der neuen Detailansicht

```
EINTRÄGE IM VERGLEICH

[Aktueller Stand] 4 Einträge    [Nach Konsolidierung]
Kind 1: 70001                    Einheitliche ID: 70001
Kind 2: 70002 → 70001           Kind 2: 70002 → 70001
Kind 3: 70002 → 70001           Kind 3: 70002 → 70001
Kind 4: 70003 → 70001           Kind 4: 70003 → 70001

── FELDER DER ELTERNPERSON ──────────────────────────────

Feld          | Kind 1 (Z.5) | Kind 2 (Z.9) | Kind 3 (Z.13) | Kind 4 (Z.17)
─────────────────────────────────────────────────────────────────────
Name          | ✓ Müller (alle gleich)
Vorname       | ✓ Klaus (alle gleich)
Strasse       | ✓ Nelkenweg 5 (alle gleich)
PLZ           | ✓ 8000 (alle gleich)
Ort           | ✓ Zürich (alle gleich)
AHV           | ✓ 756.1234.5678.90 (alle gleich)
EMail         | ⚠ k.mueller@gmail.com | k.mueller@gmail.com | km@web.de | k.mueller@gmail.com
TelefonPrivat | ⚠ 044 111 11 01 | 044 111 11 01 | 044 222 22 02 | 044 111 11 01
Mobil         | ✓ (leer in allen)
```

Felder die in **allen Zeilen gleich** sind, werden einzeilig kompakt dargestellt (kein Platz verschwendet). Nur Felder mit **Abweichungen** werden aufgeklappt mit Werten je Kind.

### Technische Umsetzung

**Nur `src/components/import/Step3Validation.tsx` wird geändert.**

#### Schritt 1: Hilfsfunktion `getParentFieldComparison`

Eine neue Funktion (als `useMemo` innerhalb des Map-Callbacks oder als eigenständige Utility):

```ts
function getParentFieldComparison(
  affectedRows: { row: number; currentId: string; studentName: string | null }[],
  column: string,  // e.g. "P_ERZ1_ID"
  rows: ParsedRow[]
) {
  const prefix = column.replace(/_ID$/, '_');
  
  const FIELDS_TO_COMPARE = [
    { key: 'Name',             label: 'Name' },
    { key: 'Vorname',          label: 'Vorname' },
    { key: 'AHV',              label: 'AHV' },
    { key: 'Strasse',          label: 'Strasse' },
    { key: 'PLZ',              label: 'PLZ' },
    { key: 'Ort',              label: 'Ort' },
    { key: 'EMail',            label: 'E-Mail' },
    { key: 'TelefonPrivat',    label: 'Tel. Privat' },
    { key: 'TelefonGeschaeft', label: 'Tel. Geschäft' },
    { key: 'Mobil',            label: 'Mobil' },
    { key: 'Rolle',            label: 'Rolle' },
    { key: 'Beruf',            label: 'Beruf' },
  ];

  return FIELDS_TO_COMPARE.map(field => {
    const values = affectedRows.map(r => {
      const row = rows[r.row - 1];
      return String(row?.[`${prefix}${field.key}`] ?? '').trim();
    });
    
    const uniqueNonEmpty = [...new Set(values.filter(v => v !== ''))];
    const allEmpty = values.every(v => v === '');
    const allSame = uniqueNonEmpty.length <= 1;
    
    return {
      fieldKey: field.key,
      label: field.label,
      values,                    // one per affectedRow
      allSame,
      allEmpty,
      uniqueValues: uniqueNonEmpty,
      singleValue: allSame ? (uniqueNonEmpty[0] ?? '') : null,
    };
  }).filter(f => !f.allEmpty);   // Hide fields that are empty everywhere
}
```

#### Schritt 2: UI-Änderung in der expandierten Karte

Nach der bisherigen 2-Spalten-Vergleichsansicht (Aktueller Stand / Nach Konsolidierung) wird ein **zweiter Block** hinzugefügt: "Felder der Elternperson".

**Aufbau:**

```tsx
{/* Feldvergleich */}
<div className="border-t pt-3 space-y-1.5">
  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
    Felder der Elternperson
  </p>
  
  {fieldComparison.map(field => (
    <div key={field.fieldKey} className={`rounded-md p-2 text-xs ${
      field.allSame ? 'bg-muted/30' : 'bg-yellow-500/10 border border-yellow-500/30'
    }`}>
      {field.allSame ? (
        // Compact single-line for matching fields
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground w-28 shrink-0">{field.label}</span>
          <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
          <span className="text-foreground truncate">{field.singleValue || '–'}</span>
          <span className="text-muted-foreground text-[10px] ml-auto">alle gleich</span>
        </div>
      ) : (
        // Expanded per-row comparison for differing fields
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-3 w-3 text-yellow-600 shrink-0" />
            <span className="font-medium text-yellow-700">{field.label} – Unterschiede</span>
          </div>
          <div className="grid gap-0.5 pl-4">
            {affectedRows.map((r, i) => (
              <div key={r.row} className="flex items-center gap-2">
                <span className="text-muted-foreground w-24 shrink-0 truncate">
                  {r.studentName || `Zeile ${r.row}`}:
                </span>
                <span className={`${
                  field.values[i] !== field.uniqueValues[0]
                    ? 'text-yellow-700 font-medium'
                    : 'text-foreground'
                }`}>
                  {field.values[i] || '–'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  ))}
</div>
```

#### Schritt 3: Zusammenfassung in der Karten-Überschrift

In der **kompakten Zusammenfassung** (wenn Details nicht aufgeklappt sind) wird ein kleiner Hinweis ergänzt, falls Felder mit Unterschieden gefunden wurden:

```
1 betroffenes Kind: Ryan Umzug2 ✕
⚠ Adressunterschiede in 2 Feldern
```

Dies gibt dem Benutzer sofort den Hinweis, dass er die Details prüfen sollte, auch wenn er die Karte zunächst nicht aufklappt.

### Was sich ändert

| Bereich | Vorher | Nachher |
|---|---|---|
| Detailansicht (expandiert) | Nur ID-Vergleich pro Kind | ID-Vergleich + Feldvergleich aller Elternfelder |
| Felder gleich | Nicht angezeigt | Kompakt einzeilig mit grünem Häkchen |
| Felder unterschiedlich | Nicht angezeigt | Gelb hervorgehoben mit Wert je Kind |
| Karten-Summary | Anzahl Kinder | Anzahl Kinder + Hinweis bei Feldunterschieden |

### Nur eine Datei betroffen

Alle Änderungen befinden sich ausschließlich in:
- `src/components/import/Step3Validation.tsx`

Keine Änderungen an `fileParser.ts`, `importTypes.ts` oder anderen Dateien nötig, da alle Rohdaten über das `rows`-Prop bereits verfügbar sind.
