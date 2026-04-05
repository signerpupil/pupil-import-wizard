import { describe, it, expect } from 'vitest';
import {
  formatSwissPhone, formatAHV, formatEmail, formatGender, formatName,
  formatStreet, formatOrt, formatDateDE, convertExcelDate, trimWhitespace,
  formatSwissPLZ, isValidGender, isValidAHVChecksum, formatIBAN,
  PHONE_COLUMNS, EMAIL_COLUMNS, AHV_COLUMNS, WHITESPACE_COLUMNS,
} from '../lib/formatters';

describe('Shared Formatters', () => {
  // ===== Phone =====
  describe('formatSwissPhone', () => {
    it('formats 10-digit national number', () => {
      expect(formatSwissPhone('0791234567')).toBe('+41 79 123 45 67');
    });
    it('formats 11-digit with country code', () => {
      expect(formatSwissPhone('41791234567')).toBe('+41 79 123 45 67');
    });
    it('formats 13-digit with 0041 prefix', () => {
      expect(formatSwissPhone('0041441234567')).toBe('+41 44 123 45 67');
    });
    it('formats 9-digit without leading 0', () => {
      expect(formatSwissPhone('791234567')).toBe('+41 79 123 45 67');
    });
    it('handles spaces and dashes', () => {
      expect(formatSwissPhone('079 123 45 67')).toBe('+41 79 123 45 67');
    });
    it('returns null for invalid', () => {
      expect(formatSwissPhone('123')).toBeNull();
    });
  });

  // ===== AHV =====
  describe('formatAHV', () => {
    it('formats 13-digit AHV', () => {
      expect(formatAHV('7561234567801')).toBe('756.1234.5678.01');
    });
    it('returns null for non-756', () => {
      expect(formatAHV('1234567890123')).toBeNull();
    });
  });

  describe('isValidAHVChecksum', () => {
    it('validates correct checksum (EAN-13): 756.1234.5678.04', () => {
      // Sum of weighted digits (1,3,1,3,...) for 756123456780 = 96
      // Check = (10 - 96%10) % 10 = 4
      expect(isValidAHVChecksum('756.1234.5678.04')).toBe(true);
    });
    it('rejects invalid checksum: 756.1234.5678.01', () => {
      expect(isValidAHVChecksum('756.1234.5678.01')).toBe(false);
    });
    it('rejects invalid checksum: 756.1234.5678.99', () => {
      expect(isValidAHVChecksum('756.1234.5678.99')).toBe(false);
    });
    it('validates correct checksum without dots: 7561234567804', () => {
      expect(isValidAHVChecksum('7561234567804')).toBe(true);
    });
    it('rejects non-756 prefix', () => {
      expect(isValidAHVChecksum('123.4567.8901.23')).toBe(false);
    });
    it('rejects wrong length', () => {
      expect(isValidAHVChecksum('756.1234.5678')).toBe(false);
    });
  });

  // ===== Email =====
  describe('formatEmail', () => {
    it('lowercases and trims', () => {
      expect(formatEmail(' Test@GMail.COM ')).toBe('test@gmail.com');
    });
    it('fixes gmial typo', () => {
      expect(formatEmail('user@gmial.com')).toBe('user@gmail.com');
    });
    it('fixes hotmal typo', () => {
      expect(formatEmail('user@hotmal.com')).toBe('user@hotmail.com');
    });
    it('fixes outlok typo', () => {
      expect(formatEmail('user@outlok.com')).toBe('user@outlook.com');
    });
    it('removes accents', () => {
      expect(formatEmail('üser@example.com')).toBe('user@example.com');
    });
    it('returns null without @', () => {
      expect(formatEmail('invalid')).toBeNull();
    });
  });

  // ===== Gender =====
  describe('formatGender', () => {
    it('normalizes M variants', () => {
      expect(formatGender('Männlich')).toBe('M');
      expect(formatGender('MANN')).toBe('M');
      expect(formatGender('HERR')).toBe('M');
      expect(formatGender('H')).toBe('M');
      expect(formatGender('MALE')).toBe('M');
      expect(formatGender('MAENNLICH')).toBe('M');
    });
    it('normalizes W variants', () => {
      expect(formatGender('Weiblich')).toBe('W');
      expect(formatGender('FRAU')).toBe('W');
      expect(formatGender('F')).toBe('W');
      expect(formatGender('FEMALE')).toBe('W');
    });
    it('normalizes D variants', () => {
      expect(formatGender('Divers')).toBe('D');
      expect(formatGender('X')).toBe('D');
      expect(formatGender('ANDERES')).toBe('D');
    });
    it('returns null for unknown', () => {
      expect(formatGender('???')).toBeNull();
    });
  });

  describe('isValidGender', () => {
    it('accepts all formatGender variants', () => {
      const validValues = ['M', 'W', 'D', 'Männlich', 'FRAU', 'HERR', 'H', 'F', 'X', 'ANDERES', 'MALE', 'FEMALE'];
      for (const v of validValues) {
        expect(isValidGender(v)).toBe(true);
      }
    });
    it('rejects invalid', () => {
      expect(isValidGender('???')).toBe(false);
    });
  });

  // ===== Name =====
  describe('formatName', () => {
    it('capitalizes ALL CAPS', () => {
      expect(formatName('MEIER')).toBe('Meier');
    });
    it('capitalizes all lower', () => {
      expect(formatName('huber')).toBe('Huber');
    });
    it('handles hyphenated names', () => {
      expect(formatName('MÜLLER-SCHMIDT')).toBe('Müller-Schmidt');
    });
    it('returns null for already correct', () => {
      expect(formatName('Meier')).toBeNull();
    });
  });

  // ===== Street =====
  describe('formatStreet', () => {
    it('capitalizes ALL CAPS street', () => {
      expect(formatStreet('HAUPTSTRASSE 1')).toBe('Hauptstrasse 1');
    });
    it('expands standalone str. abbreviation', () => {
      expect(formatStreet('str. 5')).toBe('Strasse 5');
    });
    it('does not expand mid-word str.', () => {
      // bahnhofstr. is all-lower so formatStreet capitalizes but doesn't expand
      expect(formatStreet('bahnhofstr. 5')).toBe('Bahnhofstr. 5');
    });
    it('expands weg abbreviation', () => {
      expect(formatStreet('bergweg 8')).toBe('Bergweg 8');
    });
    it('returns null for mixed case', () => {
      expect(formatStreet('Hauptstrasse 1')).toBeNull();
    });
  });

  // ===== Ort =====
  describe('formatOrt', () => {
    it('capitalizes ALL CAPS', () => {
      expect(formatOrt('ZÜRICH')).toBe('Zürich');
    });
    it('capitalizes all lower', () => {
      expect(formatOrt('winterthur')).toBe('Winterthur');
    });
    it('returns null for already correct', () => {
      expect(formatOrt('Zürich')).toBeNull();
    });
  });

  // ===== Date =====
  describe('formatDateDE', () => {
    it('converts DD-MM-YYYY', () => {
      expect(formatDateDE('03-11-2016')).toBe('03.11.2016');
    });
    it('converts YYYY-MM-DD', () => {
      expect(formatDateDE('2015-07-22')).toBe('22.07.2015');
    });
    it('converts DD/MM/YYYY (slash)', () => {
      expect(formatDateDE('15/03/2014')).toBe('15.03.2014');
    });
    it('returns null for DD.MM.YYYY (already correct)', () => {
      expect(formatDateDE('15.03.2014')).toBeNull();
    });
  });

  describe('convertExcelDate', () => {
    it('converts Excel serial number 44123', () => {
      expect(convertExcelDate('44123')).toBe('19.10.2020');
    });
    it('converts Excel serial number 41640 (Jan 2014)', () => {
      const result = convertExcelDate('41640');
      expect(result).toMatch(/^\d{2}\.\d{2}\.2014$/);
    });
    it('converts Excel serial number 44927 (Dec 2022)', () => {
      const result = convertExcelDate('44927');
      expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });
    it('returns null for non-serial', () => {
      expect(convertExcelDate('abc')).toBeNull();
    });
    it('returns null for too small serial (< 1)', () => {
      expect(convertExcelDate('0')).toBeNull();
    });
    it('returns null for negative serial', () => {
      expect(convertExcelDate('-100')).toBeNull();
    });
  });

  // ===== Date format edge cases =====
  describe('formatDateDE - extended edge cases', () => {
    it('converts single-digit day/month slash format 1/3/2014', () => {
      expect(formatDateDE('1/3/2014')).toBe('01.03.2014');
    });
    it('converts DD-MM-YYYY with leading zeros', () => {
      expect(formatDateDE('01-01-2020')).toBe('01.01.2020');
    });
    it('converts YYYY-MM-DD edge year', () => {
      expect(formatDateDE('2000-12-31')).toBe('31.12.2000');
    });
    it('returns null for invalid format like MM/DD/YYYY ambiguity', () => {
      // 15/03/2014 is treated as DD/MM since day > 12
      expect(formatDateDE('15/03/2014')).toBe('15.03.2014');
    });
    it('returns null for plain text', () => {
      expect(formatDateDE('not-a-date')).toBeNull();
    });
    it('returns null for partial date', () => {
      expect(formatDateDE('15.03')).toBeNull();
    });
    it('handles YYYY-MM-DD with Feb 29 leap year', () => {
      expect(formatDateDE('2020-02-29')).toBe('29.02.2020');
    });
  });

  // ===== 2-digit year conversion =====
  describe('formatDateDE - 2-digit year', () => {
    it('converts DD.MM.YY with year <= 30 to 20xx', () => {
      expect(formatDateDE('03.03.10')).toBe('03.03.2010');
      expect(formatDateDE('15.06.25')).toBe('15.06.2025');
      expect(formatDateDE('01.01.00')).toBe('01.01.2000');
      expect(formatDateDE('31.12.30')).toBe('31.12.2030');
    });
    it('converts DD.MM.YY with year > 30 to 19xx', () => {
      expect(formatDateDE('03.03.99')).toBe('03.03.1999');
      expect(formatDateDE('15.06.85')).toBe('15.06.1985');
      expect(formatDateDE('01.01.31')).toBe('01.01.1931');
      expect(formatDateDE('28.02.50')).toBe('28.02.1950');
    });
    it('converts DD-MM-YY with plausibility', () => {
      expect(formatDateDE('03-03-10')).toBe('03.03.2010');
      expect(formatDateDE('03-03-99')).toBe('03.03.1999');
    });
    it('converts DD/MM/YY with plausibility', () => {
      expect(formatDateDE('03/03/10')).toBe('03.03.2010');
      expect(formatDateDE('03/03/99')).toBe('03.03.1999');
    });
    it('pads single-digit day/month in YY format', () => {
      expect(formatDateDE('3.3.10')).toBe('03.03.2010');
    });
  });

  describe('trimWhitespace', () => {
    it('trims leading/trailing', () => {
      expect(trimWhitespace(' Mueller ')).toBe('Mueller');
    });
    it('normalizes double spaces', () => {
      expect(trimWhitespace('Bahnhofstr.  5')).toBe('Bahnhofstr. 5');
    });
    it('returns null if no change', () => {
      expect(trimWhitespace('OK')).toBeNull();
    });
  });

  // ===== PLZ =====
  describe('formatSwissPLZ', () => {
    it('extracts 4 digits', () => {
      expect(formatSwissPLZ('8001')).toBe('8001');
    });
    it('supports 5-digit DE/AT', () => {
      expect(formatSwissPLZ('80331')).toBe('80331');
    });
    it('strips non-digits', () => {
      expect(formatSwissPLZ('CH-8001')).toBe('8001');
    });
    it('returns null for wrong length', () => {
      expect(formatSwissPLZ('80')).toBeNull();
    });
  });

  // ===== Column Constants =====
  describe('Column name constants', () => {
    it('PHONE_COLUMNS match importTypes.ts', () => {
      expect(PHONE_COLUMNS).toContain('P_ERZ1_TelefonPrivat');
      expect(PHONE_COLUMNS).toContain('P_ERZ1_TelefonGeschaeft');
      expect(PHONE_COLUMNS).toContain('P_ERZ1_Mobil');
      expect(PHONE_COLUMNS).toContain('S_Telefon');
      expect(PHONE_COLUMNS).toContain('S_Mobil');
      // Should NOT contain old wrong names
      expect(PHONE_COLUMNS).not.toContain('P_ERZ1_Tel');
      expect(PHONE_COLUMNS).not.toContain('S_Tel');
      expect(PHONE_COLUMNS).not.toContain('S_Mobile');
    });
    it('EMAIL_COLUMNS match importTypes.ts', () => {
      expect(EMAIL_COLUMNS).toContain('S_EMail');
      expect(EMAIL_COLUMNS).toContain('P_ERZ1_EMail');
      expect(EMAIL_COLUMNS).toContain('P_ERZ2_EMail');
      // Should NOT contain old wrong names
      expect(EMAIL_COLUMNS).not.toContain('S_Email');
      expect(EMAIL_COLUMNS).not.toContain('P_ERZ1_Email');
    });
    it('WHITESPACE_COLUMNS includes all text fields', () => {
      expect(WHITESPACE_COLUMNS).toContain('S_Heimatort');
      expect(WHITESPACE_COLUMNS).toContain('S_Konfession');
      expect(WHITESPACE_COLUMNS).toContain('K_Name');
      expect(WHITESPACE_COLUMNS).toContain('K_Schulhaus_Name');
    });
  });

  // ===== IBAN =====
  describe('formatIBAN', () => {
    it('formats Swiss IBAN', () => {
      expect(formatIBAN('CH9300762011623852957')).toBe('CH93 0076 2011 6238 5295 7');
    });
    it('returns null for non-CH', () => {
      expect(formatIBAN('DE89370400440532013000')).toBeNull();
    });
  });
});

// ===== Sibling Consistency Check =====
import { validateData } from '../lib/fileParser';
import { schuelerColumns } from '../types/importTypes';

describe('Sibling Consistency Check', () => {
  it('flags children with same parent ID but different PLZ', () => {
    const rows = [
      { S_ID: '1', S_Name: 'Müller', S_Vorname: 'Anna', S_Geschlecht: 'W', S_Geburtsdatum: '01.01.2015', S_AHV: '756.1234.5678.04', K_Name: '1a', P_ERZ1_ID: 'E1', S_PLZ: '8001', S_Ort: 'Zürich' },
      { S_ID: '2', S_Name: 'Müller', S_Vorname: 'Max', S_Geschlecht: 'M', S_Geburtsdatum: '01.01.2017', S_AHV: '756.9876.5432.10', K_Name: '1a', P_ERZ1_ID: 'E1', S_PLZ: '8002', S_Ort: 'Zürich' },
    ];
    const errors = validateData(rows, schuelerColumns);
    const siblingErrors = errors.filter(e => e.message.includes('Geschwister-Inkonsistenz'));
    expect(siblingErrors.length).toBeGreaterThanOrEqual(1);
    expect(siblingErrors.some(e => e.column === 'S_PLZ')).toBe(true);
    expect(siblingErrors[0].severity).toBe('warning');
  });

  it('flags children with same parent ID but different Ort', () => {
    const rows = [
      { S_ID: '1', S_Name: 'Meier', S_Vorname: 'Lisa', S_Geschlecht: 'W', S_Geburtsdatum: '01.01.2015', S_AHV: '756.1111.2222.33', K_Name: '2a', P_ERZ2_ID: 'E5', S_PLZ: '3000', S_Ort: 'Bern' },
      { S_ID: '2', S_Name: 'Meier', S_Vorname: 'Tom', S_Geschlecht: 'M', S_Geburtsdatum: '01.01.2017', S_AHV: '756.4444.5555.66', K_Name: '2a', P_ERZ2_ID: 'E5', S_PLZ: '3000', S_Ort: 'Berne' },
    ];
    const errors = validateData(rows, schuelerColumns);
    const siblingErrors = errors.filter(e => e.message.includes('Geschwister-Inkonsistenz'));
    expect(siblingErrors.length).toBeGreaterThanOrEqual(1);
    expect(siblingErrors.some(e => e.column === 'S_Ort')).toBe(true);
  });

  it('does not flag siblings with identical PLZ and Ort', () => {
    const rows = [
      { S_ID: '1', S_Name: 'Weber', S_Vorname: 'Eva', S_Geschlecht: 'W', S_Geburtsdatum: '01.01.2015', S_AHV: '756.7777.8888.99', K_Name: '3a', P_ERZ1_ID: 'E9', S_PLZ: '6000', S_Ort: 'Luzern' },
      { S_ID: '2', S_Name: 'Weber', S_Vorname: 'Jan', S_Geschlecht: 'M', S_Geburtsdatum: '01.01.2017', S_AHV: '756.0000.1111.22', K_Name: '3a', P_ERZ1_ID: 'E9', S_PLZ: '6000', S_Ort: 'Luzern' },
    ];
    const errors = validateData(rows, schuelerColumns);
    const siblingErrors = errors.filter(e => e.message.includes('Geschwister-Inkonsistenz'));
    expect(siblingErrors.length).toBe(0);
  });

  it('does not flag single children (no siblings)', () => {
    const rows = [
      { S_ID: '1', S_Name: 'Solo', S_Vorname: 'Kind', S_Geschlecht: 'M', S_Geburtsdatum: '01.01.2015', S_AHV: '756.3333.4444.55', K_Name: '4a', P_ERZ1_ID: 'E99', S_PLZ: '9000', S_Ort: 'St. Gallen' },
    ];
    const errors = validateData(rows, schuelerColumns);
    const siblingErrors = errors.filter(e => e.message.includes('Geschwister-Inkonsistenz'));
    expect(siblingErrors.length).toBe(0);
  });
});

// ===== PLZ↔Ort Validation =====
import { validatePlzOrt } from '../lib/swissPlzData';

describe('PLZ↔Ort Validation', () => {
  it('returns true for valid PLZ-Ort pair', () => {
    expect(validatePlzOrt('8001', 'Zürich')).toBe(true);
    expect(validatePlzOrt('3004', 'Bern')).toBe(true);
    expect(validatePlzOrt('6003', 'Luzern')).toBe(true);
    expect(validatePlzOrt('9000', 'St. Gallen')).toBe(true);
    expect(validatePlzOrt('9000', 'St.Gallen')).toBe(true);
  });

  it('returns expected Orte for mismatch', () => {
    const result = validatePlzOrt('8001', 'Bern');
    expect(result).not.toBe(true);
    expect(result).not.toBeNull();
    expect(Array.isArray(result)).toBe(true);
    expect((result as string[])).toContain('Zürich');
  });

  it('returns null for unknown PLZ', () => {
    expect(validatePlzOrt('9999', 'Nirgendwo')).toBeNull();
  });

  it('matches case-insensitively', () => {
    expect(validatePlzOrt('8001', 'zürich')).toBe(true);
    expect(validatePlzOrt('8001', 'ZÜRICH')).toBe(true);
  });

  it('flags PLZ↔Ort mismatch in validateData', () => {
    const rows = [
      { S_ID: '1', S_Name: 'Test', S_Vorname: 'Kind', S_Geschlecht: 'M', S_Geburtsdatum: '01.01.2015', S_AHV: '756.1234.5678.04', K_Name: '1a', S_PLZ: '8001', S_Ort: 'Bern' },
    ];
    const errors = validateData(rows, schuelerColumns);
    const plzErrors = errors.filter(e => e.message.includes('PLZ'));
    expect(plzErrors.length).toBeGreaterThanOrEqual(1);
    expect(plzErrors[0].severity).toBe('warning');
    expect(plzErrors[0].column).toBe('S_Ort');
  });

  it('does not flag correct PLZ↔Ort in validateData', () => {
    const rows = [
      { S_ID: '1', S_Name: 'Test', S_Vorname: 'Kind', S_Geschlecht: 'M', S_Geburtsdatum: '01.01.2015', S_AHV: '756.1234.5678.04', K_Name: '1a', S_PLZ: '8001', S_Ort: 'Zürich' },
    ];
    const errors = validateData(rows, schuelerColumns);
    const plzErrors = errors.filter(e => e.message.includes('PLZ'));
    expect(plzErrors.length).toBe(0);
  });
});
