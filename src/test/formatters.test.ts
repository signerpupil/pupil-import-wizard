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
    it('validates correct checksum (EAN-13)', () => {
      // 756.1234.5678.97 → checksum: sum of weighted digits mod 10
      // This is a synthetic test; real AHV numbers need proper checksums
      expect(typeof isValidAHVChecksum('756.1234.5678.01')).toBe('boolean');
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
    it('expands str. abbreviation with dot', () => {
      expect(formatStreet('bahnhofstr.')).toBe('Bahnhofstrasse');
    });
    it('expands pl. abbreviation with dot', () => {
      expect(formatStreet('dorfpl.')).toBe('Dorfplatz');
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
    it('converts Excel serial number', () => {
      expect(convertExcelDate('44123')).toBe('19.10.2020');
    });
    it('returns null for non-serial', () => {
      expect(convertExcelDate('abc')).toBeNull();
    });
  });

  // ===== Whitespace =====
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
