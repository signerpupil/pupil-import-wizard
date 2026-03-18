/**
 * Local Bulk Correction Logic - NO external AI calls
 * All data processing happens locally in the browser
 */

import type { ValidationError, ParsedRow } from '@/types/importTypes';
import { NATIONALITY_AUTO_CORRECTIONS } from '@/lib/fileParser';
import {
  formatSwissPhone, formatSwissPLZ, formatPostfach, formatAHV, convertExcelDate,
  formatDateDE, trimWhitespace, formatEmail, formatGender, formatName, formatStreet,
  formatOrt, formatIBAN, getFixFunction,
  PHONE_COLUMNS, EMAIL_COLUMNS, AHV_COLUMNS, DATE_COLUMNS, PLZ_COLUMNS,
  GENDER_COLUMNS, NAME_COLUMNS, STREET_COLUMNS, ORT_COLUMNS, WHITESPACE_COLUMNS,
  isValidAHVChecksum, parseDateDMY, calculateAge,
} from '@/lib/formatters';

// Re-export format functions for backward compatibility
export {
  formatSwissPhone, formatSwissPLZ, formatPostfach, formatAHV, convertExcelDate,
  formatDateDE, trimWhitespace, formatEmail, formatGender, formatName, formatStreet,
  formatIBAN, formatOrt,
};

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
  return detectPatternForColumns(
    index,
    PHONE_COLUMNS,
    'Telefonformat',
    formatSwissPhone,
    'phone_format',
    'formatSwissPhone',
    (count) => `${count} Telefonnummern können ins Schweizer Format konvertiert werden`
  );
}

function detectAHVPattern(index: ErrorIndex): PatternGroup[] {
  return detectPatternForColumns(
    index,
    AHV_COLUMNS,
    'AHV',
    formatAHV,
    'ahv_format',
    'formatAHV',
    (count) => `${count} AHV-Nummern können formatiert werden (756.XXXX.XXXX.XX)`
  );
}

function detectAHVChecksumPattern(index: ErrorIndex): PatternGroup[] {
  const groups: PatternGroup[] = [];
  
  for (const col of AHV_COLUMNS) {
    const columnErrors = index.byColumn.get(col);
    if (!columnErrors || columnErrors.length === 0) continue;
    
    const invalidRows: number[] = [];
    const invalidValues: string[] = [];
    
    for (const e of columnErrors) {
      // Only check already formatted AHV numbers for checksum
      if (/^756\.\d{4}\.\d{4}\.\d{2}$/.test(e.value) && !isValidAHVChecksum(e.value)) {
        invalidRows.push(e.row);
        invalidValues.push(e.value);
      }
    }
    
    if (invalidRows.length > 0) {
      groups.push({
        type: 'ahv_checksum',
        column: col,
        rows: invalidRows,
        values: invalidValues,
        fixFunction: 'manual',
        description: `${invalidRows.length} AHV-Nummern mit ungültiger Prüfziffer – Manuelle Prüfung erforderlich`,
        canAutoFix: false
      });
    }
  }
  
  return groups;
}

function detectDatePattern(index: ErrorIndex): PatternGroup[] {
  const groups: PatternGroup[] = [];
  
  for (const col of DATE_COLUMNS) {
    const columnErrors = index.byColumn.get(col);
    if (!columnErrors || columnErrors.length === 0) continue;
    
    const excelDateRows: number[] = [];
    const excelDateValues: string[] = [];
    
    for (let i = 0; i < columnErrors.length; i++) {
      const e = columnErrors[i];
      if (!e.message.includes('Datum')) continue;
      
      // Only treat as Excel serial if the value is purely numeric (no dots, dashes, slashes)
      const trimmed = e.value.trim();
      if (/[.\-\/]/.test(trimmed)) continue;
      
      const num = parseInt(trimmed);
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
  return detectPatternForColumns(
    index,
    EMAIL_COLUMNS,
    'E-Mail',
    formatEmail,
    'email_format',
    'formatEmail',
    (count) => `${count} E-Mail-Adressen können bereinigt werden (Tippfehler, Leerzeichen, Umlaute)`
  );
}

function detectPLZPattern(index: ErrorIndex): PatternGroup[] {
  return detectPatternForColumns(
    index,
    PLZ_COLUMNS,
    'PLZ',
    formatSwissPLZ,
    'plz_format',
    'formatSwissPLZ',
    (count) => `${count} Postleitzahlen können bereinigt werden`
  );
}

function detectGenderPattern(index: ErrorIndex): PatternGroup[] {
  return detectPatternForColumns(
    index,
    GENDER_COLUMNS,
    'Geschlecht',
    formatGender,
    'gender_format',
    'formatGender',
    (count) => `${count} Geschlechtsangaben können normalisiert werden (M/W/D)`
  );
}

// Detect DD-MM-YYYY, YYYY-MM-DD, or DD/MM/YYYY date format issues
function detectDateFormatPattern(index: ErrorIndex): PatternGroup[] {
  const groups: PatternGroup[] = [];

  for (const col of DATE_COLUMNS) {
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
        description: `${fixableRows.length} Datumsangaben im falschen Format (Bindestriche/Schrägstriche/ISO/2-stellige Jahreszahl) → DD.MM.YYYY`,
        canAutoFix: true,
      });
    }
  }

  return groups;
}

// Detect whitespace issues in ALL text columns
function detectWhitespacePattern(index: ErrorIndex): PatternGroup[] {
  const groups: PatternGroup[] = [];

  for (const col of WHITESPACE_COLUMNS) {
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

// Detect Ort (location) normalization patterns
function detectOrtPattern(index: ErrorIndex): PatternGroup[] {
  return detectPatternForColumns(
    index,
    ORT_COLUMNS,
    '', // match any error message for Ort columns
    formatOrt,
    'ort_format',
    'formatOrt',
    (count) => `${count} Ortsangaben können normalisiert werden (Gross-/Kleinschreibung)`
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

// Detect nationality auto-corrections (veraltete Bezeichnungen → offizielle)
function detectNationalityPattern(index: ErrorIndex): PatternGroup[] {
  const natColumns = ['S_Nationalitaet'];
  const groups: PatternGroup[] = [];

  for (const col of natColumns) {
    const columnErrors = index.byColumn.get(col);
    if (!columnErrors || columnErrors.length === 0) continue;

    const fixableRows: number[] = [];
    const fixableValues: string[] = [];

    for (const e of columnErrors) {
      if (e.correctedValue !== undefined) {
        fixableRows.push(e.row);
        fixableValues.push(e.value);
      }
    }

    if (fixableRows.length > 0) {
      groups.push({
        type: 'nationality_correction',
        column: col,
        rows: fixableRows,
        values: fixableValues,
        fixFunction: 'nationality_correction',
        description: `${fixableRows.length} Nationalität(en) mit veralteter Bezeichnung können korrigiert werden`,
        canAutoFix: true,
      });
    }
  }

  return groups;
}

// Detect BISTA language typos – errors that already have a correctedValue (typo-match)
function detectLanguagePattern(index: ErrorIndex): PatternGroup[] {
  const languageColumns = ['S_Muttersprache', 'S_Umgangssprache'];
  const groups: PatternGroup[] = [];

  for (const col of languageColumns) {
    // We need ALL errors for this column (including those with correctedValue already set)
    const allColErrors: ValidationError[] = [];
    for (const error of [...(index.byColumn.get(col) ?? []), ...index.uncorrected.filter(e => e.column === col && e.correctedValue !== undefined)]) {
      if (!allColErrors.includes(error)) allColErrors.push(error);
    }

    const fixableRows: number[] = [];
    const fixableValues: string[] = [];

    for (const e of allColErrors) {
      if (e.correctedValue !== undefined && e.message.includes('BISTA-Sprache')) {
        fixableRows.push(e.row);
        fixableValues.push(e.value);
      }
    }

    if (fixableRows.length > 0) {
      groups.push({
        type: 'language_bista',
        column: col,
        rows: fixableRows,
        values: fixableValues,
        fixFunction: 'language_bista',
        description: `${fixableRows.length} Sprachangabe(n) in "${col}" mit BISTA-Ähnlichkeits-Korrektur`,
        canAutoFix: true,
      });
    }
  }

  return groups;
}

// Detect age plausibility issues (students: 4-20, parents: >18)
function detectAgePlausibility(index: ErrorIndex, rows: ParsedRow[]): PatternGroup[] {
  const groups: PatternGroup[] = [];
  const implausibleRows: number[] = [];
  const implausibleValues: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const birthDateStr = String(rows[i]['S_Geburtsdatum'] ?? '').trim();
    if (!birthDateStr) continue;

    const birthDate = parseDateDMY(birthDateStr);
    if (!birthDate) continue;

    const age = calculateAge(birthDate);
    if (age < 4 || age > 20) {
      implausibleRows.push(i + 1); // 1-indexed
      implausibleValues.push(`${birthDateStr} (Alter: ${age})`);
    }
  }

  if (implausibleRows.length > 0) {
    groups.push({
      type: 'age_plausibility',
      column: 'S_Geburtsdatum',
      rows: implausibleRows,
      values: implausibleValues,
      fixFunction: 'manual',
      description: `${implausibleRows.length} Schüler/innen mit unplausiblem Alter (< 4 oder > 20 Jahre) – Manuelle Prüfung`,
      canAutoFix: false,
    });
  }

  return groups;
}

// ============================================
// Main Analysis Function - Optimized
// ============================================

export function analyzeErrorsLocally(
  errors: ValidationError[],
  rows: ParsedRow[]
): LocalSuggestion[] {
  const suggestions: LocalSuggestion[] = [];
  
  // Build index once for O(1) column lookups
  const index = buildErrorIndex(errors);
  
  if (index.uncorrected.length === 0 && rows.length === 0) {
    return suggestions;
  }
  
  // Run all pattern detectors with indexed data
  const patternGroups: PatternGroup[] = [
    ...detectPhonePattern(index),
    ...detectAHVPattern(index),
    ...detectAHVChecksumPattern(index),
    ...detectDatePattern(index),
    ...detectDateFormatPattern(index),
    ...detectWhitespacePattern(index),
    ...detectEmailPattern(index),
    ...detectPLZPattern(index),
    ...detectGenderPattern(index),
    ...detectOrtPattern(index),
    ...detectLanguagePattern(index),
    ...detectNationalityPattern(index),
    ...detectDuplicateGroups(index),
    ...detectParentIdInconsistencies(index),
    ...detectAgePlausibility(index, rows),
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
    } else if (suggestion.fixFunction === 'language_bista' || suggestion.fixFunction === 'nationality_correction') {
      correctedValue = error.correctedValue ?? null;
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
