import { describe, it, expect } from 'vitest';
import { analyzeIdConflicts, getConflictSummary } from '@/lib/idConflictAnalysis';
import type { ValidationError, ParsedRow } from '@/types/importTypes';

function makeRow(overrides: Record<string, string>): ParsedRow {
  return {
    S_ID: '', S_AHV: '', S_Name: '', S_Vorname: '', S_Geburtsdatum: '',
    P_ERZ1_ID: '', P_ERZ1_Name: '', P_ERZ1_Vorname: '', P_ERZ1_AHV: '',
    ...overrides,
  };
}

function makeConflictError(row: number, column: string, value: string, refRow: number): ValidationError {
  return {
    row,
    column,
    value,
    message: `ID-Konflikt: "${value}" wird in Zeile ${refRow} von einer anderen Person verwendet`,
    type: 'id_conflict',
    severity: 'error',
  };
}

describe('ID Conflict Analysis', () => {
  it('detects placeholder IDs (value "0")', () => {
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '0', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '0', S_Name: 'Müller', S_Vorname: 'Peter' }),
      makeRow({ S_ID: '0', S_Name: 'Keller', S_Vorname: 'Hans' }),
    ];
    const errors: ValidationError[] = [
      makeConflictError(2, 'S_ID', '0', 1),
      makeConflictError(3, 'S_ID', '0', 1),
    ];

    const groups = analyzeIdConflicts(errors, rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].pattern).toBe('placeholder');
    expect(groups[0].resolvableRows.length).toBeGreaterThan(0);
    const replacements = new Set(groups[0].suggestedReplacements.values());
    expect(replacements.size).toBeGreaterThanOrEqual(2);
    for (const id of replacements) {
      expect(id).toMatch(/^0_D\d{2}$/);
    }
  });

  it('detects majority pattern', () => {
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '123', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '123', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '123', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '123', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '123', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '123', S_Name: 'Müller', S_Vorname: 'Peter' }),
    ];
    const errors: ValidationError[] = [
      makeConflictError(2, 'S_ID', '123', 1),
      makeConflictError(3, 'S_ID', '123', 1),
      makeConflictError(4, 'S_ID', '123', 1),
      makeConflictError(5, 'S_ID', '123', 1),
      makeConflictError(6, 'S_ID', '123', 1),
    ];

    const groups = analyzeIdConflicts(errors, rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].pattern).toBe('majority');
    expect(groups[0].ownerPerson?.name).toBe('Meier');
    expect(groups[0].resolvableRows).toEqual([6]);
    expect(groups[0].suggestedReplacements.get(6)).toBe('123_D01');
  });

  it('auto-assigns new ID to second person when no clear majority', () => {
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '555', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '555', S_Name: 'Müller', S_Vorname: 'Peter' }),
    ];
    const errors: ValidationError[] = [
      makeConflictError(2, 'S_ID', '555', 1),
    ];

    const groups = analyzeIdConflicts(errors, rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].pattern).toBe('auto_second');
    expect(groups[0].resolvableRows).toEqual([2]);
    expect(groups[0].ownerPerson?.name).toBe('Meier');
    expect(groups[0].suggestedReplacements.get(2)).toBe('555_D01');
  });

  it('ignores corrected errors', () => {
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '0', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '0', S_Name: 'Müller', S_Vorname: 'Peter' }),
    ];
    const errors: ValidationError[] = [
      { ...makeConflictError(2, 'S_ID', '0', 1), correctedValue: '' },
    ];

    const groups = analyzeIdConflicts(errors, rows);
    expect(groups).toHaveLength(0);
  });

  it('provides correct summary statistics', () => {
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '0', S_Name: 'A', S_Vorname: 'X' }),
      makeRow({ S_ID: '0', S_Name: 'B', S_Vorname: 'Y' }),
      makeRow({ S_ID: '555', S_Name: 'C', S_Vorname: 'Z' }),
      makeRow({ S_ID: '555', S_Name: 'D', S_Vorname: 'W' }),
    ];
    const errors: ValidationError[] = [
      makeConflictError(2, 'S_ID', '0', 1),
      makeConflictError(4, 'S_ID', '555', 3),
    ];

    const groups = analyzeIdConflicts(errors, rows);
    const summary = getConflictSummary(groups);
    expect(summary.totalGroups).toBe(2);
    expect(summary.byPattern.placeholder).toHaveLength(1);
    expect(summary.byPattern.auto_second).toHaveLength(1);
  });

  it('handles parent ID conflicts', () => {
    const rows: ParsedRow[] = [
      makeRow({ P_ERZ1_ID: '999', P_ERZ1_Name: 'Rossi', P_ERZ1_Vorname: 'Antonio' }),
      makeRow({ P_ERZ1_ID: '999', P_ERZ1_Name: 'Weber', P_ERZ1_Vorname: 'Maria' }),
    ];
    const errors: ValidationError[] = [
      makeConflictError(2, 'P_ERZ1_ID', '999', 1),
    ];

    const groups = analyzeIdConflicts(errors, rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].pattern).toBe('placeholder');
    expect(groups[0].persons).toHaveLength(2);
  });

  // --- New tests for post-correction scenarios ---

  it('conflict disappears when row data has been corrected', () => {
    // Simulate: rows already updated with new IDs after bulk correction
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '555', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '555_D01', S_Name: 'Müller', S_Vorname: 'Peter' }), // already corrected
    ];
    // Error still exists from original validation
    const errors: ValidationError[] = [
      makeConflictError(2, 'S_ID', '555', 1),
    ];

    const groups = analyzeIdConflicts(errors, rows);
    // Row 2 no longer has value '555', so only 1 row matches → no conflict
    expect(groups).toHaveLength(0);
  });

  it('conflict disappears for placeholder after all rows corrected', () => {
    // All rows already received new IDs
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '0_D01', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '0_D02', S_Name: 'Müller', S_Vorname: 'Peter' }),
      makeRow({ S_ID: '0_D02', S_Name: 'Müller', S_Vorname: 'Peter' }),
    ];
    const errors: ValidationError[] = [
      makeConflictError(2, 'S_ID', '0', 1),
      makeConflictError(3, 'S_ID', '0', 1),
    ];

    const groups = analyzeIdConflicts(errors, rows);
    expect(groups).toHaveLength(0);
  });

  it('partial correction reduces group but keeps remaining conflict', () => {
    // 3 persons share ID '0', only person 1 corrected so far
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '0_D01', S_Name: 'Meier', S_Vorname: 'Anna' }), // corrected
      makeRow({ S_ID: '0', S_Name: 'Müller', S_Vorname: 'Peter' }),    // still '0'
      makeRow({ S_ID: '0', S_Name: 'Keller', S_Vorname: 'Hans' }),     // still '0'
    ];
    const errors: ValidationError[] = [
      makeConflictError(2, 'S_ID', '0', 1),
      makeConflictError(3, 'S_ID', '0', 1),
    ];

    const groups = analyzeIdConflicts(errors, rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].persons).toHaveLength(2); // Müller and Keller
    // Meier is gone from the group
    expect(groups[0].persons.find(p => p.name === 'Meier')).toBeUndefined();
  });

  it('majority pattern: first row is minority and gets corrected', () => {
    // Row 1 is the minority person, rows 2-4 are the majority
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '777', S_Name: 'Müller', S_Vorname: 'Peter' }), // minority (1 row)
      makeRow({ S_ID: '777', S_Name: 'Meier', S_Vorname: 'Anna' }),   // majority
      makeRow({ S_ID: '777', S_Name: 'Meier', S_Vorname: 'Anna' }),
      makeRow({ S_ID: '777', S_Name: 'Meier', S_Vorname: 'Anna' }),
    ];
    const errors: ValidationError[] = [
      // Only errors for rows 2-4 referencing row 1
      makeConflictError(2, 'S_ID', '777', 1),
      makeConflictError(3, 'S_ID', '777', 1),
      makeConflictError(4, 'S_ID', '777', 1),
    ];

    const groups = analyzeIdConflicts(errors, rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].pattern).toBe('majority');
    expect(groups[0].ownerPerson?.name).toBe('Meier');
    // Row 1 (Müller) should be the resolvable one
    expect(groups[0].resolvableRows).toEqual([1]);
    expect(groups[0].suggestedReplacements.get(1)).toBe('777_D01');

    // Now simulate correction: row 1 gets new ID
    rows[0] = makeRow({ S_ID: '777_D01', S_Name: 'Müller', S_Vorname: 'Peter' });
    const groupsAfter = analyzeIdConflicts(errors, rows);
    expect(groupsAfter).toHaveLength(0); // Conflict resolved
  });
});
