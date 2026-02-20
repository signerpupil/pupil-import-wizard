
## Problem Analysis

The current "Details" expansion for both parent consolidation and name change detection shows aggregated data from a single reference row, making it unclear:
1. Which specific records are being merged/compared
2. What the "identical fields" actually mean (they look like a single person's data, not proof of identity)
3. What will be changed vs. what stays the same

**Root Causes:**
- **Parent Consolidation**: Shows fields from only `group.affectedRows[0]` as "identical" – this is just one row's data, not a comparison. The user can't see that two different records really are the same person.
- **Name Change**: "Identisch (unverändert)" section lists shared fields, but without showing *both* rows side by side, the user can't confirm these rows belong to the same person.

## Solution: Person-Card Comparison Layout

Replace the current "identical/changed" split with an explicit **side-by-side person card layout** for both sections.

### Parent Consolidation – New Details Layout

For each group, show a **"Personen im Datensatz" grid** with one card per unique variant found in the data. Each card shows:
- A header: "Zeile X" or student name (e.g. "Max Eltempaar4")
- The current ID (highlighted if it differs from `correctId`)
- All relevant person fields: Vorname, Name, Strasse, PLZ, Ort, AHV

Below the person cards, a clear **"Was wird geändert?"** section:
- Only rows where `currentId !== correctId` get an arrow: `20408 → 20406`
- Rows that already have the correct ID get a green checkmark "Bereits korrekt"

Remove the confusing "Identische Felder (bleiben unverändert)" section. Instead, visually highlight *differences between person variants* using colored borders – if two cards have the same name/address, a subtle note "Felder übereinstimmend" appears.

**Key change in logic:** Instead of pulling fields from only `affectedRows[0]`, extract fields from **each affected row individually** and display them as separate person cards. This makes it immediately clear that these are two different data rows representing the same person.

### Name Change – New Details Layout

Replace the current layout with two explicit person cards:
- **Card "Zeile {fromRow} – bisheriger Name"**: gray background, shows Vorname, Name (old), Klasse, S_ID, S_AHV
- **Card "Zeile {error.row} – neuer Name"**: amber/warning background, shows same fields with new Name highlighted in amber

Each card is labeled with the row number and context. Below both cards, a note explains: "Beide Werte bleiben im Export unverändert, wenn Sie 'Ignorieren' wählen."

Remove the "Identisch (unverändert)" chip-list. Instead, identical fields are shown in both cards naturally – the user can see at a glance that Vorname, S_ID, Klasse match, and only the Name differs.

## Technical Implementation

**File to edit:** `src/components/import/Step3Validation.tsx`

### Changes:

**1. Parent Consolidation Details Block (lines ~1240–1278)**

Replace the current `<div className="border-t bg-muted/30 p-3 space-y-3">` contents with:

```
[Person Cards Grid]
  Per affectedRow: card showing row number, student name, current ID (red if wrong), 
  and all person fields (Vorname, Name, Strasse, PLZ, Ort, AHV) extracted from that specific row

[Was wird geändert? Section]
  Only show rows where currentId !== correctId
  Arrow: oldId → correctId  
  Rows already correct: "Bereits korrekt ✓"
```

Extract fields per row: `rows[r.row - 1]?.[`${prefix}${field}`]` for each `r` in `group.affectedRows`.

**2. Name Change Details Block (lines ~1419–1467)**

Replace the current layout with two explicit side-by-side person cards:

```
[Grid: 2 columns]
  Left card (gray):
    Header: "Zeile {entry.fromRow} · Bisheriger Eintrag"
    Name: {fromName}  ← label: "Name (aktuell)"
    Vorname, S_ID, Klasse from fromRow data
    
  Right card (amber):  
    Header: "Zeile {entry.error.row} · Neuer Eintrag"  
    Name: {toName}  ← label: "Name (neu)" — highlighted
    Vorname, S_ID, Klasse from toRow data

[Note below]
  "ℹ Bei «Ignorieren» bleiben beide Zeilen unverändert im Export."
```

The label changes from the vague "Identisch (unverändert)" chip-list to a natural card layout where identical fields are visible in both cards.

## Visual Design

- Person cards: `rounded-md border p-3 space-y-2 bg-background` with a subtle left border accent
- "Korrekte ID" card: `border-l-4 border-l-green-500`
- "Falsche ID" card: `border-l-4 border-l-destructive/60`
- "Bisheriger Name" card: `bg-muted/50`
- "Neuer Name" card: `bg-pupil-warning/10 border-pupil-warning/30`
- Highlighted changed value: amber text with bold weight
- Section title removed; cards are self-explanatory with their header labels
