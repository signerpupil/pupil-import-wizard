import { describe, it, expect } from 'vitest';
import type { ParsedRow, ValidationError } from '@/types/importTypes';
import { schuelerColumns } from '@/types/importTypes';

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

    const errors = validateData(rows, schuelerColumns);
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

    const errors = validateData(rows, schuelerColumns);
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

    const errors = validateData(rows, schuelerColumns);
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

    const errors = validateData(rows, schuelerColumns);
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

    const errors = validateData(rows, schuelerColumns);
    const overlapErrors = errors.filter(e => e.type === 'student_parent_id_overlap');
    
    expect(overlapErrors.length).toBeGreaterThan(0);
    expect(overlapErrors[0].message).toContain('ehem. Schüler');
  });

  it('should NOT flag same-row S_ID = P_ERZ_ID overlap', async () => {
    const { validateData } = await import('@/lib/fileParser');
    
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '10001', S_Name: 'Meier', S_Vorname: 'Thomas', P_ERZ1_ID: '10001', K_Name: '1A' }),
    ];

    const errors = validateData(rows, schuelerColumns);
    const overlapErrors = errors.filter(e => e.type === 'student_parent_id_overlap');
    
    // Same-row is handled by checkStudentIsParent, not this check
    expect(overlapErrors.length).toBe(0);
  });

  it('should detect multi-year scenario: former student becomes parent', async () => {
    const { validateData } = await import('@/lib/fileParser');
    
    // Simulate multi-year import: Meier Thomas was a student (born 1990),
    // now appears as P_ERZ1 of his child Meier Luca (born 2015)
    const rows: ParsedRow[] = [
      // Former student row (from older year)
      makeRow({ S_ID: '10001', S_AHV: '756.1111.2222.01', S_Name: 'Meier', S_Vorname: 'Thomas', S_Geburtsdatum: '15.06.1990', K_Name: '6A' }),
      // Current student whose parent is the former student
      makeRow({ S_ID: '10050', S_AHV: '756.3333.4444.01', S_Name: 'Meier', S_Vorname: 'Luca', S_Geburtsdatum: '10.03.2015', P_ERZ1_ID: '10001', P_ERZ1_Name: 'Meier', P_ERZ1_Vorname: 'Thomas', K_Name: '1A' }),
      // Another child of the same former student
      makeRow({ S_ID: '10051', S_AHV: '756.3333.4444.02', S_Name: 'Meier', S_Vorname: 'Sophie', S_Geburtsdatum: '22.08.2017', P_ERZ1_ID: '10001', P_ERZ1_Name: 'Meier', P_ERZ1_Vorname: 'Thomas', K_Name: 'KiGa1' }),
    ];

    const errors = validateData(rows, schuelerColumns);
    const overlapErrors = errors.filter(e => e.type === 'student_parent_id_overlap');
    
    // Should detect the overlap
    expect(overlapErrors.length).toBeGreaterThan(0);
    // Should contain "ehem. Schüler" hint since age diff is 25 years (>14)
    expect(overlapErrors[0].message).toContain('ehem. Schüler');
    // Should be a warning, not an error
    expect(overlapErrors[0].severity).toBe('warning');
    // Should reference the overlapping ID
    expect(overlapErrors[0].message).toContain('10001');
  });

  it('should flag overlap WITHOUT age hint when age difference is small (<14 years)', async () => {
    const { validateData } = await import('@/lib/fileParser');
    
    // Sibling scenario: S_ID accidentally used as P_ERZ_ID — likely an error
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '10001', S_Name: 'Meier', S_Vorname: 'Thomas', S_Geburtsdatum: '01.01.2010', K_Name: '5A' }),
      makeRow({ S_ID: '10050', S_Name: 'Meier', S_Vorname: 'Luca', S_Geburtsdatum: '15.03.2012', P_ERZ1_ID: '10001', P_ERZ1_Name: 'Meier', P_ERZ1_Vorname: 'Thomas', K_Name: '3A' }),
    ];

    const errors = validateData(rows, schuelerColumns);
    const overlapErrors = errors.filter(e => e.type === 'student_parent_id_overlap');
    
    expect(overlapErrors.length).toBeGreaterThan(0);
    // Should NOT contain "ehem. Schüler" since age diff is only 2 years
    expect(overlapErrors[0].message).not.toContain('ehem. Schüler');
  });

  it('should detect P_ERZ2_ID overlap as well', async () => {
    const { validateData } = await import('@/lib/fileParser');
    
    const rows: ParsedRow[] = [
      makeRow({ S_ID: '10001', S_Name: 'Meier', S_Vorname: 'Sandra', S_Geburtsdatum: '20.09.1988', K_Name: '6A' }),
      makeRow({ S_ID: '10060', S_Name: 'Meier', S_Vorname: 'Luca', S_Geburtsdatum: '15.03.2015', P_ERZ2_ID: '10001', P_ERZ2_Name: 'Meier', P_ERZ2_Vorname: 'Sandra', K_Name: '1A' }),
    ];

    const errors = validateData(rows, schuelerColumns);
    const overlapErrors = errors.filter(e => e.type === 'student_parent_id_overlap');
    
    expect(overlapErrors.length).toBeGreaterThan(0);
    expect(overlapErrors[0].message).toContain('10001');
    expect(overlapErrors[0].message).toContain('Sandra');
  });
});
