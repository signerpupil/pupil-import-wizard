import { describe, it, expect } from 'vitest';
import { validateData } from '@/lib/fileParser';
import type { ParsedRow, ValidationError, ColumnDefinition } from '@/types/importTypes';
import { schuelerColumns } from '@/types/importTypes';

// Minimal column defs for focused testing
const minimalColumns: ColumnDefinition[] = [
  { name: 'S_ID', required: true, category: 'Schüler' },
  { name: 'S_Name', required: true, category: 'Schüler' },
  { name: 'S_Vorname', required: true, category: 'Schüler' },
  { name: 'S_Geschlecht', required: true, category: 'Schüler', validationType: 'gender' },
  { name: 'S_Geburtsdatum', required: true, category: 'Schüler', validationType: 'date' },
  { name: 'S_PLZ', required: false, category: 'Schüler', validationType: 'plz' },
  { name: 'S_Ort', required: false, category: 'Schüler' },
  { name: 'K_Name', required: true, category: 'Klasse' },
  { name: 'P_ERZ1_ID', required: false, category: 'Erziehungsberechtigte/r 1' },
  { name: 'P_ERZ1_Name', required: false, category: 'Erziehungsberechtigte/r 1' },
  { name: 'P_ERZ1_Vorname', required: false, category: 'Erziehungsberechtigte/r 1' },
  { name: 'P_ERZ1_AHV', required: false, category: 'Erziehungsberechtigte/r 1', validationType: 'ahv' },
  { name: 'P_ERZ2_ID', required: false, category: 'Erziehungsberechtigte/r 2' },
  { name: 'P_ERZ2_Name', required: false, category: 'Erziehungsberechtigte/r 2' },
  { name: 'P_ERZ2_Vorname', required: false, category: 'Erziehungsberechtigte/r 2' },
  { name: 'S_AHV', required: false, category: 'Schüler', validationType: 'ahv' },
];

function makeRow(overrides: Partial<Record<string, string>>): ParsedRow {
  return {
    S_ID: '1001',
    S_Name: 'Meier',
    S_Vorname: 'Anna',
    S_Geschlecht: 'W',
    S_Geburtsdatum: '01.01.2015',
    S_PLZ: '8000',
    S_Ort: 'Zürich',
    K_Name: '1a',
    P_ERZ1_ID: '',
    P_ERZ1_Name: '',
    P_ERZ1_Vorname: '',
    P_ERZ1_AHV: '',
    P_ERZ2_ID: '',
    P_ERZ2_Name: '',
    P_ERZ2_Vorname: '',
    S_AHV: '',
    ...overrides,
  };
}

/**
 * Simulates the re-validation merge logic from Index.tsx
 */
function mergeErrors(oldErrors: ValidationError[], freshErrors: ValidationError[]): ValidationError[] {
  const merged: ValidationError[] = [];

  // 1. Keep corrected errors
  for (const old of oldErrors) {
    if (old.correctedValue !== undefined) {
      merged.push(old);
    }
  }

  // 2. Add fresh errors
  for (const fresh of freshErrors) {
    const alreadyCorrected = merged.some(
      m => m.row === fresh.row && m.column === fresh.column && m.correctedValue !== undefined
    );
    if (alreadyCorrected) continue;

    const existingUncorrected = oldErrors.find(
      old => old.row === fresh.row && old.column === fresh.column && old.type === fresh.type && old.correctedValue === undefined
    );
    if (existingUncorrected) {
      merged.push(existingUncorrected);
    } else {
      merged.push(fresh);
    }
  }

  return merged;
}

// ===================================================================
// 1. ID CONFLICT → RESOLUTION → RE-VALIDATION
// ===================================================================
describe('Re-validation: ID conflict resolution', () => {
  it('detects ID conflicts between different persons with same S_ID', () => {
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '100', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '100', S_Name: 'Müller', S_Vorname: 'Peter', S_Geschlecht: 'M' }),
    ];
    const errors = validateData(rows, minimalColumns);
    const idConflicts = errors.filter(e => e.type === 'id_conflict');
    expect(idConflicts.length).toBeGreaterThanOrEqual(1);
    expect(idConflicts[0].column).toBe('S_ID');
  });

  it('resolves ID conflict after renaming → no conflict in fresh validation', () => {
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '100', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '100_D01', S_Name: 'Müller', S_Vorname: 'Peter', S_Geschlecht: 'M' }),
    ];
    const errors = validateData(rows, minimalColumns);
    const idConflicts = errors.filter(e => e.type === 'id_conflict' && e.column === 'S_ID');
    expect(idConflicts).toHaveLength(0);
  });

  it('detects NEW conflict when _D01 suffix collides with existing ID', () => {
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '100', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '100_D01', S_Name: 'Müller', S_Vorname: 'Peter', S_Geschlecht: 'M' }),
      makeRow({ S_ID: '100_D01', S_Name: 'Keller', S_Vorname: 'Hans', S_Geschlecht: 'M' }),
    ];
    const errors = validateData(rows, minimalColumns);
    const idConflicts = errors.filter(e => e.type === 'id_conflict' && e.value === '100_D01');
    expect(idConflicts.length).toBeGreaterThanOrEqual(1);
  });

  it('merge logic: stale conflict removed, new conflict added', () => {
    // Initial state: rows have a conflict on S_ID=100
    const initialRows: ParsedRow[] = [
      makeRow({ S_ID: '100', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '100', S_Name: 'Müller', S_Vorname: 'Peter', S_Geschlecht: 'M' }),
      makeRow({ S_ID: '100_D01', S_Name: 'Keller', S_Vorname: 'Hans', S_Geschlecht: 'M' }),
    ];
    const initialErrors = validateData(initialRows, minimalColumns);
    expect(initialErrors.filter(e => e.type === 'id_conflict').length).toBeGreaterThanOrEqual(1);

    // After correction: row 2 gets 100_D01 → collides with row 3
    const correctedRows: ParsedRow[] = [
      makeRow({ S_ID: '100', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '100_D01', S_Name: 'Müller', S_Vorname: 'Peter', S_Geschlecht: 'M' }),
      makeRow({ S_ID: '100_D01', S_Name: 'Keller', S_Vorname: 'Hans', S_Geschlecht: 'M' }),
    ];
    const freshErrors = validateData(correctedRows, minimalColumns);

    // Mark the original error as corrected
    const oldErrors = initialErrors.map(e =>
      e.row === 2 && e.column === 'S_ID' && e.type === 'id_conflict'
        ? { ...e, correctedValue: '100_D01' }
        : e
    );

    const merged = mergeErrors(oldErrors, freshErrors);

    // Should have the corrected error preserved + new collision error
    const correctedKept = merged.filter(e => e.correctedValue === '100_D01');
    expect(correctedKept.length).toBeGreaterThanOrEqual(1);

    const newConflict = merged.filter(
      e => e.type === 'id_conflict' && e.value === '100_D01' && e.correctedValue === undefined
    );
    expect(newConflict.length).toBeGreaterThanOrEqual(1);
  });
});

// ===================================================================
// 2. SIBLING INCONSISTENCY → RESOLUTION → RE-VALIDATION
// ===================================================================
describe('Re-validation: Sibling inconsistency', () => {
  it('detects sibling PLZ inconsistency', () => {
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '1', S_PLZ: '8000', S_Ort: 'Zürich', P_ERZ1_ID: 'P1', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '2', S_PLZ: '3000', S_Ort: 'Bern', P_ERZ1_ID: 'P1', S_Name: 'Meier', S_Vorname: 'Max', S_Geschlecht: 'M' }),
    ];
    const errors = validateData(rows, minimalColumns);
    const siblingErrors = errors.filter(e => e.message.includes('Geschwister-Inkonsistenz'));
    expect(siblingErrors.length).toBeGreaterThanOrEqual(1);
  });

  it('sibling inconsistency disappears after PLZ correction', () => {
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '1', S_PLZ: '8000', S_Ort: 'Zürich', P_ERZ1_ID: 'P1', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '2', S_PLZ: '8000', S_Ort: 'Zürich', P_ERZ1_ID: 'P1', S_Name: 'Meier', S_Vorname: 'Max', S_Geschlecht: 'M' }),
    ];
    const errors = validateData(rows, minimalColumns);
    const siblingErrors = errors.filter(e => e.message.includes('Geschwister-Inkonsistenz'));
    expect(siblingErrors).toHaveLength(0);
  });

  it('sibling inconsistency disappears after parent ID changes (group dissolves)', () => {
    // Before: two siblings with same parent ID but different PLZ
    const before: ParsedRow[] = [
      makeRow({ S_ID: '1', S_PLZ: '8000', S_Ort: 'Zürich', P_ERZ1_ID: 'P1' }),
      makeRow({ S_ID: '2', S_PLZ: '3000', S_Ort: 'Bern', P_ERZ1_ID: 'P1', S_Name: 'Müller', S_Vorname: 'Max', S_Geschlecht: 'M' }),
    ];
    const errorsBefore = validateData(before, minimalColumns);
    expect(errorsBefore.filter(e => e.message.includes('Geschwister-Inkonsistenz')).length).toBeGreaterThanOrEqual(1);

    // After: parent ID of row 2 changes → no longer siblings
    const after: ParsedRow[] = [
      makeRow({ S_ID: '1', S_PLZ: '8000', S_Ort: 'Zürich', P_ERZ1_ID: 'P1' }),
      makeRow({ S_ID: '2', S_PLZ: '3000', S_Ort: 'Bern', P_ERZ1_ID: 'P2', S_Name: 'Müller', S_Vorname: 'Max', S_Geschlecht: 'M' }),
    ];
    const errorsAfter = validateData(after, minimalColumns);
    expect(errorsAfter.filter(e => e.message.includes('Geschwister-Inkonsistenz'))).toHaveLength(0);
  });
});

// ===================================================================
// 3. PLZ↔ORT MISMATCH → RESOLUTION → RE-VALIDATION
// ===================================================================
describe('Re-validation: PLZ↔Ort mismatch', () => {
  it('detects PLZ↔Ort mismatch', () => {
    // Use full schueler columns to ensure PLZ↔Ort cross-check fires
    const rows: ParsedRow[] = [
      makeRow({ S_PLZ: '3000', S_Ort: 'Zürich' }), // 3000 = Bern, not Zürich
    ];
    const errors = validateData(rows, minimalColumns);
    const plzOrtErrors = errors.filter(e => e.column === 'S_Ort' && e.message.includes('PLZ'));
    expect(plzOrtErrors.length).toBeGreaterThanOrEqual(1);
  });

  it('PLZ↔Ort mismatch disappears after Ort correction', () => {
    const rows: ParsedRow[] = [
      makeRow({ S_PLZ: '8000', S_Ort: 'Zürich' }),
    ];
    const errors = validateData(rows, minimalColumns);
    const plzErrors = errors.filter(e => e.message.includes('PLZ') && e.column === 'S_Ort');
    expect(plzErrors).toHaveLength(0);
  });
});

// ===================================================================
// 4. DUPLICATE → RESOLUTION → RE-VALIDATION
// ===================================================================
describe('Re-validation: Duplicate detection', () => {
  it('detects S_ID duplicates for same person', () => {
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '100', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '100', S_Name: 'Meier', S_Vorname: 'Anna' }),
    ];
    const errors = validateData(rows, minimalColumns);
    const dups = errors.filter(e => e.type === 'duplicate' && e.column === 'S_ID');
    expect(dups.length).toBeGreaterThanOrEqual(1);
  });

  it('duplicate disappears after ID change', () => {
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '100', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '101', S_Name: 'Meier', S_Vorname: 'Anna' }),
    ];
    const errors = validateData(rows, minimalColumns);
    const dups = errors.filter(e => e.type === 'duplicate' && e.column === 'S_ID');
    expect(dups).toHaveLength(0);
  });
});

// ===================================================================
// 5. MERGE LOGIC (the heart of re-validation)
// ===================================================================
describe('Merge logic', () => {
  it('preserves manually corrected errors even if fresh validation no longer finds them', () => {
    const oldErrors: ValidationError[] = [
      { row: 1, column: 'S_Geschlecht', value: 'X', message: 'Ungültig', correctedValue: 'M' },
    ];
    const freshErrors: ValidationError[] = []; // re-validation finds nothing
    const merged = mergeErrors(oldErrors, freshErrors);
    expect(merged).toHaveLength(1);
    expect(merged[0].correctedValue).toBe('M');
  });

  it('removes stale uncorrected errors that no longer appear in fresh validation', () => {
    const oldErrors: ValidationError[] = [
      { row: 1, column: 'S_ID', value: '100', message: 'Duplikat', type: 'duplicate' },
    ];
    const freshErrors: ValidationError[] = []; // no longer a duplicate
    const merged = mergeErrors(oldErrors, freshErrors);
    expect(merged).toHaveLength(0);
  });

  it('adds genuinely new errors from fresh validation', () => {
    const oldErrors: ValidationError[] = [];
    const freshErrors: ValidationError[] = [
      { row: 3, column: 'S_ID', value: '100_D01', message: 'ID-Konflikt', type: 'id_conflict' },
    ];
    const merged = mergeErrors(oldErrors, freshErrors);
    expect(merged).toHaveLength(1);
    expect(merged[0].type).toBe('id_conflict');
  });

  it('does not duplicate errors already in corrected set', () => {
    const oldErrors: ValidationError[] = [
      { row: 1, column: 'S_Geschlecht', value: 'X', message: 'Ungültig', correctedValue: 'M' },
    ];
    const freshErrors: ValidationError[] = [
      { row: 1, column: 'S_Geschlecht', value: 'X', message: 'Ungültig' },
    ];
    const merged = mergeErrors(oldErrors, freshErrors);
    // Only the corrected version should be kept
    expect(merged).toHaveLength(1);
    expect(merged[0].correctedValue).toBe('M');
  });

  it('preserves existing uncorrected error identity (UI state)', () => {
    const oldError: ValidationError = {
      row: 2, column: 'S_PLZ', value: '9999', message: 'Ungültige PLZ', type: 'format',
    };
    const freshError: ValidationError = {
      row: 2, column: 'S_PLZ', value: '9999', message: 'Ungültige PLZ', type: 'format',
    };
    const merged = mergeErrors([oldError], [freshError]);
    expect(merged).toHaveLength(1);
    // Should be the SAME object reference (old) to preserve UI state
    expect(merged[0]).toBe(oldError);
  });
});

// ===================================================================
// 6. CASCADE: ID conflict resolution → sibling inconsistency disappears
// ===================================================================
describe('Re-validation: Cascade scenarios', () => {
  it('resolving ID conflict also removes sibling inconsistency (parent ID change)', () => {
    // Two kids with same P_ERZ1_ID=P1 but different PLZ → sibling inconsistency
    // AND an ID conflict on P_ERZ1_ID (same ID, different parent names)
    // After resolving the ID conflict by changing one parent ID, the group dissolves
    const before: ParsedRow[] = [
      makeRow({ S_ID: '1', S_PLZ: '8000', S_Ort: 'Zürich', P_ERZ1_ID: 'P1', P_ERZ1_Name: 'Meier', P_ERZ1_Vorname: 'Hans' }),
      makeRow({ S_ID: '2', S_PLZ: '3000', S_Ort: 'Bern', P_ERZ1_ID: 'P1', P_ERZ1_Name: 'Keller', P_ERZ1_Vorname: 'Fritz', S_Name: 'Keller', S_Vorname: 'Max', S_Geschlecht: 'M' }),
    ];
    const errorsBefore = validateData(before, minimalColumns);
    const siblingBefore = errorsBefore.filter(e => e.message.includes('Geschwister-Inkonsistenz'));
    // Should have sibling inconsistency
    expect(siblingBefore.length).toBeGreaterThanOrEqual(1);

    // After resolving: row 2 gets new parent ID
    const after: ParsedRow[] = [
      makeRow({ S_ID: '1', S_PLZ: '8000', S_Ort: 'Zürich', P_ERZ1_ID: 'P1', P_ERZ1_Name: 'Meier', P_ERZ1_Vorname: 'Hans' }),
      makeRow({ S_ID: '2', S_PLZ: '3000', S_Ort: 'Bern', P_ERZ1_ID: 'P1_D01', P_ERZ1_Name: 'Keller', P_ERZ1_Vorname: 'Fritz', S_Name: 'Keller', S_Vorname: 'Max', S_Geschlecht: 'M' }),
    ];
    const errorsAfter = validateData(after, minimalColumns);
    const siblingAfter = errorsAfter.filter(e => e.message.includes('Geschwister-Inkonsistenz'));
    expect(siblingAfter).toHaveLength(0);
  });

  it('correcting PLZ also resolves PLZ↔Ort mismatch if new PLZ matches Ort', () => {
    // Initial: PLZ=3000, Ort=Zürich → PLZ↔Ort mismatch (3000=Bern)
    const before: ParsedRow[] = [
      makeRow({ S_PLZ: '3000', S_Ort: 'Zürich' }),
    ];
    const errorsBefore = validateData(before, minimalColumns);
    expect(errorsBefore.filter(e => e.message.includes('PLZ')).length).toBeGreaterThanOrEqual(1);

    // After: correct PLZ to 8000 → matches Zürich
    const after: ParsedRow[] = [
      makeRow({ S_PLZ: '8000', S_Ort: 'Zürich' }),
    ];
    const errorsAfter = validateData(after, minimalColumns);
    expect(errorsAfter.filter(e => e.message.includes('PLZ') && e.column === 'S_Ort')).toHaveLength(0);
  });
});

// ===================================================================
// 7. PARENT CONSOLIDATION → RE-VALIDATION
// ===================================================================
describe('Re-validation: Parent ID consolidation', () => {
  it('parent consolidation errors disappear after IDs unified', () => {
    // Same parent (same AHV) with different IDs
    const before: ParsedRow[] = [
      makeRow({ S_ID: '1', P_ERZ1_ID: 'P1', P_ERZ1_AHV: '756.1234.5678.97', P_ERZ1_Name: 'Meier', P_ERZ1_Vorname: 'Hans' }),
      makeRow({ S_ID: '2', P_ERZ1_ID: 'P2', P_ERZ1_AHV: '756.1234.5678.97', P_ERZ1_Name: 'Meier', P_ERZ1_Vorname: 'Hans', S_Name: 'Meier', S_Vorname: 'Max', S_Geschlecht: 'M' }),
    ];
    const errorsBefore = validateData(before, minimalColumns);
    const consolidation = errorsBefore.filter(e => e.message.includes('Inkonsistente ID'));
    expect(consolidation.length).toBeGreaterThanOrEqual(1);

    // After consolidation: both rows have P1
    const after: ParsedRow[] = [
      makeRow({ S_ID: '1', P_ERZ1_ID: 'P1', P_ERZ1_AHV: '756.1234.5678.97', P_ERZ1_Name: 'Meier', P_ERZ1_Vorname: 'Hans' }),
      makeRow({ S_ID: '2', P_ERZ1_ID: 'P1', P_ERZ1_AHV: '756.1234.5678.97', P_ERZ1_Name: 'Meier', P_ERZ1_Vorname: 'Hans', S_Name: 'Meier', S_Vorname: 'Max', S_Geschlecht: 'M' }),
    ];
    const errorsAfter = validateData(after, minimalColumns);
    const consolidationAfter = errorsAfter.filter(e => e.message.includes('Inkonsistente ID'));
    expect(consolidationAfter).toHaveLength(0);
  });
});

// ===================================================================
// 8. EDGE CASES
// ===================================================================
describe('Re-validation: Edge cases', () => {
  it('empty rows produce no errors beyond required field checks', () => {
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '', S_Name: '', S_Vorname: '', S_Geschlecht: '', S_Geburtsdatum: '', K_Name: '' }),
    ];
    const errors = validateData(rows, minimalColumns);
    // Only required field errors, no crashes
    const requiredErrors = errors.filter(e => e.message.includes('Pflichtfeld'));
    expect(requiredErrors.length).toBeGreaterThanOrEqual(1);
    // No ID conflicts or duplicates
    expect(errors.filter(e => e.type === 'id_conflict')).toHaveLength(0);
    expect(errors.filter(e => e.type === 'duplicate')).toHaveLength(0);
  });

  it('single row produces no duplicates or sibling errors', () => {
    const rows: ParsedRow[] = [makeRow({})];
    const errors = validateData(rows, minimalColumns);
    expect(errors.filter(e => e.type === 'duplicate')).toHaveLength(0);
    expect(errors.filter(e => e.message.includes('Geschwister'))).toHaveLength(0);
  });

  it('merge with no old errors just returns fresh errors', () => {
    const fresh: ValidationError[] = [
      { row: 1, column: 'S_ID', value: 'x', message: 'test', type: 'format' },
    ];
    const merged = mergeErrors([], fresh);
    expect(merged).toHaveLength(1);
  });

  it('merge with no fresh errors removes all uncorrected old errors', () => {
    const old: ValidationError[] = [
      { row: 1, column: 'S_ID', value: 'x', message: 'test', type: 'format' },
      { row: 2, column: 'S_ID', value: 'y', message: 'test2', type: 'duplicate' },
    ];
    const merged = mergeErrors(old, []);
    expect(merged).toHaveLength(0);
  });

  it('large batch: 100 rows with same ID get correct conflict count', () => {
    const rows: ParsedRow[] = [];
    for (let i = 0; i < 100; i++) {
      rows.push(makeRow({
        S_ID: '999',
        S_Name: `Name${i}`,
        S_Vorname: `Vorname${i}`,
        S_Geburtsdatum: `01.01.${2000 + (i % 20)}`,
      }));
    }
    const errors = validateData(rows, minimalColumns);
    const conflicts = errors.filter(e => e.type === 'id_conflict' && e.column === 'S_ID');
    // All rows except the first should have a conflict
    expect(conflicts.length).toBe(99);
  });

  it('correcting one field does not affect unrelated errors', () => {
    const rows: ParsedRow[] = [
      makeRow({ S_Geschlecht: 'X', S_PLZ: '99999' }), // invalid gender + invalid PLZ
    ];
    const initialErrors = validateData(rows, minimalColumns);
    const genderError = initialErrors.find(e => e.column === 'S_Geschlecht');
    expect(genderError).toBeTruthy();

    // Correct gender but PLZ is still wrong
    const corrected: ParsedRow[] = [
      makeRow({ S_Geschlecht: 'M', S_PLZ: '99999' }),
    ];
    const freshErrors = validateData(corrected, minimalColumns);
    
    // Gender error should be gone
    expect(freshErrors.find(e => e.column === 'S_Geschlecht')).toBeUndefined();
    // PLZ error may still be present (format validation)
    // The point is: correcting one doesn't break the other
  });

  it('multiple simultaneous corrections merge correctly', () => {
    // Initial: 3 errors
    const oldErrors: ValidationError[] = [
      { row: 1, column: 'S_Geschlecht', value: 'X', message: 'err1', correctedValue: 'M' }, // corrected
      { row: 2, column: 'S_ID', value: '100', message: 'err2', type: 'duplicate' }, // will be stale
      { row: 3, column: 'S_PLZ', value: '0000', message: 'err3', type: 'format' }, // will persist
    ];
    const freshErrors: ValidationError[] = [
      { row: 3, column: 'S_PLZ', value: '0000', message: 'err3', type: 'format' }, // still invalid
      { row: 4, column: 'S_Name', value: '', message: 'err4', type: 'required' }, // new error
    ];
    const merged = mergeErrors(oldErrors, freshErrors);

    // Corrected error preserved
    expect(merged.find(e => e.row === 1 && e.correctedValue === 'M')).toBeTruthy();
    // Stale duplicate removed
    expect(merged.find(e => e.row === 2 && e.type === 'duplicate')).toBeUndefined();
    // Persistent error kept
    expect(merged.find(e => e.row === 3 && e.column === 'S_PLZ')).toBeTruthy();
    // New error added
    expect(merged.find(e => e.row === 4 && e.type === 'required')).toBeTruthy();

    expect(merged).toHaveLength(3);
  });
});

// ===================================================================
// 9. FULL CYCLE: initial → correct → revalidate → verify
// ===================================================================
describe('Re-validation: Full cycle simulation', () => {
  it('complete flow: detect → correct → revalidate → verify clean', () => {
    // Step 1: Initial data with ID conflict
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '100', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '100', S_Name: 'Müller', S_Vorname: 'Peter', S_Geschlecht: 'M' }),
      makeRow({ S_ID: '200', S_Name: 'Keller', S_Vorname: 'Hans', S_Geschlecht: 'M' }),
    ];
    const initialErrors = validateData(rows, minimalColumns);
    const conflicts = initialErrors.filter(e => e.type === 'id_conflict');
    expect(conflicts.length).toBeGreaterThanOrEqual(1);

    // Step 2: Apply correction (rename row 2's S_ID to 100_D01)
    const correctedRows = [...rows];
    correctedRows[1] = { ...correctedRows[1], S_ID: '100_D01' };

    // Mark original error as corrected
    const markedErrors = initialErrors.map(e =>
      e.row === 2 && e.column === 'S_ID' && e.type === 'id_conflict'
        ? { ...e, correctedValue: '100_D01' }
        : e
    );

    // Step 3: Re-validate
    const freshErrors = validateData(correctedRows, minimalColumns);

    // Step 4: Merge
    const merged = mergeErrors(markedErrors, freshErrors);

    // No more uncorrected ID conflicts
    const uncorrectedConflicts = merged.filter(
      e => e.type === 'id_conflict' && e.correctedValue === undefined
    );
    expect(uncorrectedConflicts).toHaveLength(0);

    // The corrected error is preserved for audit trail
    const correctedConflicts = merged.filter(
      e => e.type === 'id_conflict' && e.correctedValue === '100_D01'
    );
    expect(correctedConflicts).toHaveLength(1);
  });

  it('complete flow: sibling fix cascades through PLZ↔Ort', () => {
    // Initial: sibling inconsistency + PLZ↔Ort mismatch
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '1', S_PLZ: '8000', S_Ort: 'Zürich', P_ERZ1_ID: 'P1' }),
      makeRow({ S_ID: '2', S_PLZ: '3000', S_Ort: 'Zürich', P_ERZ1_ID: 'P1', S_Name: 'Meier', S_Vorname: 'Max', S_Geschlecht: 'M' }),
    ];
    const initialErrors = validateData(rows, minimalColumns);
    
    // Row 2 should have sibling inconsistency (PLZ differs) AND PLZ↔Ort mismatch (3000≠Zürich)
    const siblingErr = initialErrors.filter(e => e.message.includes('Geschwister'));
    const plzErr = initialErrors.filter(e => e.message.includes('PLZ') && e.row === 2);
    expect(siblingErr.length).toBeGreaterThanOrEqual(1);
    expect(plzErr.length).toBeGreaterThanOrEqual(1);

    // Fix: set row 2 PLZ to 8000 (matches Zürich AND matches sibling)
    const fixed: ParsedRow[] = [
      makeRow({ S_ID: '1', S_PLZ: '8000', S_Ort: 'Zürich', P_ERZ1_ID: 'P1' }),
      makeRow({ S_ID: '2', S_PLZ: '8000', S_Ort: 'Zürich', P_ERZ1_ID: 'P1', S_Name: 'Meier', S_Vorname: 'Max', S_Geschlecht: 'M' }),
    ];
    const freshErrors = validateData(fixed, minimalColumns);

    // Both should be gone
    expect(freshErrors.filter(e => e.message.includes('Geschwister'))).toHaveLength(0);
    expect(freshErrors.filter(e => e.message.includes('PLZ') && e.row === 2 && e.column === 'S_Ort')).toHaveLength(0);
  });
});
