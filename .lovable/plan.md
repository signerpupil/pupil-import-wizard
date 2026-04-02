

# Namenswechsel: Beide Schüler*innen anzeigen + manuelle Namenswahl

## Problem
Die Namenswechsel-Erkennung zeigt nur den/die Schüler*in der **späteren Zeile** an. Im Screenshot gehört "Kristina Stefanova-Dhital" (Zeile 45) zu Robin Dhital, während "Kristina Stefanova" (Zeile 417) zu einem anderen Kind gehört. Es fehlt:
1. Die Anzeige **beider** Schüler*innen im Header
2. Eine Möglichkeit, den **richtigen Namen manuell festzulegen** (statt nur "Ignorieren")

## Lösung

### 1. NameChangeEntry erweitern (`Step3Validation.tsx`)
- Neues Feld `fromStudentName: string` hinzufügen — den Schüler*innennamen aus der **früheren** Zeile (Zeile `fromRow`)
- Beim Parsen: `fromStudentName` aus `rows[fromRow - 1]` lesen (`S_Vorname` + `S_Name`)

### 2. Header: beide Schüler*innen anzeigen
- Statt `Schüler/in: Robin Dhital` → zwei Labels anzeigen:
  - `Zeile 45: Robin Dhital` | `Zeile 417: [anderer Schüler]`
- Falls beide Schüler*innen identisch sind, nur einen Namen anzeigen (wie bisher)

### 3. Manuelle Namenswahl als Aktion hinzufügen
- Zwei neue Buttons unter den Vergleichskarten:
  - **«Stefanova-Dhital» übernehmen** — setzt `onErrorCorrect` auf den bisherigen Namen (korrigiert die spätere Zeile)
  - **«Stefanova» beibehalten** — dismisst die Warnung (behält den aktuellen Wert der späteren Zeile)
- Beim Übernehmen des bisherigen Namens: `onErrorCorrect(entry.error.row, entry.column, entry.fromName, 'manual')` aufrufen
- Beim Beibehalten: `dismissNameChange(entry)` wie bisher

### 4. Betroffene Datei
- `src/components/import/Step3Validation.tsx` — Interface, Parsing, Header-Bereich, und neue Buttons im Detail-Bereich

