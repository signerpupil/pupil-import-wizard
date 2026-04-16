
Der User möchte Telemetrie für **fehlende Mappings** (z.B. Sprachen die nicht automatisch zu BISTA gemappt werden konnten) und für **Muster, die nicht automatisch korrigiert wurden** (z.B. AHV/Telefon/Email die das Auto-Fix nicht erkannt hat). Ziel: Lücken in den Mapping-Tabellen und Auto-Fix-Regeln zentral identifizieren.

## Was getrackt werden soll

**1. Unmapped Sprachwerte (BISTA)**
Wenn `bistaLanguageValidation` einen Wert nicht zu einem BISTA-Code mappen kann (Sprachname unbekannt, kein Match in der Mapping-Tabelle), den **rohen Sprachwert** anonymisiert sammeln.
- Anonymisierung: nur der unbekannte Sprach-Token (z.B. "Tigrinya", "Kurmandschi"), nicht der Name/AHV des Schülers.
- Sprachen sind keine personenbezogenen Daten → DSG-konform.

**2. Unmapped Nationalitäten**
Analog: wenn `nationalityValidation` ein Land nicht erkennt, nur den rohen Nationalitäts-Wert sammeln.

**3. Unmapped PLZ**
Wenn eine PLZ nicht in `swissPlzData` gefunden wird → PLZ + (anonymisiert) Ort melden.

**4. Auto-Fix-Misses (Muster)**
Werte die in einer Spalte ein Validierungsfehler erzeugen aber **nicht** durch `localBulkCorrections` automatisch korrigiert werden konnten. 
- Pro Spalte (S_AHV, S_Telefon, S_Email, S_Geburtsdatum, ...) den anonymisierten **Pattern** des fehlerhaften Werts:
  - Länge
  - Zeichen-Klassen-Maske (z.B. "999.9999.9999.99" statt "756.1234.5678.90", "AAA@AAA.AA" statt "max@firma.ch")
  - **Niemals** den Roh-Wert
- So sieht der Admin: "152 AHV-Fehler matchten nicht das Auto-Fix-Pattern, alle hatten die Form '756 9999 9999 99' (mit Leerzeichen)" → konkrete Regel-Erweiterung möglich.

## Implementation

### A. Datenbank
Bestehende `usage_events`-Tabelle reicht aus — nur **2 neue Event-Typen** in der Trigger-Whitelist:
- `unmapped_value` (für Sprache/Nationalität/PLZ)
- `unfixed_pattern` (für Auto-Fix-Misses)

→ **Migration**: erweitert die `validate_usage_event`-Funktion um diese 2 Event-Typen.

### B. Frontend Sammlung
Neue Helper-Datei `src/lib/telemetryCollectors.ts`:
- `maskValue(value)` → wandelt String in Zeichen-Klassen-Maske um (a→A, A→A, 0→9, sonst Original). Gekappt auf 40 Zeichen.
- `summarizeUnmapped(rows, errors)` → analysiert nach Validierungsdurchgang die Errors und sammelt:
  - Unbekannte Werte für Sprach-/Nationalitäts-/PLZ-Fehler (gruppiert + Häufigkeit, max. 50 Top-Werte).
  - Pattern-Masken pro Spalte für alle übrigen Format-Fehler (gruppiert + Häufigkeit, max. 20 pro Spalte).
- Wird **einmal** pro Step-3-Eintritt aufgerufen (gleiche Stelle wie das schon implementierte `validation_completed`).

### C. Tracking-Calls
In `Step3Validation.tsx` zusätzlich zum existierenden `validation_completed`:
- `trackEvent({ event_type: 'unmapped_value', payload: { language: [...], nationality: [...], plz: [...] } })`
- `trackEvent({ event_type: 'unfixed_pattern', payload: { S_AHV: {...}, S_Telefon: {...}, ... } })`

Beide nur wenn nicht-leer. Jeweils ein Event, nicht eines pro Wert (Performance + Payload-Limit von 4 KB).

### D. Admin-Dashboard
Erweiterung von `AdminMetrics.tsx` um 2 neue Karten:
1. **"Häufigste fehlende Mappings"** — Tabelle/Liste: Spalte (Sprache/Nationalität/PLZ) | Wert | Anzahl. Sortiert nach Häufigkeit. Top 30.
2. **"Häufigste nicht korrigierbare Muster"** — gruppiert nach Spalte, zeigt Top-Pattern-Masken mit Häufigkeit. Hilft, neue Auto-Fix-Regeln zu definieren.

Beide Karten direkt unter den bestehenden 4 Charts, jeweils volle Breite.

### E. Datenschutz
Ergänzung in `DatenschutzDialog` Sektion 4a: "Bei Validierungsfehlern werden zusätzlich anonymisierte Muster (z.B. Zeichenmaske 'AAA@AAA.AA' statt der echten E-Mail) und unbekannte Sprach-/Nationalitäts-/PLZ-Werte erfasst. Es werden niemals echte Roh-Werte mit Personenbezug übertragen."

## Strikte Datenschutz-Regeln

- **Niemals** Roh-Werte aus Spalten mit Personenbezug: Namen, AHV, IDs, Telefone, E-Mails, Adressen, Geburtsdaten → **nur Maske**.
- **Roh-Werte erlaubt nur** für: Sprache, Nationalität, PLZ (≤ 4-stellige Zahl, kein Personenbezug).
- Maske hart begrenzt auf 40 Zeichen.
- Pro Event max. 50 Top-Werte (sonst gekappt).

## Offene Punkte
1. Bestätigung der **Whitelist für Roh-Werte** (Sprache, Nationalität, PLZ) — okay so?
2. Soll der Admin auch einen **CSV-Export** der unmapped values bekommen, um direkt die Mapping-Tabellen zu erweitern? (Empfehlung: ja, sehr nützlich.)
3. Auch tracken bei **manuellen Korrekturen** (welche Werte hat der User manuell zu was korrigiert)? Das wäre noch wertvoller für Auto-Fix-Verbesserungen, aber heikler datenschutzrechtlich → würde ich nur als Maske machen, nicht mit Roh-Werten.

Nach Bestätigung umsetzen.
