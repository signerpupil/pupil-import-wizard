/**
 * Local Bulk Correction Logic - NO external AI calls
 * All data processing happens locally in the browser
 */

import type { ValidationError, ParsedRow } from '@/types/importTypes';

export interface LocalSuggestion {
  type: string;
  affectedColumn: string;
  affectedRows: number[];
  pattern: string;
  suggestion: string;
  autoFix: boolean;
  fixFunction: string;
  correctValue?: string | null;
}

// ============================================
// Format Functions (Swiss-specific)
// ============================================

export function formatSwissPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  
  // Swiss mobile: 07X XXX XX XX
  if (digits.length === 10 && digits.startsWith('07')) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
  // Swiss landline: 0XX XXX XX XX
  if (digits.length === 10 && digits.startsWith('0')) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
  // With country code +41
  if (digits.length === 11 && digits.startsWith('41')) {
    return `+41 ${digits.slice(2, 4)} ${digits.slice(4, 7)} ${digits.slice(7, 9)} ${digits.slice(9, 11)}`;
  }
  // With 0041 prefix
  if (digits.length === 13 && digits.startsWith('0041')) {
    return `+41 ${digits.slice(4, 6)} ${digits.slice(6, 9)} ${digits.slice(9, 11)} ${digits.slice(11, 13)}`;
  }
  return null;
}

export function formatSwissPLZ(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 4) {
    return digits;
  }
  return null;
}

export function formatPostfach(value: string): string | null {
  const lower = value.toLowerCase().trim();
  const match = lower.match(/(?:postfach|pf|p\.f\.)?\s*(\d+)/i);
  if (match) {
    return `Postfach ${match[1]}`;
  }
  return null;
}

export function formatAHV(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('756')) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 7)}.${digits.slice(7, 11)}.${digits.slice(11, 13)}`;
  }
  return null;
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

// Convert date formats: DD-MM-YYYY or YYYY-MM-DD → DD.MM.YYYY
export function formatDateDE(value: string): string | null {
  const dashMatch = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) return `${dashMatch[1].padStart(2, '0')}.${dashMatch[2].padStart(2, '0')}.${dashMatch[3]}`;
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
  return null;
}

// Trim leading/trailing whitespace and normalize multiple spaces
export function trimWhitespace(value: string): string | null {
  const trimmed = value.trim().replace(/\s{2,}/g, ' ');
  return trimmed !== value ? trimmed : null;
}

export function formatEmail(value: string): string | null {
  let cleaned = value.trim().toLowerCase();
  cleaned = cleaned.replace(/\s+/g, '');
  cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  if (cleaned.includes('@') && cleaned.includes('.')) {
    return cleaned;
  }
  return null;
}

export function formatGender(value: string): string | null {
  const normalized = value.toUpperCase().trim();
  const maleValues = ['MÄNNLICH', 'MALE', 'MANN', 'M', 'MAENNLICH', 'HERR', 'H'];
  const femaleValues = ['WEIBLICH', 'FEMALE', 'FRAU', 'W', 'F'];
  const diverseValues = ['DIVERS', 'DIVERSE', 'D', 'X', 'ANDERES'];
  
  if (maleValues.includes(normalized)) return 'M';
  if (femaleValues.includes(normalized)) return 'W';
  if (diverseValues.includes(normalized)) return 'D';
  
  return null;
}

// Format name - capitalize properly
export function formatName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  
  // Check if it needs formatting (all caps, all lower)
  const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase();
  const isAllLower = trimmed === trimmed.toLowerCase() && trimmed !== trimmed.toUpperCase();
  
  if (!isAllCaps && !isAllLower) return null;
  
  // Capitalize each word, handle hyphenated names
  return trimmed
    .toLowerCase()
    .split(/(\s+|-)/g)
    .map(part => {
      if (part === '-' || /^\s+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

// Format street address
export function formatStreet(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  
  const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase();
  const isAllLower = trimmed === trimmed.toLowerCase() && trimmed !== trimmed.toUpperCase();
  
  if (!isAllCaps && !isAllLower) return null;
  
  let formatted = trimmed.toLowerCase();
  formatted = formatted.replace(/^str\.?\s*/i, 'Strasse ');
  formatted = formatted.replace(/\bstr\.?$/i, 'strasse');
  
  return formatted
    .split(/(\s+)/g)
    .map(part => {
      if (/^\s+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

// Format IBAN
export function formatIBAN(value: string): string | null {
  const cleaned = value.replace(/\s/g, '').toUpperCase();
  if (cleaned.startsWith('CH') && cleaned.length === 21) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8, 12)} ${cleaned.slice(12, 16)} ${cleaned.slice(16, 20)} ${cleaned.slice(20)}`;
  }
  return null;
}

// ============================================
// Pattern Detection Functions - Optimized for large datasets
// ============================================

interface PatternGroup {
  type: string;
  column: string;
  rows: number[];
  values: string[];
  fixFunction: string;
  description: string;
  canAutoFix: boolean;
}

// Pre-index errors by column for O(1) lookup instead of O(n) filtering
interface ErrorIndex {
  byColumn: Map<string, ValidationError[]>;
  uncorrected: ValidationError[];
}

function buildErrorIndex(errors: ValidationError[]): ErrorIndex {
  const byColumn = new Map<string, ValidationError[]>();
  const uncorrected: ValidationError[] = [];
  
  for (let i = 0; i < errors.length; i++) {
    const error = errors[i];
    if (error.correctedValue !== undefined) continue;
    
    uncorrected.push(error);
    
    const columnErrors = byColumn.get(error.column);
    if (columnErrors) {
      columnErrors.push(error);
    } else {
      byColumn.set(error.column, [error]);
    }
  }
  
  return { byColumn, uncorrected };
}

// Batch process pattern detection for a column type
function detectPatternForColumns(
  index: ErrorIndex,
  columns: string[],
  messageKeyword: string,
  formatFn: (value: string) => string | null,
  type: string,
  fixFunction: string,
  descriptionFn: (count: number) => string
): PatternGroup[] {
  const groups: PatternGroup[] = [];
  
  for (const col of columns) {
    const columnErrors = index.byColumn.get(col);
    if (!columnErrors || columnErrors.length === 0) continue;
    
    const fixableRows: number[] = [];
    const fixableValues: string[] = [];
    
    for (let i = 0; i < columnErrors.length; i++) {
      const e = columnErrors[i];
      if (e.message.includes(messageKeyword) && formatFn(e.value) !== null) {
        fixableRows.push(e.row);
        fixableValues.push(e.value);
      }
    }
    
    if (fixableRows.length > 0) {
      groups.push({
        type,
        column: col,
        rows: fixableRows,
        values: fixableValues,
        fixFunction,
        description: descriptionFn(fixableRows.length),
        canAutoFix: true
      });
    }
  }
  
  return groups;
}

function detectPhonePattern(index: ErrorIndex): PatternGroup[] {
  const phoneColumns = ['P_ERZ1_Tel', 'P_ERZ2_Tel', 'P_ERZ1_Mobile', 'P_ERZ2_Mobile', 'S_Tel', 'S_Mobile'];
  return detectPatternForColumns(
    index,
    phoneColumns,
    'Telefonformat',
    formatSwissPhone,
    'phone_format',
    'formatSwissPhone',
    (count) => `${count} Telefonnummern können ins Schweizer Format konvertiert werden`
  );
}

function detectAHVPattern(index: ErrorIndex): PatternGroup[] {
  const ahvColumns = ['S_AHV', 'P_ERZ1_AHV', 'P_ERZ2_AHV', 'L_KL1_AHV'];
  return detectPatternForColumns(
    index,
    ahvColumns,
    'AHV',
    formatAHV,
    'ahv_format',
    'formatAHV',
    (count) => `${count} AHV-Nummern können formatiert werden (756.XXXX.XXXX.XX)`
  );
}

function detectDatePattern(index: ErrorIndex): PatternGroup[] {
  const groups: PatternGroup[] = [];
  const dateColumns = ['S_Geburtsdatum', 'P_ERZ1_Geburtsdatum', 'P_ERZ2_Geburtsdatum', 'Datum'];
  
  for (const col of dateColumns) {
    const columnErrors = index.byColumn.get(col);
    if (!columnErrors || columnErrors.length === 0) continue;
    
    const excelDateRows: number[] = [];
    const excelDateValues: string[] = [];
    
    for (let i = 0; i < columnErrors.length; i++) {
      const e = columnErrors[i];
      if (!e.message.includes('Datum')) continue;
      
      const num = parseInt(e.value);
      if (!isNaN(num) && num > 1 && num < 100000) {
        excelDateRows.push(e.row);
        excelDateValues.push(e.value);
      }
    }
    
    if (excelDateRows.length > 0) {
      groups.push({
        type: 'excel_date',
        column: col,
        rows: excelDateRows,
        values: excelDateValues,
        fixFunction: 'convertExcelDate',
        description: `${excelDateRows.length} Excel-Seriennummern können in Datumsformat konvertiert werden`,
        canAutoFix: true
      });
    }
  }
  
  return groups;
}

function detectEmailPattern(index: ErrorIndex): PatternGroup[] {
  const emailColumns = ['S_Email', 'P_ERZ1_Email', 'P_ERZ2_Email', 'P_Email'];
  return detectPatternForColumns(
    index,
    emailColumns,
    'E-Mail',
    formatEmail,
    'email_format',
    'formatEmail',
    (count) => `${count} E-Mail-Adressen können bereinigt werden (Leerzeichen, Umlaute)`
  );
}

function detectPLZPattern(index: ErrorIndex): PatternGroup[] {
  const plzColumns = ['S_PLZ', 'P_ERZ1_PLZ', 'P_ERZ2_PLZ'];
  return detectPatternForColumns(
    index,
    plzColumns,
    'PLZ',
    formatSwissPLZ,
    'plz_format',
    'formatSwissPLZ',
    (count) => `${count} Postleitzahlen können bereinigt werden`
  );
}

function detectGenderPattern(index: ErrorIndex): PatternGroup[] {
  const genderColumns = ['S_Geschlecht'];
  return detectPatternForColumns(
    index,
    genderColumns,
    'Geschlecht',
    formatGender,
    'gender_format',
    'formatGender',
    (count) => `${count} Geschlechtsangaben können normalisiert werden (M/W/D)`
  );
}

function detectDuplicateGroups(index: ErrorIndex): PatternGroup[] {
  const groups: PatternGroup[] = [];
  const byColumn = new Map<string, ValidationError[]>();
  
  for (const error of index.uncorrected) {
    if (!error.message.includes('Duplikat:')) continue;
    
    const existing = byColumn.get(error.column);
    if (existing) {
      existing.push(error);
    } else {
      byColumn.set(error.column, [error]);
    }
  }
  
  byColumn.forEach((columnErrors, column) => {
    if (columnErrors.length > 0) {
      groups.push({
        type: 'duplicate',
        column,
        rows: columnErrors.map(e => e.row),
        values: columnErrors.map(e => e.value),
        fixFunction: 'manual',
        description: `${columnErrors.length} Duplikate in Spalte ${column} - Manuelle Prüfung erforderlich`,
        canAutoFix: false
      });
    }
  });
  
  return groups;
}

function detectParentIdInconsistencies(index: ErrorIndex): PatternGroup[] {
  const groups: PatternGroup[] = [];
  const byColumn = new Map<string, ValidationError[]>();
  
  for (const error of index.uncorrected) {
    if (!error.message.includes('Inkonsistente ID:')) continue;
    
    const existing = byColumn.get(error.column);
    if (existing) {
      existing.push(error);
    } else {
      byColumn.set(error.column, [error]);
    }
  }
  
  byColumn.forEach((columnErrors, column) => {
    if (columnErrors.length > 0) {
      const firstError = columnErrors[0];
      const idMatch = firstError.message.match(/die ID '([^']+)'/);
      const suggestedId = idMatch ? idMatch[1] : null;
      
      groups.push({
        type: 'parent_id_inconsistent',
        column,
        rows: columnErrors.map(e => e.row),
        values: columnErrors.map(e => e.value),
        fixFunction: suggestedId ? 'consolidateId' : 'manual',
        description: suggestedId 
          ? `${columnErrors.length} inkonsistente IDs - Kann auf "${suggestedId}" konsolidiert werden`
          : `${columnErrors.length} inkonsistente IDs - Manuelle Prüfung erforderlich`,
        canAutoFix: !!suggestedId
      });
    }
  });
  
  return groups;
}

// Detect DD-MM-YYYY or YYYY-MM-DD date format issues
function detectDateFormatPattern(index: ErrorIndex): PatternGroup[] {
  const dateColumns = ['S_Geburtsdatum', 'P_ERZ1_Geburtsdatum', 'P_ERZ2_Geburtsdatum', 'Datum'];
  const groups: PatternGroup[] = [];

  for (const col of dateColumns) {
    const columnErrors = index.byColumn.get(col);
    if (!columnErrors || columnErrors.length === 0) continue;

    const fixableRows: number[] = [];
    const fixableValues: string[] = [];

    for (const e of columnErrors) {
      if (formatDateDE(e.value) !== null) {
        fixableRows.push(e.row);
        fixableValues.push(e.value);
      }
    }

    if (fixableRows.length > 0) {
      groups.push({
        type: 'date_de_format',
        column: col,
        rows: fixableRows,
        values: fixableValues,
        fixFunction: 'date_de_format',
        description: `${fixableRows.length} Datumsangaben im falschen Format (Bindestriche/ISO) → DD.MM.YYYY`,
        canAutoFix: true,
      });
    }
  }

  return groups;
}

// Detect whitespace issues (leading/trailing spaces, double spaces) in text columns
function detectWhitespacePattern(index: ErrorIndex): PatternGroup[] {
  const textColumns = [
    'S_Name', 'S_Vorname', 'S_Strasse', 'S_Ort',
    'P_ERZ1_Name', 'P_ERZ1_Vorname', 'P_ERZ1_Strasse', 'P_ERZ1_Ort',
    'P_ERZ2_Name', 'P_ERZ2_Vorname', 'P_ERZ2_Strasse', 'P_ERZ2_Ort',
  ];
  const groups: PatternGroup[] = [];

  for (const col of textColumns) {
    const columnErrors = index.byColumn.get(col);
    if (!columnErrors || columnErrors.length === 0) continue;

    const fixableRows: number[] = [];
    const fixableValues: string[] = [];

    for (const e of columnErrors) {
      if (trimWhitespace(e.value) !== null) {
        fixableRows.push(e.row);
        fixableValues.push(e.value);
      }
    }

    if (fixableRows.length > 0) {
      groups.push({
        type: 'whitespace_trim',
        column: col,
        rows: fixableRows,
        values: fixableValues,
        fixFunction: 'whitespace_trim',
        description: `${fixableRows.length} Einträge in "${col}" mit führenden/nachfolgenden Leerzeichen`,
        canAutoFix: true,
      });
    }
  }

  return groups;
}

// ============================================
// Main Analysis Function - Optimized
// ============================================

export function analyzeErrorsLocally(
  errors: ValidationError[],
  _rows: ParsedRow[]
): LocalSuggestion[] {
  const suggestions: LocalSuggestion[] = [];
  
  // Build index once for O(1) column lookups
  const index = buildErrorIndex(errors);
  
  if (index.uncorrected.length === 0) {
    return suggestions;
  }
  
  // Run all pattern detectors with indexed data
  const patternGroups: PatternGroup[] = [
    ...detectPhonePattern(index),
    ...detectAHVPattern(index),
    ...detectDatePattern(index),
    ...detectDateFormatPattern(index),
    ...detectWhitespacePattern(index),
    ...detectEmailPattern(index),
    ...detectPLZPattern(index),
    ...detectGenderPattern(index),
    ...detectDuplicateGroups(index),
    ...detectParentIdInconsistencies(index),
  ];
  
  // Convert pattern groups to suggestions
  for (const group of patternGroups) {
    if (group.rows.length > 0) {
      suggestions.push({
        type: group.type,
        affectedColumn: group.column,
        affectedRows: group.rows,
        pattern: group.description,
        suggestion: group.canAutoFix 
          ? 'Automatische Korrektur verfügbar - kein Datenversand erforderlich'
          : 'Manuelle Überprüfung empfohlen',
        autoFix: group.canAutoFix,
        fixFunction: group.fixFunction,
      });
    }
  }
  
  return suggestions;
}

// ============================================
// Apply Corrections Function - Optimized for bulk operations
// ============================================

export function applyLocalCorrection(
  suggestion: LocalSuggestion,
  errors: ValidationError[]
): { row: number; column: string; value: string }[] {
  const corrections: { row: number; column: string; value: string }[] = [];
  
  // Build a quick lookup map for errors by row+column
  const errorMap = new Map<string, ValidationError>();
  for (const error of errors) {
    if (error.column === suggestion.affectedColumn) {
      errorMap.set(`${error.row}:${error.column}`, error);
    }
  }
  
  // Get the fix function once
  const fixFn = getFixFunction(suggestion.fixFunction);
  
  for (const rowNum of suggestion.affectedRows) {
    const key = `${rowNum}:${suggestion.affectedColumn}`;
    const error = errorMap.get(key);
    
    if (!error || !error.value) continue;
    
    let correctedValue: string | null = null;
    
    if (fixFn) {
      correctedValue = fixFn(error.value);
    } else if (suggestion.fixFunction === 'consolidateId') {
      const idMatch = error.message.match(/die ID '([^']+)'/);
      if (idMatch) {
        correctedValue = idMatch[1];
      }
    }
    
    if (correctedValue) {
      corrections.push({
        row: rowNum,
        column: suggestion.affectedColumn,
        value: correctedValue,
      });
    }
  }
  
  return corrections;
}

// Get the appropriate fix function
function getFixFunction(name: string): ((value: string) => string | null) | null {
  switch (name) {
    case 'formatSwissPhone': return formatSwissPhone;
    case 'formatAHV': return formatAHV;
    case 'convertExcelDate': return convertExcelDate;
    case 'formatEmail': return formatEmail;
    case 'formatSwissPLZ': return formatSwissPLZ;
    case 'formatGender': return formatGender;
    case 'formatName': return formatName;
    case 'formatStreet': return formatStreet;
    case 'formatIBAN': return formatIBAN;
    // Worker-style types
    case 'phone_format': return formatSwissPhone;
    case 'ahv_format': return formatAHV;
    case 'email_format': return formatEmail;
    case 'plz_format': return formatSwissPLZ;
    case 'gender_format': return formatGender;
    case 'name_format': return formatName;
    case 'street_format': return formatStreet;
    case 'iban_format': return formatIBAN;
    case 'date_format': return convertExcelDate;
    case 'date_de_format': return formatDateDE;
    case 'whitespace_trim': return trimWhitespace;
    default: return null;
  }
}
