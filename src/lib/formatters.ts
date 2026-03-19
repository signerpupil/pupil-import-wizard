/**
 * Shared Format & Validation Functions (Swiss-specific)
 * Single source of truth — used by localBulkCorrections.ts, validationWorker.ts, and fileParser.ts
 */

// ============================================
// Column Name Constants (matching importTypes.ts)
// ============================================

export const PHONE_COLUMNS = [
  'S_Telefon', 'S_Mobil',
  'P_ERZ1_TelefonPrivat', 'P_ERZ1_TelefonGeschaeft', 'P_ERZ1_Mobil',
  'P_ERZ2_TelefonPrivat', 'P_ERZ2_TelefonGeschaeft', 'P_ERZ2_Mobil',
];

export const EMAIL_COLUMNS = [
  'S_EMail',
  'P_ERZ1_EMail',
  'P_ERZ2_EMail',
];

export const AHV_COLUMNS = ['S_AHV', 'P_ERZ1_AHV', 'P_ERZ2_AHV'];

export const DATE_COLUMNS = [
  'S_Geburtsdatum', 'S_Eintritt_Kiga_Datum', 'S_Eintritt_Primar_Datum',
  'S_Eintritt_Sek_Datum', 'S_Eintritt_Datum', 'S_Austritt_Datum',
  'Datum', 'Absenz_von', 'Absenz_bis', 'Entschuldigung_Datum',
  'Zeitraum_von', 'Zeitraum_bis', 'Foerderverlauf_Datum',
  'Datum_Beginn', 'Datum_Abschluss',
];

export const PLZ_COLUMNS = ['S_PLZ', 'P_ERZ1_PLZ', 'P_ERZ2_PLZ'];

export const GENDER_COLUMNS = ['S_Geschlecht', 'P_ERZ1_Geschl', 'P_ERZ2_Geschl'];

export const NAME_COLUMNS = [
  'S_Name', 'S_Vorname',
  'P_ERZ1_Name', 'P_ERZ1_Vorname',
  'P_ERZ2_Name', 'P_ERZ2_Vorname',
  'L_KL1_Name', 'L_KL1_Vorname',
];

export const STREET_COLUMNS = [
  'S_Strasse',
  'P_ERZ1_Strasse',
  'P_ERZ2_Strasse',
];

export const ORT_COLUMNS = [
  'S_Ort',
  'P_ERZ1_Ort',
  'P_ERZ2_Ort',
];

export const WHITESPACE_COLUMNS = [
  ...NAME_COLUMNS,
  ...STREET_COLUMNS,
  ...ORT_COLUMNS,
  'S_Heimatort', 'S_Konfession',
  'K_Name', 'K_Schulhaus_Name',
];

// ============================================
// Format Functions
// ============================================

export function formatSwissPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');

  // With 0041 prefix (13 digits)
  if (digits.length === 13 && digits.startsWith('0041')) {
    return `+41 ${digits.slice(4, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 11)} ${digits.slice(11, 13)}`;
  }
  // With country code +41 (11 digits)
  if (digits.length === 11 && digits.startsWith('41')) {
    return `+41 ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
  }
  // National format 0XX XXX XX XX (10 digits)
  if (digits.length === 10 && digits.startsWith('0')) {
    return `+41 ${digits.slice(1, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
  // 9 digits without leading 0
  if (digits.length === 9 && !digits.startsWith('0')) {
    return `+41 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5, 7)} ${digits.slice(7, 9)}`;
  }
  return null;
}

export function formatSwissPLZ(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 4) return digits;
  if (digits.length === 5) return digits; // DE/AT support
  return null;
}

export function formatPostfach(value: string): string | null {
  const match = value.match(/(?:postfach|pf|p\.f\.)?\s*(\d+)/i);
  if (match) return `Postfach ${match[1]}`;
  return null;
}

export function formatAHV(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('756')) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 7)}.${digits.slice(7, 11)}.${digits.slice(11, 13)}`;
  }
  return null;
}

/** Validate AHV checksum (EAN-13 algorithm) */
export function isValidAHVChecksum(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 13 || !digits.startsWith('756')) return false;

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const d = parseInt(digits[i]);
    sum += i % 2 === 0 ? d : d * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(digits[12]);
}

export function convertExcelDate(value: string): string | null {
  const serialNum = parseInt(value);
  if (!isNaN(serialNum) && serialNum > 1 && serialNum < 100000) {
    const date = new Date((serialNum - 25569) * 86400 * 1000);
    if (!isNaN(date.getTime())) {
      return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
    }
  }
  return null;
}

/**
 * Expand a 2-digit year to 4 digits with plausibility:
 * - 00–30 → 2000–2030 (likely birth years for current students)
 * - 31–99 → 1931–1999 (likely birth years for parents/older)
 */
function expandTwoDigitYear(yy: number): number {
  return yy <= 30 ? 2000 + yy : 1900 + yy;
}

/** Convert DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY, or DD.MM.YY → DD.MM.YYYY */
export function formatDateDE(value: string): string | null {
  const dashMatch = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) return `${dashMatch[1].padStart(2, '0')}.${dashMatch[2].padStart(2, '0')}.${dashMatch[3]}`;

  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;

  const slashMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) return `${slashMatch[1].padStart(2, '0')}.${slashMatch[2].padStart(2, '0')}.${slashMatch[3]}`;

  // DD.MM.YY → DD.MM.YYYY (2-digit year with plausibility)
  const twoDigitMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2})$/);
  if (twoDigitMatch) {
    const year = expandTwoDigitYear(parseInt(twoDigitMatch[3]));
    return `${twoDigitMatch[1].padStart(2, '0')}.${twoDigitMatch[2].padStart(2, '0')}.${year}`;
  }

  // DD-MM-YY → DD.MM.YYYY
  const dashTwoDigit = value.match(/^(\d{1,2})-(\d{1,2})-(\d{2})$/);
  if (dashTwoDigit) {
    const year = expandTwoDigitYear(parseInt(dashTwoDigit[3]));
    return `${dashTwoDigit[1].padStart(2, '0')}.${dashTwoDigit[2].padStart(2, '0')}.${year}`;
  }

  // DD/MM/YY → DD.MM.YYYY
  const slashTwoDigit = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (slashTwoDigit) {
    const year = expandTwoDigitYear(parseInt(slashTwoDigit[3]));
    return `${slashTwoDigit[1].padStart(2, '0')}.${slashTwoDigit[2].padStart(2, '0')}.${year}`;
  }

  return null;
}

export function trimWhitespace(value: string): string | null {
  const trimmed = value.trim().replace(/\s{2,}/g, ' ');
  return trimmed !== value ? trimmed : null;
}

export function formatEmail(value: string): string | null {
  let cleaned = value.trim().toLowerCase();
  cleaned = cleaned.replace(/\s+/g, '');
  cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  // Fix common typos
  cleaned = cleaned.replace(/,/g, '.');
  cleaned = cleaned.replace(/\.+/g, '.');
  cleaned = cleaned.replace(/@+/g, '@');
  // Fix common domain typos
  cleaned = cleaned.replace(/@gmial\./, '@gmail.');
  cleaned = cleaned.replace(/@gmai\./, '@gmail.');
  cleaned = cleaned.replace(/@gamil\./, '@gmail.');
  cleaned = cleaned.replace(/@hotmal\./, '@hotmail.');
  cleaned = cleaned.replace(/@hotmai\./, '@hotmail.');
  cleaned = cleaned.replace(/@outllok\./, '@outlook.');
  cleaned = cleaned.replace(/@outlok\./, '@outlook.');
  cleaned = cleaned.replace(/@yahooo\./, '@yahoo.');
  cleaned = cleaned.replace(/@yaho\./, '@yahoo.');
  cleaned = cleaned.replace(/@gmx\.cch$/, '@gmx.ch');
  cleaned = cleaned.replace(/@bleuwin\./, '@bluewin.');
  cleaned = cleaned.replace(/@protonmai\./, '@protonmail.');
  cleaned = cleaned.replace(/@protonmal\./, '@protonmail.');
  cleaned = cleaned.replace(/@iclod\./, '@icloud.');
  cleaned = cleaned.replace(/@icloude\./, '@icloud.');

  if (cleaned.includes('@') && cleaned.includes('.')) {
    return cleaned;
  }
  return null;
}

/** All accepted gender values — single source of truth */
const MALE_VALUES = ['M', 'MÄNNLICH', 'MALE', 'MANN', 'MAENNLICH', 'HERR', 'H'];
const FEMALE_VALUES = ['W', 'WEIBLICH', 'FEMALE', 'FRAU', 'F'];
const DIVERSE_VALUES = ['D', 'DIVERS', 'DIVERSE', 'X', 'ANDERES'];

export const ALL_VALID_GENDER_VALUES = [...MALE_VALUES, ...FEMALE_VALUES, ...DIVERSE_VALUES];

export function formatGender(value: string): string | null {
  const normalized = value.toUpperCase().trim();
  if (MALE_VALUES.includes(normalized)) return 'M';
  if (FEMALE_VALUES.includes(normalized)) return 'W';
  if (DIVERSE_VALUES.includes(normalized)) return 'D';
  return null;
}

/** Validation: accepts all values that formatGender can handle + M/W/D directly */
export function isValidGender(value: string): boolean {
  return formatGender(value) !== null;
}

export function formatName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase();
  const isAllLower = trimmed === trimmed.toLowerCase() && trimmed !== trimmed.toUpperCase();
  if (!isAllCaps && !isAllLower) return null;

  return trimmed
    .toLowerCase()
    .split(/(\s+|-)/g)
    .map(part => {
      if (part === '-' || /^\s+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

/** Format street address — capitalize and fix abbreviations */
export function formatStreet(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase();
  const isAllLower = trimmed === trimmed.toLowerCase() && trimmed !== trimmed.toUpperCase();
  if (!isAllCaps && !isAllLower) return null;

  let formatted = trimmed.toLowerCase();
  formatted = formatted.replace(/^str\.?\s*/i, 'Strasse ');
  formatted = formatted.replace(/\bstr\.?$/i, 'strasse');
  formatted = formatted.replace(/\bweg\.?$/i, 'weg');
  formatted = formatted.replace(/\bpl\.?$/i, 'platz');

  return formatted
    .split(/(\s+)/g)
    .map(part => {
      if (/^\s+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

/** Format location (Ort) — same as name (Proper Case) */
export function formatOrt(value: string): string | null {
  return formatName(value);
}

export function formatIBAN(value: string): string | null {
  const cleaned = value.replace(/\s/g, '').toUpperCase();
  if (cleaned.startsWith('CH') && cleaned.length === 21) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8, 12)} ${cleaned.slice(12, 16)} ${cleaned.slice(16, 20)} ${cleaned.slice(20)}`;
  }
  return null;
}

// ============================================
// Age Plausibility Check
// ============================================

/** Parse DD.MM.YYYY into a Date */
export function parseDateDMY(value: string): Date | null {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!match) return null;
  const d = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
  return isNaN(d.getTime()) ? null : d;
}

/** Calculate age in years from birthdate to reference date */
export function calculateAge(birthDate: Date, referenceDate: Date = new Date()): number {
  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const m = referenceDate.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && referenceDate.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// ============================================
// Swiss Patterns (Regex)
// ============================================

export const SWISS_PATTERNS = {
  ahv: /^756\.\d{4}\.\d{4}\.\d{2}$/,
  ahvDigits: /^756\d{10}$/,
  phoneMobile: /^\+41\s?7[5-9]\s?\d{3}\s?\d{2}\s?\d{2}$/,
  phoneFixed: /^\+41\s?[1-6]\d\s?\d{3}\s?\d{2}\s?\d{2}$/,
  plz: /^\d{4}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  iban: /^CH\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{1}$/i,
  date: /^\d{1,2}\.\d{1,2}\.\d{4}$/,
};

// ============================================
// Fix Function Registry
// ============================================

export function getFixFunction(name: string): ((value: string) => string | null) | null {
  switch (name) {
    case 'formatSwissPhone':
    case 'phone_format':
      return formatSwissPhone;
    case 'formatAHV':
    case 'ahv_format':
      return formatAHV;
    case 'convertExcelDate':
    case 'date_format':
      return convertExcelDate;
    case 'formatEmail':
    case 'email_format':
      return formatEmail;
    case 'formatSwissPLZ':
    case 'plz_format':
      return formatSwissPLZ;
    case 'formatGender':
    case 'gender_format':
      return formatGender;
    case 'formatName':
    case 'name_format':
      return formatName;
    case 'formatStreet':
    case 'street_format':
      return formatStreet;
    case 'formatOrt':
    case 'ort_format':
      return formatOrt;
    case 'formatIBAN':
    case 'iban_format':
      return formatIBAN;
    case 'date_de_format':
      return formatDateDE;
    case 'whitespace_trim':
      return trimWhitespace;
    case 'language_bista':
    case 'nationality_correction':
      return null; // handled via error.correctedValue directly
    default:
      return null;
  }
}
