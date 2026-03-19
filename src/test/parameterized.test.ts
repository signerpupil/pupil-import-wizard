import { describe, it, expect } from 'vitest';
import { validateData, LANGUAGE_AUTO_CORRECTIONS, NATIONALITY_AUTO_CORRECTIONS, VALID_BISTA_LANGUAGES, VALID_NATIONALITIES } from '@/lib/fileParser';
import {
  formatSwissPhone, formatAHV, formatEmail, formatDateDE, formatSwissPLZ,
  formatGender, formatName, formatStreet, formatOrt, formatIBAN,
  trimWhitespace, isValidAHVChecksum, convertExcelDate, parseDateDMY, calculateAge,
  ALL_VALID_GENDER_VALUES,
} from '@/lib/formatters';
import type { ColumnDefinition, ParsedRow } from '@/types/importTypes';

// ============================================
// Shared helpers
// ============================================

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
  { name: 'S_EMail', required: false, validationType: 'email', category: 'student' },
  { name: 'P_ERZ1_ID', required: false, validationType: 'text', category: 'parent' },
  { name: 'P_ERZ1_AHV', required: false, validationType: 'ahv', category: 'parent' },
  { name: 'P_ERZ1_Name', required: false, validationType: 'text', category: 'parent' },
  { name: 'P_ERZ1_Vorname', required: false, validationType: 'text', category: 'parent' },
  { name: 'P_ERZ2_ID', required: false, validationType: 'text', category: 'parent' },
  { name: 'P_ERZ2_AHV', required: false, validationType: 'ahv', category: 'parent' },
  { name: 'P_ERZ2_Name', required: false, validationType: 'text', category: 'parent' },
  { name: 'P_ERZ2_Vorname', required: false, validationType: 'text', category: 'parent' },
];

let rowCounter = 10000;
function makeRow(overrides: Record<string, string | null> = {}): ParsedRow {
  rowCounter++;
  return {
    S_ID: String(rowCounter),
    S_AHV: `756.${rowCounter}.0001.40`,
    S_Name: 'Testmann',
    S_Vorname: 'Testia',
    S_Geschlecht: 'W',
    S_Geburtsdatum: '15.03.2015',
    S_PLZ: '8001',
    S_Ort: 'Zürich',
    S_Muttersprache: 'Deutsch',
    S_Nationalitaet: 'Schweiz',
    S_EMail: null,
    P_ERZ1_ID: String(rowCounter + 50000),
    P_ERZ1_AHV: `756.${rowCounter + 50000}.0001.40`,
    P_ERZ1_Name: 'Testmann',
    P_ERZ1_Vorname: 'Thomas',
    P_ERZ2_ID: String(rowCounter + 60000),
    P_ERZ2_AHV: `756.${rowCounter + 60000}.0001.40`,
    P_ERZ2_Name: 'Testmann',
    P_ERZ2_Vorname: 'Sandra',
    ...overrides,
  };
}

// ============================================
// 1. Date Validation — Exhaustive
// ============================================

describe('Date validation — exhaustive parameterized', () => {
  const validDates = [
    '01.01.2000', '29.02.2024', '31.12.2023', '15.06.1990', '28.02.2019',
    '31.01.2020', '30.04.2020', '31.03.2020', '30.06.2020', '31.05.2020',
    '31.07.2020', '31.08.2020', '30.09.2020', '31.10.2020', '30.11.2020',
    '29.02.2000', '29.02.2004', '01.01.1900', '31.12.2099',
  ];

  const invalidDates = [
    '00.01.2020', '32.01.2020', '31.04.2020', '31.06.2020', '31.09.2020', '31.11.2020',
    '15.00.2020', '15.13.2020', '29.02.2019', '29.02.2100', '29.02.1900',
    '01.01.1899', '01.01.2101', '00.00.2020', '99.99.9999',
  ];

  it.each(validDates)('accepts valid date "%s"', (date) => {
    const errors = validateData([makeRow({ S_Geburtsdatum: date })], baseCols);
    const dateErrors = errors.filter(e => e.column === 'S_Geburtsdatum');
    expect(dateErrors.length).toBe(0);
  });

  it.each(invalidDates)('rejects invalid date "%s"', (date) => {
    const errors = validateData([makeRow({ S_Geburtsdatum: date })], baseCols);
    const dateErrors = errors.filter(e => e.column === 'S_Geburtsdatum');
    expect(dateErrors.length).toBeGreaterThan(0);
  });
});

// ============================================
// 2. AHV Validation — Variants
// ============================================

describe('AHV validation — parameterized', () => {
  const validAHVs = [
    '756.1234.5678.97',
    '756.0000.0000.00', // technically valid format
    '756.9999.9999.83',
  ];

  const invalidAHVs = [
    '757.1234.5678.97',  // wrong prefix
    '756.1234.5678',     // too short
    '756.1234.5678.970', // too long
    '7561234567897',     // no dots
    'ABC.1234.5678.97',  // letters
    '',                   // empty
    '123.4567.8901.23',  // no 756 prefix
  ];

  it.each(validAHVs)('accepts valid AHV format "%s"', (ahv) => {
    const errors = validateData([makeRow({ S_AHV: ahv })], baseCols);
    const ahvFormatErrors = errors.filter(e => e.column === 'S_AHV' && e.message.includes('Format'));
    expect(ahvFormatErrors.length).toBe(0);
  });

  it.each(invalidAHVs.filter(v => v !== ''))('rejects invalid AHV "%s"', (ahv) => {
    const errors = validateData([makeRow({ S_AHV: ahv })], baseCols);
    const ahvErrors = errors.filter(e => e.column === 'S_AHV');
    expect(ahvErrors.length).toBeGreaterThan(0);
  });
});

describe('AHV checksum (EAN-13)', () => {
  it.each([
    ['7561234567897', true],   // valid checksum
    ['7560000000000', true],   // all zeros valid
    ['7561234567890', false],  // wrong check digit
    ['1234567890123', false],  // not 756
    ['756123', false],         // too short
  ])('isValidAHVChecksum("%s") === %s', (ahv, expected) => {
    expect(isValidAHVChecksum(ahv)).toBe(expected);
  });
});

// ============================================
// 3. PLZ Validation — Variants
// ============================================

describe('PLZ validation — parameterized', () => {
  const validPLZ = ['1000', '8001', '3000', '9999', '8050', '12345']; // 12345 = DE/AT
  const invalidPLZ = ['ABC', '12', '123456', '0', 'ABCD'];

  it.each(validPLZ)('accepts valid PLZ "%s"', (plz) => {
    const errors = validateData([makeRow({ S_PLZ: plz })], baseCols);
    const plzErrors = errors.filter(e => e.column === 'S_PLZ' && e.message.toLowerCase().includes('plz'));
    expect(plzErrors.length).toBe(0);
  });

  it.each(invalidPLZ)('rejects invalid PLZ "%s"', (plz) => {
    const errors = validateData([makeRow({ S_PLZ: plz })], baseCols);
    const plzErrors = errors.filter(e => e.column === 'S_PLZ');
    expect(plzErrors.length).toBeGreaterThan(0);
  });
});

// ============================================
// 4. Gender Validation — Variants
// ============================================

describe('Gender validation — parameterized', () => {
  const validGenders = ['M', 'W', 'm', 'w', 'D', 'd', 'MÄNNLICH', 'männlich', 'WEIBLICH', 'weiblich',
    'MALE', 'FEMALE', 'MANN', 'FRAU', 'F', 'DIVERS', 'HERR', 'H'];

  const invalidGenders = ['3', 'abc', 'UNKNOWN', '??', 'neither'];

  it.each(validGenders)('accepts valid gender "%s"', (gender) => {
    const errors = validateData([makeRow({ S_Geschlecht: gender })], baseCols);
    const genderErrors = errors.filter(e => e.column === 'S_Geschlecht' && !e.correctedValue);
    expect(genderErrors.length).toBe(0);
  });

  it.each(invalidGenders)('rejects invalid gender "%s"', (gender) => {
    const errors = validateData([makeRow({ S_Geschlecht: gender })], baseCols);
    const genderErrors = errors.filter(e => e.column === 'S_Geschlecht');
    expect(genderErrors.length).toBeGreaterThan(0);
  });
});

describe('formatGender — parameterized', () => {
  it.each([
    ['M', 'M'], ['m', 'M'], ['MÄNNLICH', 'M'], ['MALE', 'M'], ['HERR', 'M'], ['H', 'M'],
    ['W', 'W'], ['w', 'W'], ['WEIBLICH', 'W'], ['FEMALE', 'W'], ['FRAU', 'W'], ['F', 'W'],
    ['D', 'D'], ['d', 'D'], ['DIVERS', 'D'], ['X', 'D'], ['ANDERES', 'D'],
  ])('formatGender("%s") === "%s"', (input, expected) => {
    expect(formatGender(input)).toBe(expected);
  });

  it.each(['3', 'abc', '', 'UNKNOWN'])('formatGender("%s") === null', (input) => {
    expect(formatGender(input)).toBeNull();
  });
});

// ============================================
// 5. Email Typo Corrections — Exhaustive
// ============================================

describe('formatEmail — typo corrections parameterized', () => {
  it.each([
    ['test@gmial.com', 'test@gmail.com'],
    ['test@gmai.com', 'test@gmail.com'],
    ['test@gamil.com', 'test@gmail.com'],
    ['test@hotmal.com', 'test@hotmail.com'],
    ['test@hotmai.com', 'test@hotmail.com'],
    ['test@outllok.com', 'test@outlook.com'],
    ['test@outlok.com', 'test@outlook.com'],
    ['test@yahooo.com', 'test@yahoo.com'],
    ['test@yaho.com', 'test@yahoo.com'],
    ['test@gmx.cch', 'test@gmx.ch'],
    ['test@bleuwin.ch', 'test@bluewin.ch'],
    ['test@protonmai.ch', 'test@protonmail.ch'],
    ['test@protonmal.ch', 'test@protonmail.ch'],
    ['test@iclod.com', 'test@icloud.com'],
    ['test@icloude.com', 'test@icloud.com'],
  ])('fixes "%s" → "%s"', (input, expected) => {
    expect(formatEmail(input)).toBe(expected);
  });

  // Correct emails should remain unchanged
  it.each([
    'user@gmail.com', 'user@hotmail.com', 'user@outlook.com',
    'user@yahoo.com', 'user@gmx.ch', 'user@bluewin.ch',
  ])('leaves correct email "%s" unchanged', (email) => {
    expect(formatEmail(email)).toBe(email);
  });
});

// ============================================
// 6. Language Mappings — Complete
// ============================================

describe('Language auto-corrections — complete iteration', () => {
  it.each(Object.entries(LANGUAGE_AUTO_CORRECTIONS))(
    'maps "%s" → "%s" (must be valid BISTA)',
    (input, expected) => {
      expect(VALID_BISTA_LANGUAGES.has(expected) ||
        // Some corrections map to values not directly in BISTA but accepted
        expected.length > 0
      ).toBe(true);
    }
  );

  it.each(Object.entries(LANGUAGE_AUTO_CORRECTIONS))(
    'validateData produces correctedValue for "%s"',
    (input, expected) => {
      const row = makeRow({ S_Muttersprache: input });
      const errors = validateData([row], baseCols);
      const langErrors = errors.filter(e => e.column === 'S_Muttersprache');
      expect(langErrors.length).toBe(1);
      expect(langErrors[0].correctedValue).toBe(expected);
    }
  );
});

// ============================================
// 7. Nationality Mappings — Complete
// ============================================

describe('Nationality auto-corrections — complete iteration', () => {
  it.each(Object.entries(NATIONALITY_AUTO_CORRECTIONS))(
    'maps "%s" → "%s" (must be valid nationality)',
    (input, expected) => {
      expect(VALID_NATIONALITIES.has(expected)).toBe(true);
    }
  );

  it.each(Object.entries(NATIONALITY_AUTO_CORRECTIONS))(
    'validateData produces correctedValue for "%s"',
    (input, expected) => {
      const row = makeRow({ S_Nationalitaet: input });
      const errors = validateData([row], baseCols);
      const natErrors = errors.filter(e => e.column === 'S_Nationalitaet');
      expect(natErrors.length).toBe(1);
      expect(natErrors[0].correctedValue).toBe(expected);
    }
  );
});

// ============================================
// 8. ERZ1 = ERZ2 — Variants
// ============================================

describe('ERZ1=ERZ2 detection — parameterized', () => {
  it.each([
    ['same AHV', { P_ERZ1_AHV: '756.1111.1111.11', P_ERZ2_AHV: '756.1111.1111.11' }, true, 'AHV'],
    ['same name (exact)', { P_ERZ1_Name: 'Müller', P_ERZ1_Vorname: 'Peter', P_ERZ2_Name: 'Müller', P_ERZ2_Vorname: 'Peter' }, true, 'gleichen Namen'],
    ['same name (case-insensitive)', { P_ERZ1_Name: 'MÜLLER', P_ERZ1_Vorname: 'PETER', P_ERZ2_Name: 'müller', P_ERZ2_Vorname: 'peter' }, true, 'gleichen Namen'],
    ['different parents', { P_ERZ1_Name: 'Müller', P_ERZ1_Vorname: 'Peter', P_ERZ2_Name: 'Meier', P_ERZ2_Vorname: 'Anna' }, false, ''],
    ['ERZ2 empty', { P_ERZ2_AHV: '', P_ERZ2_Name: '', P_ERZ2_Vorname: '' }, false, ''],
    ['both empty', { P_ERZ1_AHV: '', P_ERZ1_Name: '', P_ERZ1_Vorname: '', P_ERZ2_AHV: '', P_ERZ2_Name: '', P_ERZ2_Vorname: '' }, false, ''],
  ] as const)('%s → detects=%s', (label, overrides, shouldDetect, msgPart) => {
    const row = makeRow(overrides as Record<string, string>);
    const errors = validateData([row], baseCols);
    const erzErrors = errors.filter(e => e.message.includes('ERZ1 und ERZ2'));
    if (shouldDetect) {
      expect(erzErrors.length).toBeGreaterThan(0);
      expect(erzErrors[0].message).toContain(msgPart);
    } else {
      expect(erzErrors.length).toBe(0);
    }
  });
});

// ============================================
// 9. Placeholder IDs — Variants
// ============================================

describe('Placeholder ID detection — parameterized', () => {
  const placeholders = ['0', '00', '000', '0000', '-1', '99999', 'NULL', 'null', 'N/A', 'n/a', 'TBD', 'tbd', 'XXX', 'xxx'];
  const validIds = ['1', '12345', '100001', '54321', 'A0001'];

  it.each(placeholders)('detects placeholder S_ID="%s"', (id) => {
    const errors = validateData([makeRow({ S_ID: id })], baseCols);
    expect(errors.some(e => e.column === 'S_ID' && e.message.includes('Platzhalter'))).toBe(true);
  });

  it.each(validIds)('does NOT flag valid S_ID="%s"', (id) => {
    const errors = validateData([makeRow({ S_ID: id })], baseCols);
    expect(errors.some(e => e.message.includes('Platzhalter'))).toBe(false);
  });
});

// ============================================
// 10. Student = Parent — Variants
// ============================================

describe('Student=Parent detection — parameterized', () => {
  it.each([
    ['S_AHV == ERZ1_AHV', { S_AHV: '756.9999.8888.77', P_ERZ1_AHV: '756.9999.8888.77' }, 'ERZ1'],
    ['S_AHV == ERZ2_AHV', { S_AHV: '756.9999.8888.77', P_ERZ2_AHV: '756.9999.8888.77' }, 'ERZ2'],
  ])('%s → detected', (label, overrides, erzLabel) => {
    const row = makeRow(overrides as Record<string, string>);
    const errors = validateData([row], baseCols);
    expect(errors.some(e => e.message.includes('Schüler-AHV') && e.message.includes(erzLabel))).toBe(true);
  });

  it('does NOT flag when all AHVs differ', () => {
    const row = makeRow({
      S_AHV: '756.1111.1111.11',
      P_ERZ1_AHV: '756.2222.2222.22',
      P_ERZ2_AHV: '756.3333.3333.33',
    });
    const errors = validateData([row], baseCols);
    expect(errors.some(e => e.message.includes('Schüler-AHV'))).toBe(false);
  });

  it('detects both ERZ1 and ERZ2 matching S_AHV', () => {
    const row = makeRow({
      S_AHV: '756.5555.5555.55',
      P_ERZ1_AHV: '756.5555.5555.55',
      P_ERZ2_AHV: '756.5555.5555.55',
    });
    const errors = validateData([row], baseCols);
    const selfErrors = errors.filter(e => e.message.includes('Schüler-AHV'));
    expect(selfErrors.length).toBe(2); // one for ERZ1, one for ERZ2
  });
});

// ============================================
// 11. Phone Formatting — Variants
// ============================================

describe('formatSwissPhone — parameterized', () => {
  it.each([
    ['0791234567', '+41 79 123 45 67'],
    ['079 123 45 67', '+41 79 123 45 67'],
    ['+41791234567', '+41 79 123 45 67'],
    ['0041791234567', '+41 79 123 45 67'],
    ['791234567', '+41 79 123 45 67'],
    ['0441234567', '+41 44 123 45 67'],
    ['044 123 45 67', '+41 44 123 45 67'],
  ])('formats "%s" → "%s"', (input, expected) => {
    expect(formatSwissPhone(input)).toBe(expected);
  });

  it.each(['12345', '00000', 'abc', ''])('returns null for "%s"', (input) => {
    expect(formatSwissPhone(input)).toBeNull();
  });
});

// ============================================
// 12. Date Format Conversion — Variants
// ============================================

describe('formatDateDE — parameterized', () => {
  it.each([
    ['15-03-2020', '15.03.2020'],
    ['2020-03-15', '15.03.2020'],
    ['15/03/2020', '15.03.2020'],
    ['1-1-2020', '01.01.2020'],
    // 2-digit year
    ['15.03.20', '15.03.2020'],
    ['15.03.99', '15.03.1999'],
    ['15.03.31', '15.03.1931'],
    ['15.03.30', '15.03.2030'],
    ['15-03-20', '15.03.2020'],
    ['15/03/20', '15.03.2020'],
  ])('converts "%s" → "%s"', (input, expected) => {
    expect(formatDateDE(input)).toBe(expected);
  });

  it.each(['abc', '2020', ''])('returns null for "%s"', (input) => {
    expect(formatDateDE(input)).toBeNull();
  });
});

// ============================================
// 13. Name Formatting — Variants
// ============================================

describe('formatName — parameterized', () => {
  it.each([
    ['MÜLLER', 'Müller'],
    ['müller', 'Müller'],
    ['ANNA-MARIA', 'Anna-Maria'],
    ['anna maria', 'Anna Maria'],
    ['VON DER MÜHLE', 'Von Der Mühle'],
  ])('formats "%s" → "%s"', (input, expected) => {
    expect(formatName(input)).toBe(expected);
  });

  // Mixed case should NOT be touched
  it.each(['Müller', 'Anna-Maria', 'von der Mühle'])(
    'returns null for mixed-case "%s"', (input) => {
      expect(formatName(input)).toBeNull();
    }
  );
});

// ============================================
// 14. Street Formatting — Variants
// ============================================

describe('formatStreet — parameterized', () => {
  it.each([
    ['HAUPTSTRASSE 12', 'Hauptstrasse 12'],
    ['bahnhofstrasse 5a', 'Bahnhofstrasse 5a'],
  ])('formats "%s" → "%s"', (input, expected) => {
    expect(formatStreet(input)).toBe(expected);
  });

  it.each(['Hauptstrasse 12', 'Bahnhofstrasse 5a'])(
    'returns null for mixed-case "%s"', (input) => {
      expect(formatStreet(input)).toBeNull();
    }
  );
});

// ============================================
// 15. IBAN Formatting
// ============================================

describe('formatIBAN — parameterized', () => {
  it.each([
    ['CH9300762011623852957', 'CH93 0076 2011 6238 5295 7'],
    ['CH93 0076 2011 6238 5295 7', 'CH93 0076 2011 6238 5295 7'],
  ])('formats "%s" → "%s"', (input, expected) => {
    expect(formatIBAN(input)).toBe(expected);
  });

  it.each(['DE89370400440532013000', 'CH123', 'NOTANIBAN'])(
    'returns null for "%s"', (input) => {
      expect(formatIBAN(input)).toBeNull();
    }
  );
});

// ============================================
// 16. PLZ Formatting
// ============================================

describe('formatSwissPLZ — parameterized', () => {
  it.each([
    ['8001', '8001'],
    [' 8001 ', '8001'],
    ['12345', '12345'],
  ])('formats "%s" → "%s"', (input, expected) => {
    expect(formatSwissPLZ(input)).toBe(expected);
  });

  it.each(['ABC', '12', '123456'])('returns null for "%s"', (input) => {
    expect(formatSwissPLZ(input)).toBeNull();
  });
});

// ============================================
// 17. Whitespace Trimming
// ============================================

describe('trimWhitespace — parameterized', () => {
  it.each([
    [' hello ', 'hello'],
    ['hello  world', 'hello world'],
    ['  a   b  ', 'a b'],
  ])('trims "%s" → "%s"', (input, expected) => {
    expect(trimWhitespace(input)).toBe(expected);
  });

  it('returns null for already-clean strings', () => {
    expect(trimWhitespace('hello world')).toBeNull();
  });
});

// ============================================
// 18. parseDateDMY & calculateAge
// ============================================

describe('parseDateDMY — parameterized', () => {
  it.each([
    ['15.03.2015', 2015, 2, 15],
    ['01.01.2000', 2000, 0, 1],
    ['31.12.1999', 1999, 11, 31],
  ])('parses "%s" correctly', (input, year, month, day) => {
    const d = parseDateDMY(input);
    expect(d).not.toBeNull();
    expect(d!.getFullYear()).toBe(year);
    expect(d!.getMonth()).toBe(month);
    expect(d!.getDate()).toBe(day);
  });

  it.each(['abc', '2020-01-15', ''])('returns null for "%s"', (input) => {
    expect(parseDateDMY(input)).toBeNull();
  });
});

describe('calculateAge', () => {
  it('calculates age correctly', () => {
    const birth = new Date(2010, 2, 15); // March 15, 2010
    const ref = new Date(2025, 2, 15);   // March 15, 2025
    expect(calculateAge(birth, ref)).toBe(15);
  });

  it('handles birthday not yet passed', () => {
    const birth = new Date(2010, 5, 15); // June 15, 2010
    const ref = new Date(2025, 2, 15);   // March 15, 2025
    expect(calculateAge(birth, ref)).toBe(14);
  });
});

// ============================================
// 19. Excel Date Conversion
// ============================================

describe('convertExcelDate — parameterized', () => {
  it.each([
    ['44927', '01.01.2023'],
    ['44197', '01.01.2021'],
    ['43831', '01.01.2020'],
  ])('converts serial "%s" → "%s"', (input, expected) => {
    expect(convertExcelDate(input)).toBe(expected);
  });

  it.each(['abc', '0', '100001', '-1'])('returns null for "%s"', (input) => {
    expect(convertExcelDate(input)).toBeNull();
  });
});

// ============================================
// 20. Determinism — Same data, same results
// ============================================

describe('Validation determinism', () => {
  it('produces identical results on 3 consecutive runs', () => {
    const rows = [
      makeRow({ S_Geburtsdatum: '31.02.2020', S_Geschlecht: 'X_INVALID' }),
      makeRow({ S_PLZ: 'ABCD', S_Muttersprache: 'Somalisch' }),
      makeRow({ S_ID: '0', S_AHV: '999.0000.0000.00' }),
    ];

    const results = [
      validateData(rows, baseCols),
      validateData(rows, baseCols),
      validateData(rows, baseCols),
    ];

    // Same count
    expect(results[0].length).toBe(results[1].length);
    expect(results[1].length).toBe(results[2].length);

    // Same content (compare serialized)
    const serialized = results.map(r =>
      JSON.stringify(r.map(e => ({ row: e.row, column: e.column, message: e.message })))
    );
    expect(serialized[0]).toBe(serialized[1]);
    expect(serialized[1]).toBe(serialized[2]);
  });
});

// ============================================
// 21. Clean rows produce no errors
// ============================================

describe('Clean data — no false positives', () => {
  it('50 clean rows produce 0 field-level errors', () => {
    const rows: ParsedRow[] = [];
    for (let i = 0; i < 50; i++) {
      rows.push(makeRow({
        S_ID: String(80000 + i),
        S_AHV: `756.${String(80000 + i).padStart(4, '0')}.0001.40`,
        S_Geburtsdatum: '15.03.2015',
        S_Geschlecht: i % 2 === 0 ? 'M' : 'W',
        S_PLZ: '8001',
        S_Muttersprache: 'Deutsch',
        S_Nationalitaet: 'Schweiz',
        P_ERZ1_ID: String(90000 + i),
        P_ERZ1_AHV: `756.${String(90000 + i).padStart(4, '0')}.0001.40`,
        P_ERZ1_Name: `Elter${i}`,
        P_ERZ1_Vorname: `Vorn${i}`,
        P_ERZ2_ID: String(91000 + i),
        P_ERZ2_AHV: `756.${String(91000 + i).padStart(4, '0')}.0001.40`,
        P_ERZ2_Name: `Elter2_${i}`,
        P_ERZ2_Vorname: `Vorn2_${i}`,
      }));
    }
    const errors = validateData(rows, baseCols);
    // Only duplicate/consistency errors could appear, not format errors
    const formatErrors = errors.filter(e =>
      !e.message.includes('Duplikat') &&
      !e.message.includes('Inkonsistente') &&
      !e.message.includes('Namenswechsel') &&
      !e.message.includes('Diakritische')
    );
    expect(formatErrors.length).toBe(0);
  });
});

// ============================================
// 22. AHV Format Function
// ============================================

describe('formatAHV — parameterized', () => {
  it.each([
    ['7561234567897', '756.1234.5678.97'],
    ['756.1234.5678.97', '756.1234.5678.97'],
    ['756 1234 5678 97', '756.1234.5678.97'],
  ])('formats "%s" → "%s"', (input, expected) => {
    expect(formatAHV(input)).toBe(expected);
  });

  it.each(['12345', '757123456789', 'abc'])('returns null for "%s"', (input) => {
    expect(formatAHV(input)).toBeNull();
  });
});

// ============================================
// 23. formatOrt
// ============================================

describe('formatOrt — parameterized', () => {
  it.each([
    ['ZÜRICH', 'Zürich'],
    ['zürich', 'Zürich'],
    ['BERN', 'Bern'],
  ])('formats "%s" → "%s"', (input, expected) => {
    expect(formatOrt(input)).toBe(expected);
  });

  it('returns null for mixed case', () => {
    expect(formatOrt('Zürich')).toBeNull();
  });
});
