import { describe, it, expect } from 'vitest';
import { validateData, LANGUAGE_AUTO_CORRECTIONS, NATIONALITY_AUTO_CORRECTIONS } from '@/lib/fileParser';
import { formatEmail } from '@/lib/formatters';
import type { ColumnDefinition, ParsedRow } from '@/types/importTypes';

// Minimal column definitions for testing
const baseCols: ColumnDefinition[] = [
  { name: 'S_ID', required: true, validationType: 'text', category: 'student' },
  { name: 'S_AHV', required: false, validationType: 'ahv', category: 'student' },
  { name: 'S_Name', required: true, validationType: 'text', category: 'student' },
  { name: 'S_Vorname', required: true, validationType: 'text', category: 'student' },
  { name: 'S_Geschlecht', required: false, validationType: 'gender', category: 'student' },
  { name: 'S_Geburtsdatum', required: false, validationType: 'date', category: 'student' },
  { name: 'S_PLZ', required: false, validationType: 'plz', category: 'student' },
  { name: 'S_Ort', required: false, validationType: 'text', category: 'student' },
  { name: 'S_Muttersprache', required: false, validationType: 'language', category: 'student' },
  { name: 'S_Nationalitaet', required: false, validationType: 'nationality', category: 'student' },
  { name: 'P_ERZ1_ID', required: false, validationType: 'text', category: 'parent' },
  { name: 'P_ERZ1_AHV', required: false, validationType: 'ahv', category: 'parent' },
  { name: 'P_ERZ1_Name', required: false, validationType: 'text', category: 'parent' },
  { name: 'P_ERZ1_Vorname', required: false, validationType: 'text', category: 'parent' },
  { name: 'P_ERZ2_ID', required: false, validationType: 'text', category: 'parent' },
  { name: 'P_ERZ2_AHV', required: false, validationType: 'ahv', category: 'parent' },
  { name: 'P_ERZ2_Name', required: false, validationType: 'text', category: 'parent' },
  { name: 'P_ERZ2_Vorname', required: false, validationType: 'text', category: 'parent' },
];

function makeRow(overrides: Record<string, string | null> = {}): ParsedRow {
  return {
    S_ID: '10001',
    S_AHV: '756.1234.5678.97',
    S_Name: 'Meier',
    S_Vorname: 'Luca',
    S_Geschlecht: 'M',
    S_Geburtsdatum: '15.03.2015',
    S_PLZ: '8001',
    S_Ort: 'Zürich',
    S_Muttersprache: 'Deutsch',
    S_Nationalitaet: 'Schweiz',
    P_ERZ1_ID: '20001',
    P_ERZ1_AHV: '756.2001.0001.01',
    P_ERZ1_Name: 'Meier',
    P_ERZ1_Vorname: 'Thomas',
    P_ERZ2_ID: '20002',
    P_ERZ2_AHV: '756.2001.0002.01',
    P_ERZ2_Name: 'Meier',
    P_ERZ2_Vorname: 'Sandra',
    ...overrides,
  };
}

// ============================================
// Date Plausibility Tests
// ============================================

describe('isValidDate — plausibility checks', () => {
  it('rejects 31.02.2015 (Feb has max 28/29 days)', () => {
    const errors = validateData([makeRow({ S_Geburtsdatum: '31.02.2015' })], baseCols);
    const dateErrors = errors.filter(e => e.column === 'S_Geburtsdatum');
    expect(dateErrors.length).toBeGreaterThan(0);
  });

  it('rejects 00.01.2020 (day = 0)', () => {
    const errors = validateData([makeRow({ S_Geburtsdatum: '00.01.2020' })], baseCols);
    expect(errors.some(e => e.column === 'S_Geburtsdatum')).toBe(true);
  });

  it('rejects 15.13.2020 (month = 13)', () => {
    const errors = validateData([makeRow({ S_Geburtsdatum: '15.13.2020' })], baseCols);
    expect(errors.some(e => e.column === 'S_Geburtsdatum')).toBe(true);
  });

  it('accepts 29.02.2020 (leap year)', () => {
    const errors = validateData([makeRow({ S_Geburtsdatum: '29.02.2020' })], baseCols);
    const dateErrors = errors.filter(e => e.column === 'S_Geburtsdatum');
    expect(dateErrors.length).toBe(0);
  });

  it('rejects 29.02.2019 (non-leap year)', () => {
    const errors = validateData([makeRow({ S_Geburtsdatum: '29.02.2019' })], baseCols);
    expect(errors.some(e => e.column === 'S_Geburtsdatum')).toBe(true);
  });

  it('rejects year 1800 (out of range)', () => {
    const errors = validateData([makeRow({ S_Geburtsdatum: '01.01.1800' })], baseCols);
    expect(errors.some(e => e.column === 'S_Geburtsdatum')).toBe(true);
  });
});

// ============================================
// ERZ1 = ERZ2 Detection
// ============================================

describe('ERZ1 = ERZ2 detection', () => {
  it('detects same AHV for ERZ1 and ERZ2', () => {
    const row = makeRow({
      P_ERZ1_AHV: '756.2001.0001.01',
      P_ERZ2_AHV: '756.2001.0001.01',
    });
    const errors = validateData([row], baseCols);
    expect(errors.some(e => e.message.includes('ERZ1 und ERZ2') && e.message.includes('AHV'))).toBe(true);
  });

  it('detects same Name+Vorname for ERZ1 and ERZ2', () => {
    const row = makeRow({
      P_ERZ1_Name: 'Müller',
      P_ERZ1_Vorname: 'Peter',
      P_ERZ2_Name: 'Müller',
      P_ERZ2_Vorname: 'Peter',
    });
    const errors = validateData([row], baseCols);
    expect(errors.some(e => e.message.includes('ERZ1 und ERZ2') && e.message.includes('gleichen Namen'))).toBe(true);
  });

  it('does NOT flag different parents', () => {
    const row = makeRow();
    const errors = validateData([row], baseCols);
    expect(errors.some(e => e.message.includes('ERZ1 und ERZ2'))).toBe(false);
  });
});

// ============================================
// S_ID = 0 Placeholder Detection
// ============================================

describe('S_ID placeholder detection', () => {
  it('warns on S_ID = 0', () => {
    const rows = [
      makeRow({ S_ID: '0', S_Name: 'A', S_Vorname: 'B' }),
    ];
    const errors = validateData(rows, baseCols);
    expect(errors.some(e => e.column === 'S_ID' && e.message.includes('Platzhalter'))).toBe(true);
  });

  it('warns on S_ID = NULL', () => {
    const errors = validateData([makeRow({ S_ID: 'NULL' })], baseCols);
    expect(errors.some(e => e.column === 'S_ID' && e.message.includes('Platzhalter'))).toBe(true);
  });

  it('does NOT flag normal IDs', () => {
    const errors = validateData([makeRow({ S_ID: '12345' })], baseCols);
    expect(errors.some(e => e.message.includes('Platzhalter'))).toBe(false);
  });
});

// ============================================
// Student = Parent Detection
// ============================================

describe('Student is parent detection', () => {
  it('detects S_AHV == P_ERZ1_AHV', () => {
    const row = makeRow({
      S_AHV: '756.1234.5678.97',
      P_ERZ1_AHV: '756.1234.5678.97',
    });
    const errors = validateData([row], baseCols);
    expect(errors.some(e => e.message.includes('Schüler-AHV') && e.message.includes('ERZ1'))).toBe(true);
  });

  it('detects S_AHV == P_ERZ2_AHV', () => {
    const row = makeRow({
      S_AHV: '756.1234.5678.97',
      P_ERZ2_AHV: '756.1234.5678.97',
    });
    const errors = validateData([row], baseCols);
    expect(errors.some(e => e.message.includes('ERZ2'))).toBe(true);
  });

  it('does NOT flag different AHVs', () => {
    const errors = validateData([makeRow()], baseCols);
    expect(errors.some(e => e.message.includes('eigene/r Erziehungsberechtigte'))).toBe(false);
  });
});

// ============================================
// Extended Language Mappings
// ============================================

describe('Extended language auto-corrections', () => {
  const newMappings = ['Somalisch', 'Eritreisch', 'Tamilisch', 'Georgisch', 'Berberisch', 'Khmer'];
  
  for (const lang of newMappings) {
    it(`maps "${lang}" to a valid BISTA language`, () => {
      expect(LANGUAGE_AUTO_CORRECTIONS[lang]).toBeDefined();
    });
  }

  it('maps Somalisch → Afrikanische Sprachen', () => {
    expect(LANGUAGE_AUTO_CORRECTIONS['Somalisch']).toBe('Afrikanische Sprachen');
  });

  it('produces warnings for new language mappings', () => {
    const row = makeRow({ S_Muttersprache: 'Somalisch' });
    const errors = validateData([row], baseCols);
    const langErrors = errors.filter(e => e.column === 'S_Muttersprache');
    expect(langErrors.length).toBe(1);
    expect(langErrors[0].correctedValue).toBe('Afrikanische Sprachen');
  });
});

// ============================================
// Extended Nationality Mappings
// ============================================

describe('Extended nationality auto-corrections', () => {
  const newMappings = ['USA', 'England', 'Holland', 'Kongo', 'Elfenbeinküste', 'Burma', 'Jugoslawien'];
  
  for (const nat of newMappings) {
    it(`maps "${nat}" to a valid nationality`, () => {
      expect(NATIONALITY_AUTO_CORRECTIONS[nat]).toBeDefined();
    });
  }

  it('maps USA → Vereinigte Staaten von Amerika', () => {
    expect(NATIONALITY_AUTO_CORRECTIONS['USA']).toBe('Vereinigte Staaten von Amerika');
  });

  it('produces warnings for Kongo', () => {
    const row = makeRow({ S_Nationalitaet: 'Kongo' });
    const errors = validateData([row], baseCols);
    const natErrors = errors.filter(e => e.column === 'S_Nationalitaet');
    expect(natErrors.length).toBe(1);
    expect(natErrors[0].correctedValue).toBe('Kongo (Republik)');
  });
});

// ============================================
// Extended Email Typo Corrections
// ============================================

describe('Extended email typo corrections', () => {
  it('fixes @bleuwin.ch → @bluewin.ch', () => {
    expect(formatEmail('test@bleuwin.ch')).toBe('test@bluewin.ch');
  });

  it('fixes @yahooo.com → @yahoo.com', () => {
    expect(formatEmail('test@yahooo.com')).toBe('test@yahoo.com');
  });

  it('fixes @gmx.cch → @gmx.ch', () => {
    expect(formatEmail('test@gmx.cch')).toBe('test@gmx.ch');
  });

  it('fixes @hotmai.com → @hotmail.com', () => {
    expect(formatEmail('test@hotmai.com')).toBe('test@hotmail.com');
  });

  it('fixes @protonmai.com → @protonmail.com', () => {
    expect(formatEmail('test@protonmai.com')).toBe('test@protonmail.com');
  });

  it('fixes @iclod.com → @icloud.com', () => {
    expect(formatEmail('test@iclod.com')).toBe('test@icloud.com');
  });
});
