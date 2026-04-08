import { describe, it, expect } from 'vitest';
import type { ParsedRow, ValidationError } from '@/types/importTypes';

// We need to test checkStudentIdDuplicates and checkStudentParentIdOverlap
// Since they're not exported, we'll test via validateData or replicate logic
// For now, import the full validation path

// Helper to create a minimal student row
function makeRow(overrides: Record<string, string | number>): ParsedRow {
  return {
    S_ID: '',
    S_Name: '',
    S_Vorname: '',
    S_Geschlecht: 'M',
    S_Geburtsdatum: '01.01.2010',
    S_AHV: '',
    K_Name: '1A',
    P_ERZ1_ID: '',
    P_ERZ1_Name: '',
    P_ERZ1_Vorname: '',
    P_ERZ2_ID: '',
    P_ERZ2_Name: '',
    P_ERZ2_Vorname: '',
    ...overrides,
  };
}

describe('Student Deduplication - AHV Strategy', () => {
  it('should detect same AHV with different S_IDs', async () => {
    // Dynamically import to get the function
    const { validateData } = await import('@/lib/fileParser');
    
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '10001', S_AHV: '756.1234.5678.01', S_Name: 'Meier', S_Vorname: 'Luca', K_Name: '1A' }),
      makeRow({ S_ID: '10099', S_AHV: '756.1234.5678.01', S_Name: 'Meier', S_Vorname: 'Luca', K_Name: 'Sek1A' }),
    ];

    const errors = validateData(rows, 'schueler');
    const dedupErrors = errors.filter(e => e.type === 'student_duplicate_id');
    
    expect(dedupErrors.length).toBeGreaterThan(0);
    expect(dedupErrors[0].message).toContain('756.1234.5678.01');
    expect(dedupErrors[0].message).toContain('10001');
    expect(dedupErrors[0].message).toContain('10099');
  });

  it('should NOT flag same AHV with same S_ID', async () => {
    const { validateData } = await import('@/lib/fileParser');
    
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '10001', S_AHV: '756.1234.5678.01', S_Name: 'Meier', S_Vorname: 'Luca', K_Name: '1A' }),
      makeRow({ S_ID: '10001', S_AHV: '756.1234.5678.01', S_Name: 'Meier', S_Vorname: 'Luca', K_Name: '1A' }),
    ];

    const errors = validateData(rows, 'schueler');
    const dedupErrors = errors.filter(e => e.type === 'student_duplicate_id');
    
    expect(dedupErrors.length).toBe(0);
  });
});

describe('Student Deduplication - Name+Birthday Strategy', () => {
  it('should detect same Name+Geburtsdatum with different S_IDs (no AHV)', async () => {
    const { validateData } = await import('@/lib/fileParser');
    
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '10001', S_AHV: '', S_Name: 'Müller', S_Vorname: 'Anna', S_Geburtsdatum: '15.03.2010', K_Name: '1A' }),
      makeRow({ S_ID: '10099', S_AHV: '', S_Name: 'Müller', S_Vorname: 'Anna', S_Geburtsdatum: '15.03.2010', K_Name: 'Sek1A' }),
    ];

    const errors = validateData(rows, 'schueler');
    const dedupErrors = errors.filter(e => e.type === 'student_duplicate_id');
    
    expect(dedupErrors.length).toBeGreaterThan(0);
    expect(dedupErrors[0].message).toContain('Name+Geburtsdatum');
  });
});

describe('Student-Parent ID Overlap', () => {
  it('should detect when P_ERZ1_ID matches S_ID in another row', async () => {
    const { validateData } = await import('@/lib/fileParser');
    
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '10001', S_Name: 'Meier', S_Vorname: 'Thomas', S_Geburtsdatum: '01.01.1985', K_Name: '6A' }),
      makeRow({ S_ID: '10050', S_Name: 'Meier', S_Vorname: 'Luca', S_Geburtsdatum: '15.03.2015', P_ERZ1_ID: '10001', P_ERZ1_Name: 'Meier', P_ERZ1_Vorname: 'Thomas', K_Name: '1A' }),
    ];

    const errors = validateData(rows, 'schueler');
    const overlapErrors = errors.filter(e => e.type === 'student_parent_id_overlap');
    
    expect(overlapErrors.length).toBeGreaterThan(0);
    expect(overlapErrors[0].message).toContain('10001');
    expect(overlapErrors[0].message).toContain('Thomas');
  });

  it('should show age hint when age difference is >14 years', async () => {
    const { validateData } = await import('@/lib/fileParser');
    
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '10001', S_Name: 'Meier', S_Vorname: 'Thomas', S_Geburtsdatum: '01.01.1985', K_Name: '6A' }),
      makeRow({ S_ID: '10050', S_Name: 'Meier', S_Vorname: 'Luca', S_Geburtsdatum: '15.03.2015', P_ERZ1_ID: '10001', P_ERZ1_Name: 'Meier', P_ERZ1_Vorname: 'Thomas', K_Name: '1A' }),
    ];

    const errors = validateData(rows, 'schueler');
    const overlapErrors = errors.filter(e => e.type === 'student_parent_id_overlap');
    
    expect(overlapErrors.length).toBeGreaterThan(0);
    expect(overlapErrors[0].message).toContain('ehem. Schüler');
  });

  it('should NOT flag same-row S_ID = P_ERZ_ID overlap', async () => {
    const { validateData } = await import('@/lib/fileParser');
    
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '10001', S_Name: 'Meier', S_Vorname: 'Thomas', P_ERZ1_ID: '10001', K_Name: '1A' }),
    ];

    const errors = validateData(rows, 'schueler');
    const overlapErrors = errors.filter(e => e.type === 'student_parent_id_overlap');
    
    // Same-row is handled by checkStudentIsParent, not this check
    expect(overlapErrors.length).toBe(0);
  });
});
