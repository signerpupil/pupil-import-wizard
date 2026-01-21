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
  const maleValues = ['MÄNNLICH', 'MALE', 'MANN', 'M', 'MAENNLICH'];
  const femaleValues = ['WEIBLICH', 'FEMALE', 'FRAU', 'W', 'F'];
  const diverseValues = ['DIVERS', 'DIVERSE', 'D', 'X', 'ANDERES'];
  
  if (maleValues.includes(normalized)) return 'M';
  if (femaleValues.includes(normalized)) return 'W';
  if (diverseValues.includes(normalized)) return 'D';
  
  return null;
}

// ============================================
// Pattern Detection Functions
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

function detectPhonePattern(errors: ValidationError[]): PatternGroup[] {
  const groups: PatternGroup[] = [];
  const phoneColumns = ['P_ERZ1_Tel', 'P_ERZ2_Tel', 'P_ERZ1_Mobile', 'P_ERZ2_Mobile', 'S_Tel', 'S_Mobile'];
  
  phoneColumns.forEach(col => {
    const columnErrors = errors.filter(e => 
      e.column === col && 
      !e.correctedValue &&
      (e.message.includes('Telefonformat') || e.message.includes('phone'))
    );
    
    if (columnErrors.length > 0) {
      // Check if values can be auto-fixed
      const fixableErrors = columnErrors.filter(e => formatSwissPhone(e.value) !== null);
      
      if (fixableErrors.length > 0) {
        groups.push({
          type: 'phone_format',
          column: col,
          rows: fixableErrors.map(e => e.row),
          values: fixableErrors.map(e => e.value),
          fixFunction: 'formatSwissPhone',
          description: `${fixableErrors.length} Telefonnummern können ins Schweizer Format konvertiert werden`,
          canAutoFix: true
        });
      }
    }
  });
  
  return groups;
}

function detectAHVPattern(errors: ValidationError[]): PatternGroup[] {
  const groups: PatternGroup[] = [];
  const ahvColumns = ['S_AHV', 'P_ERZ1_AHV', 'P_ERZ2_AHV', 'L_KL1_AHV'];
  
  ahvColumns.forEach(col => {
    const columnErrors = errors.filter(e => 
      e.column === col && 
      !e.correctedValue &&
      e.message.includes('AHV')
    );
    
    if (columnErrors.length > 0) {
      const fixableErrors = columnErrors.filter(e => formatAHV(e.value) !== null);
      
      if (fixableErrors.length > 0) {
        groups.push({
          type: 'ahv_format',
          column: col,
          rows: fixableErrors.map(e => e.row),
          values: fixableErrors.map(e => e.value),
          fixFunction: 'formatAHV',
          description: `${fixableErrors.length} AHV-Nummern können formatiert werden (756.XXXX.XXXX.XX)`,
          canAutoFix: true
        });
      }
    }
  });
  
  return groups;
}

function detectDatePattern(errors: ValidationError[]): PatternGroup[] {
  const groups: PatternGroup[] = [];
  const dateColumns = ['S_Geburtsdatum', 'P_ERZ1_Geburtsdatum', 'P_ERZ2_Geburtsdatum', 'Datum'];
  
  dateColumns.forEach(col => {
    const columnErrors = errors.filter(e => 
      e.column.includes(col) && 
      !e.correctedValue &&
      e.message.includes('Datum')
    );
    
    if (columnErrors.length > 0) {
      // Check for Excel serial numbers
      const excelDates = columnErrors.filter(e => {
        const num = parseInt(e.value);
        return !isNaN(num) && num > 1 && num < 100000;
      });
      
      if (excelDates.length > 0) {
        groups.push({
          type: 'excel_date',
          column: col,
          rows: excelDates.map(e => e.row),
          values: excelDates.map(e => e.value),
          fixFunction: 'convertExcelDate',
          description: `${excelDates.length} Excel-Seriennummern können in Datumsformat konvertiert werden`,
          canAutoFix: true
        });
      }
    }
  });
  
  return groups;
}

function detectEmailPattern(errors: ValidationError[]): PatternGroup[] {
  const groups: PatternGroup[] = [];
  const emailColumns = ['S_Email', 'P_ERZ1_Email', 'P_ERZ2_Email', 'P_Email'];
  
  emailColumns.forEach(col => {
    const columnErrors = errors.filter(e => 
      e.column === col && 
      !e.correctedValue &&
      e.message.includes('E-Mail')
    );
    
    if (columnErrors.length > 0) {
      const fixableErrors = columnErrors.filter(e => formatEmail(e.value) !== null);
      
      if (fixableErrors.length > 0) {
        groups.push({
          type: 'email_format',
          column: col,
          rows: fixableErrors.map(e => e.row),
          values: fixableErrors.map(e => e.value),
          fixFunction: 'formatEmail',
          description: `${fixableErrors.length} E-Mail-Adressen können bereinigt werden (Leerzeichen, Umlaute)`,
          canAutoFix: true
        });
      }
    }
  });
  
  return groups;
}

function detectPLZPattern(errors: ValidationError[]): PatternGroup[] {
  const groups: PatternGroup[] = [];
  const plzColumns = ['S_PLZ', 'P_ERZ1_PLZ', 'P_ERZ2_PLZ'];
  
  plzColumns.forEach(col => {
    const columnErrors = errors.filter(e => 
      e.column === col && 
      !e.correctedValue &&
      e.message.includes('PLZ')
    );
    
    if (columnErrors.length > 0) {
      const fixableErrors = columnErrors.filter(e => formatSwissPLZ(e.value) !== null);
      
      if (fixableErrors.length > 0) {
        groups.push({
          type: 'plz_format',
          column: col,
          rows: fixableErrors.map(e => e.row),
          values: fixableErrors.map(e => e.value),
          fixFunction: 'formatSwissPLZ',
          description: `${fixableErrors.length} Postleitzahlen können bereinigt werden`,
          canAutoFix: true
        });
      }
    }
  });
  
  return groups;
}

function detectGenderPattern(errors: ValidationError[]): PatternGroup[] {
  const groups: PatternGroup[] = [];
  const genderColumns = ['S_Geschlecht'];
  
  genderColumns.forEach(col => {
    const columnErrors = errors.filter(e => 
      e.column === col && 
      !e.correctedValue &&
      e.message.includes('Geschlecht')
    );
    
    if (columnErrors.length > 0) {
      const fixableErrors = columnErrors.filter(e => formatGender(e.value) !== null);
      
      if (fixableErrors.length > 0) {
        groups.push({
          type: 'gender_format',
          column: col,
          rows: fixableErrors.map(e => e.row),
          values: fixableErrors.map(e => e.value),
          fixFunction: 'formatGender',
          description: `${fixableErrors.length} Geschlechtsangaben können normalisiert werden (M/W/D)`,
          canAutoFix: true
        });
      }
    }
  });
  
  return groups;
}

function detectDuplicateGroups(errors: ValidationError[], rows: ParsedRow[]): PatternGroup[] {
  const groups: PatternGroup[] = [];
  
  const duplicateErrors = errors.filter(e => 
    !e.correctedValue && 
    e.message.includes('Duplikat:')
  );
  
  // Group by column
  const byColumn = new Map<string, ValidationError[]>();
  duplicateErrors.forEach(e => {
    const existing = byColumn.get(e.column) || [];
    existing.push(e);
    byColumn.set(e.column, existing);
  });
  
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

function detectParentIdInconsistencies(errors: ValidationError[], rows: ParsedRow[]): PatternGroup[] {
  const groups: PatternGroup[] = [];
  
  const inconsistentErrors = errors.filter(e => 
    !e.correctedValue && 
    e.message.includes('Inkonsistente ID:')
  );
  
  // Group by parent ID column
  const byColumn = new Map<string, ValidationError[]>();
  inconsistentErrors.forEach(e => {
    const existing = byColumn.get(e.column) || [];
    existing.push(e);
    byColumn.set(e.column, existing);
  });
  
  byColumn.forEach((columnErrors, column) => {
    if (columnErrors.length > 0) {
      // Extract the first ID from the first error message for potential consolidation
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

// ============================================
// Main Analysis Function
// ============================================

export function analyzeErrorsLocally(
  errors: ValidationError[],
  rows: ParsedRow[]
): LocalSuggestion[] {
  const suggestions: LocalSuggestion[] = [];
  const uncorrectedErrors = errors.filter(e => !e.correctedValue);
  
  if (uncorrectedErrors.length === 0) {
    return suggestions;
  }
  
  // Run all pattern detectors
  const patternGroups: PatternGroup[] = [
    ...detectPhonePattern(uncorrectedErrors),
    ...detectAHVPattern(uncorrectedErrors),
    ...detectDatePattern(uncorrectedErrors),
    ...detectEmailPattern(uncorrectedErrors),
    ...detectPLZPattern(uncorrectedErrors),
    ...detectGenderPattern(uncorrectedErrors),
    ...detectDuplicateGroups(uncorrectedErrors, rows),
    ...detectParentIdInconsistencies(uncorrectedErrors, rows),
  ];
  
  // Convert pattern groups to suggestions
  patternGroups.forEach(group => {
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
  });
  
  return suggestions;
}

// ============================================
// Apply Corrections Function
// ============================================

export function applyLocalCorrection(
  suggestion: LocalSuggestion,
  errors: ValidationError[]
): { row: number; column: string; value: string }[] {
  const corrections: { row: number; column: string; value: string }[] = [];
  
  suggestion.affectedRows.forEach(rowNum => {
    const error = errors.find(e => e.row === rowNum && e.column === suggestion.affectedColumn);
    
    if (!error || !error.value) return;
    
    let correctedValue: string | null = null;
    
    switch (suggestion.fixFunction) {
      case 'formatSwissPhone':
        correctedValue = formatSwissPhone(error.value);
        break;
      case 'formatAHV':
        correctedValue = formatAHV(error.value);
        break;
      case 'convertExcelDate':
        correctedValue = convertExcelDate(error.value);
        break;
      case 'formatEmail':
        correctedValue = formatEmail(error.value);
        break;
      case 'formatSwissPLZ':
        correctedValue = formatSwissPLZ(error.value);
        break;
      case 'formatGender':
        correctedValue = formatGender(error.value);
        break;
      case 'consolidateId':
        // For ID consolidation, extract the target ID from the error message
        const idMatch = error.message.match(/die ID '([^']+)'/);
        if (idMatch) {
          correctedValue = idMatch[1];
        }
        break;
    }
    
    if (correctedValue) {
      corrections.push({
        row: rowNum,
        column: suggestion.affectedColumn,
        value: correctedValue,
      });
    }
  });
  
  return corrections;
}
