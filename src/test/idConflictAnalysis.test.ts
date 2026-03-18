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
    // Each person should get a unique replacement ID
    const replacements = new Set(groups[0].suggestedReplacements.values());
    expect(replacements.size).toBeGreaterThanOrEqual(2); // At least 2 different new IDs
    // Replacement IDs should follow the _D01 format
    for (const id of replacements) {
      expect(id).toMatch(/^0_D\d{2}$/);
    }
  });

  it('detects majority pattern', () => {
    // Meier appears in 5 rows, Müller in 1
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
    // Only Müller's row should get a new ID
    expect(groups[0].resolvableRows).toEqual([6]);
    // The replacement should be 123_D01
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
    expect(summary.byPattern.manual).toHaveLength(1);
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
});
