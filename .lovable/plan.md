

## Implementation Plan: Prioritized Improvements (Steps 1, 3–10)

### Overview
Implement 9 of 10 prioritized improvements from the UX/Engineering review. Step 2 (onboarding screenshots) is deferred — questions about it will be asked after implementation.

---

### Step 1: Refactor Step3Validation.tsx (split ~3300 lines)
**Type: Tech | Impact: High | Effort: L**

Extract the following inline UI sections into dedicated components:

| New Component | Lines (approx.) | Purpose |
|---|---|---|
| `ParentConsolidationCard.tsx` | ~1488–2140 | Eltern-ID consolidation UI (search, pagination, filter, inline AHV edit, diacritic unification) |
| `NameChangeCard.tsx` | ~2141–2384 | Name change detection card |
| `BulkCorrectionCard.tsx` | ~2385–2558 | Muster-Analyse / auto-fix card |
| `StepByStepModal.tsx` | ~2559–3008 | Step-by-step correction modal |
| `ErrorTable.tsx` | ~3009–3293 | Grouped error table with column collapsibles |

All business logic (useMemo hooks for parent groups, name changes, error grouping) stays in Step3Validation and is passed down as props. State that is purely UI-local (e.g. `parentConsolidationSearch`, `parentConsolidationPage`) moves into the new components.

---

### Step 3: Sticky Bottom Navigation Bar in Step 3
**Type: UX | Impact: High | Effort: S**

Add a sticky bottom bar to `Step3Validation` that shows:
- Open error count badge (red)
- Corrected count (green)
- "Weiter zur Vorschau" button

Uses `sticky bottom-0` with `bg-background border-t shadow-lg z-10`. Replaces the bottom `NavigationButtons` (top one stays as-is).

---

### Step 4: Formula Injection Protection in XLSX Exports
**Type: Security | Impact: High | Effort: S**

Create a `sanitizeCellValue(value: string)` utility in `src/lib/utils.ts` that:
- Detects values starting with `=`, `+`, `-`, `@`, `\t`, `\r`, `\n`
- Prepends a single quote `'` to neutralize formula execution
- Applied in: `fileParser.ts` (`exportToExcel`), `lehrpersonenExport.ts`, and any group/LP export paths

---

### Step 5: Fix Row-Indexing Bug
**Type: Tech/Bug | Impact: High | Effort: S**

**Bug**: `handleErrorCorrect` in `Index.tsx` uses `rowIndex - 1` (line 292) while `handleBulkCorrect` uses `c.row - 2` (line 325). Since `error.row = arrayIndex + 2`, the correct array access is `row - 2`.

Fix: Change `updated[rowIndex - 1]` → `updated[rowIndex - 2]` in `handleErrorCorrect`, and `correctedRows[rowIndex - 1]` → `correctedRows[rowIndex - 2]` in `getStudentName`.

---

### Step 6: State Refactor — useImportWizard Hook
**Type: Tech | Impact: Med | Effort: M**

Extract the 15+ `useState` calls from `Index.tsx` into a `useImportWizard` custom hook using `useReducer`. Actions: `SET_STEP`, `SET_IMPORT_TYPE`, `FILE_LOADED`, `COLUMNS_CHECKED`, `ERROR_CORRECT`, `BULK_CORRECT`, `RESET`. This centralizes state transitions and eliminates the risk of partial updates.

---

### Step 7: Loading Indicator for Large File Validation
**Type: UX | Impact: Med | Effort: S**

When transitioning from Step 2 → Step 3 (`handleNext` in Index.tsx), if `parseResult.rows.length > 200`, show a loading overlay with a spinner and "Daten werden validiert..." text. Use a short `setTimeout` to let the UI render before calling `validateData`.

---

### Step 8: Success State When 0 Errors
**Type: UX | Impact: Med | Effort: S**

In `Step3Validation`, when `uncorrectedErrors.length === 0` and `errors.length === 0`:
- Show a full-width success card with a checkmark icon: "Keine Fehler gefunden — Ihre Daten sind bereit für den Export."
- Hide the error table and correction tools
- Auto-focus the "Weiter" button

---

### Step 9: Unify Inline Editing UX
**Type: UX | Impact: Low | Effort: S**

Currently the Lehrpersonen wizard uses pencil-on-hover for email/Beruf editing, while Step3Validation uses click-to-edit buttons. Standardize the Lehrpersonen approach to also use a small "Korrigieren" button (consistent with Step3), or vice versa. Keep both functional but ensure visual consistency (blue highlight for overrides, same save/cancel interaction).

---

### Step 10: Email Format Validation on Inline Edit
**Type: UX | Impact: Low | Effort: S**

In `LehrpersonenImportWizard.tsx`, when saving an inline email edit:
- Validate against a basic email regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
- If invalid, show a toast warning (not blocking) and highlight the cell in orange
- Still allow saving (the user may intentionally clear a field)

---

### Step 2 — Deferred (Screenshots Needed)
After implementing the above, I will ask you:
1. Which import steps need screenshot guides? (Stammdaten Step 1, Lehrpersonen Step 1, Gruppen Step 1?)
2. How many screenshots per guide?
3. Should guides be open by default for first-time users?

---

### Execution Order
1. **Step 5** (bug fix — critical, 5 min)
2. **Step 4** (security — small, high impact)
3. **Step 8** (success state — small UX win)
4. **Step 3** (sticky nav — small UX win)
5. **Step 10** (email validation — small)
6. **Step 7** (loading indicator — small)
7. **Step 9** (unify editing UX — small)
8. **Step 1** (refactor Step3 — largest change, done last to minimize conflict risk)
9. **Step 6** (state refactor — done after Step 1 since both touch Index.tsx)

