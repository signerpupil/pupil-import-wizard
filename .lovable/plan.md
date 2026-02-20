
## Was wird geändert

### 1. Fehler-Tabelle: Gruppierung nach Fehlertyp / Spalte

Aktuell: Eine flache Tabelle mit bis zu 50 Fehlern in beliebiger Reihenfolge.

Neu: Fehler werden nach **Spalte** gruppiert angezeigt. Jede Spalte bekommt einen zusammenklappbaren Abschnitt mit:
- Header: Spaltenname, Anzahl Fehler (offen/korrigiert), Fehlertyp-Badge
- Tabelleninhalt nur für diese Spalte
- Korrigierte Fehler in einer eigenen Untergruppe ("Bereits korrigiert") – ausgeklappt am Ende

Das macht es viel übersichtlicher bei grossen Datensätzen (z.B. 200+ Fehler über 5 Spalten).

**Technische Umsetzung:**
- `useMemo` → `errorsByColumn`: `Map<string, ValidationError[]>` – Fehler nach `error.column` gruppiert
- Sortierung: Spalten mit den meisten Fehlern zuerst; korrigierte Zeilen am Ende jeder Gruppe
- Jede Gruppe: eigener Collapsible-Block mit dem Spaltennamen als Header und einer "Alle korrigieren"-Schnellaktion (öffnet Step-by-Step für diese Spalte)
- Korrigierte Fehler: grüner Hintergrund, durchgestrichener Wert → in die gleiche Gruppe, aber visuell abgesetzt

---

### 2. Konsolidierungs-Detailansicht: Angleichung an Namenswechsel-Stil

**Problem heute:** Die Detail-Expansion der Eltern-Konsolidierung zeigt ein variables Grid mit 1–3 Karten (eine pro betroffenem Kind). Das ist schwer zu lesen wenn mehrere Kinder denselben Elternteil haben.

**Neu: Genau wie Namenswechsel – immer 2 Karten:**

```
┌──────────────────────┬──────────────────────────────┐
│  Aktuelle Situation  │  Nach Konsolidierung          │
│  (alle Einträge mit  │  (alle Einträge erhalten      │
│   verschiedenen IDs) │   diese eine korrekte ID)     │
│                      │                               │
│  Kinder: Max, Lisa   │  Korrekte ID: 20406           │
│  IDs: 20408 (Max)    │  ✓ Max: 20408 → 20406        │
│       20406 (Lisa)   │  ✓ Lisa: 20406 (korrekt)      │
└──────────────────────┴──────────────────────────────┘
```

**Linke Karte – "Aktuelle Situation":** grau (`bg-muted/50`)
- Header: "Aktueller Stand" + Zeilenanzahl
- Liste aller betroffenen Kinder mit ihrer jeweiligen (falschen) ID
- Rot hervorgehobene IDs die sich von `correctId` unterscheiden

**Rechte Karte – "Nach Konsolidierung":** blau (`bg-blue-500/5 border-blue-500/30`)
- Header: "Nach Konsolidierung" 
- "Einheitliche ID: {correctId}" prominent oben
- Liste aller Kinder mit Pfeil-Transformation: `20408 → 20406` oder `✓ bereits korrekt`
- Grüner Hintergrund für bereits korrekte Einträge

**Was entfällt:** Das "Was wird geändert?"-Panel darunter (wird in die rechte Karte integriert) und die variable Grid-Anzahl (immer genau 2 Spalten).

---

### Dateien

Nur eine Datei: `src/components/import/Step3Validation.tsx`

**Änderung 1 – Fehler-Gruppierung (Zeilen 2117–2200):**

Ersetze die flache Tabelle durch eine gruppierte Ansicht:

```tsx
// Neue Logik vor dem return:
const errorsByColumn = useMemo(() => {
  const map = new Map<string, ValidationError[]>();
  for (const e of errors) {
    if (!map.has(e.column)) map.set(e.column, []);
    map.get(e.column)!.push(e);
  }
  // Sortiere: meiste Fehler zuerst
  return Array.from(map.entries()).sort((a, b) => {
    const aUncorrected = a[1].filter(e => !e.correctedValue).length;
    const bUncorrected = b[1].filter(e => !e.correctedValue).length;
    return bUncorrected - aUncorrected;
  });
}, [errors]);
```

Dann in der JSX: Jede Spalte als Collapsible mit Tabelle (Zeile, Wert, Fehler, Aktion), nach Spalte gruppiert. Keine separate State-Variable nötig – alle Gruppen standardmässig eingeklappt ausser der ersten.

**Änderung 2 – Konsolidierungs-Detail (Zeilen 1251–1327):**

Ersetze das variable Grid durch das 2-Karten-Layout:

```tsx
{isExpanded && (
  <div className="border-t bg-muted/20 p-3 space-y-3">
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
      Einträge im Vergleich
    </p>
    <div className="grid grid-cols-2 gap-2">
      {/* Linke Karte: Aktueller Stand */}
      <div className="rounded-md border bg-muted/50 p-2.5 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold">Aktueller Stand</span>
          <span className="text-muted-foreground text-[10px]">{group.affectedRows.length} Einträge</span>
        </div>
        <div className="space-y-1 border-t pt-1.5">
          {group.affectedRows.map(r => (
            <div key={r.row} className="flex items-center gap-1.5 flex-wrap">
              <span className="text-muted-foreground truncate">{r.studentName || `Zeile ${r.row}`}:</span>
              <code className={`px-1.5 py-0.5 rounded font-mono ${r.currentId !== group.correctId ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700'}`}>
                {r.currentId}
              </code>
            </div>
          ))}
        </div>
      </div>
      {/* Rechte Karte: Nach Konsolidierung */}
      <div className="rounded-md border bg-blue-500/5 border-blue-500/30 p-2.5 space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-blue-700">Nach Konsolidierung</span>
        </div>
        <div className="flex items-center gap-1.5 pb-1.5 border-b">
          <span className="text-muted-foreground shrink-0">Einheitliche ID:</span>
          <code className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded font-mono font-bold">{group.correctId}</code>
        </div>
        <div className="space-y-1 pt-0.5">
          {group.affectedRows.map(r => (
            <div key={r.row} className="flex items-center gap-1.5 flex-wrap">
              <span className="text-muted-foreground truncate">{r.studentName || `Zeile ${r.row}`}:</span>
              {r.currentId !== group.correctId ? (
                <div className="flex items-center gap-1">
                  <code className="px-1 py-0.5 bg-destructive/10 text-destructive rounded font-mono line-through text-[10px]">{r.currentId}</code>
                  <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                  <code className="px-1 py-0.5 bg-green-500/10 text-green-700 rounded font-mono text-[10px]">{group.correctId}</code>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  <span className="text-green-700">bereits korrekt</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
)}
```

Das "Was wird geändert?"-Panel (Zeilen 1303–1326) wird entfernt, da diese Information nun in die rechte Karte integriert ist.

---

### Übersicht der Änderungen

- `src/components/import/Step3Validation.tsx`:
  - `useMemo` für `errorsByColumn` hinzufügen (ca. Zeile 902, nach `suggestionsWithApplicability`)
  - State für aufgeklappte Spaltengruppen: `expandedErrorColumns` (Set of string)
  - Konsolidierungs-Detail: Zeilen 1251–1327 ersetzen (2-Karten-Layout)
  - Fehler-Tabellen-Block: Zeilen 2117–2200 ersetzen (gruppierte Collapsible-Tabellen)
