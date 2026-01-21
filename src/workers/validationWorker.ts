// Web Worker für Datenvalidierung und -verarbeitung
// Läuft im Hintergrund ohne UI-Blockierung

import type { ValidationError, ImportRow, ColumnDefinition, FormatRule, BusinessRule } from '../types/importTypes';

interface WorkerMessage {
  type: 'validate' | 'analyze' | 'apply-correction';
  payload: unknown;
}

interface ValidatePayload {
  data: ImportRow[];
  columns: ColumnDefinition[];
  formatRules: FormatRule[];
  businessRules: BusinessRule[];
}

interface AnalyzePayload {
  errors: ValidationError[];
  data: ImportRow[];
}

interface ApplyCorrectionPayload {
  data: ImportRow[];
  correctionType: string;
  targetRows: number[];
  newValue?: string;
}

// Format patterns for Swiss data
const SWISS_PATTERNS = {
  ahv: /^756\.\d{4}\.\d{4}\.\d{2}$/,
  ahvDigits: /^756\d{10}$/,
  phoneMobile: /^\+41\s?7[5-9]\s?\d{3}\s?\d{2}\s?\d{2}$/,
  phoneFixed: /^\+41\s?[1-6]\d\s?\d{3}\s?\d{2}\s?\d{2}$/,
  plz: /^\d{4}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

// Format AHV number
function formatAHV(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('756')) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 7)}.${digits.slice(7, 11)}.${digits.slice(11, 13)}`;
  }
  return null;
}

// Format phone number
function formatPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  
  // Handle different input formats
  let normalizedDigits = digits;
  if (digits.startsWith('41') && digits.length === 11) {
    normalizedDigits = digits;
  } else if (digits.startsWith('0') && digits.length === 10) {
    normalizedDigits = '41' + digits.slice(1);
  } else if (digits.length === 9 && !digits.startsWith('0')) {
    normalizedDigits = '41' + digits;
  }
  
  if (normalizedDigits.length !== 11 || !normalizedDigits.startsWith('41')) {
    return null;
  }
  
  const areaCode = normalizedDigits.slice(2, 4);
  const isMobile = ['75', '76', '77', '78', '79'].includes(areaCode);
  
  if (isMobile) {
    return `+41 ${areaCode} ${normalizedDigits.slice(4, 7)} ${normalizedDigits.slice(7, 9)} ${normalizedDigits.slice(9, 11)}`;
  } else {
    return `+41 ${areaCode} ${normalizedDigits.slice(4, 7)} ${normalizedDigits.slice(7, 9)} ${normalizedDigits.slice(9, 11)}`;
  }
}

// Format PLZ
function formatPLZ(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 4) {
    return digits;
  }
  return null;
}

// Format email
function formatEmail(value: string): string | null {
  const cleaned = value.toLowerCase().trim().replace(/\s+/g, '');
  if (SWISS_PATTERNS.email.test(cleaned)) {
    return cleaned;
  }
  return null;
}

// Build error index for O(1) lookups
function buildErrorIndex(errors: ValidationError[]): Map<string, ValidationError[]> {
  const index = new Map<string, ValidationError[]>();
  
  for (const error of errors) {
    const key = `${error.column}:${error.type}`;
    if (!index.has(key)) {
      index.set(key, []);
    }
    index.get(key)!.push(error);
  }
  
  return index;
}

// Analyze errors and suggest local corrections
function analyzeErrors(errors: ValidationError[], data: ImportRow[]): {
  patterns: Array<{
    type: string;
    column: string;
    count: number;
    description: string;
    canAutoFix: boolean;
    affectedRows: number[];
    suggestedAction?: string;
  }>;
} {
  const errorIndex = buildErrorIndex(errors);
  const patterns: Array<{
    type: string;
    column: string;
    count: number;
    description: string;
    canAutoFix: boolean;
    affectedRows: number[];
    suggestedAction?: string;
  }> = [];
  
  // Group errors by type and column
  const groupedErrors = new Map<string, ValidationError[]>();
  
  for (const error of errors) {
    const key = `${error.type}:${error.column}`;
    if (!groupedErrors.has(key)) {
      groupedErrors.set(key, []);
    }
    groupedErrors.get(key)!.push(error);
  }
  
  // Analyze each group
  for (const [key, groupErrors] of groupedErrors) {
    const [type, column] = key.split(':');
    const affectedRows = [...new Set(groupErrors.map(e => e.row))];
    
    // Check for AHV format issues
    if (column.toLowerCase().includes('ahv') || type === 'format') {
      const ahvErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        if (typeof value !== 'string') return false;
        const digits = value.replace(/\D/g, '');
        return digits.length === 13 && digits.startsWith('756');
      });
      
      if (ahvErrors.length > 0) {
        patterns.push({
          type: 'ahv_format',
          column,
          count: ahvErrors.length,
          description: `${ahvErrors.length} AHV-Nummern können automatisch formatiert werden (756.XXXX.XXXX.XX)`,
          canAutoFix: true,
          affectedRows: ahvErrors.map(e => e.row),
          suggestedAction: 'Format: 756.XXXX.XXXX.XX',
        });
      }
    }
    
    // Check for phone format issues
    if (column.toLowerCase().includes('telefon') || column.toLowerCase().includes('phone') || column.toLowerCase().includes('mobile')) {
      const phoneErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        if (typeof value !== 'string') return false;
        const digits = value.replace(/\D/g, '');
        return (digits.length >= 9 && digits.length <= 11);
      });
      
      if (phoneErrors.length > 0) {
        patterns.push({
          type: 'phone_format',
          column,
          count: phoneErrors.length,
          description: `${phoneErrors.length} Telefonnummern können automatisch formatiert werden (+41 XX XXX XX XX)`,
          canAutoFix: true,
          affectedRows: phoneErrors.map(e => e.row),
          suggestedAction: 'Format: +41 XX XXX XX XX',
        });
      }
    }
    
    // Check for email issues
    if (column.toLowerCase().includes('email') || column.toLowerCase().includes('mail')) {
      const emailErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        if (typeof value !== 'string') return false;
        const cleaned = value.toLowerCase().trim().replace(/\s+/g, '');
        return SWISS_PATTERNS.email.test(cleaned);
      });
      
      if (emailErrors.length > 0) {
        patterns.push({
          type: 'email_format',
          column,
          count: emailErrors.length,
          description: `${emailErrors.length} E-Mail-Adressen können normalisiert werden (Kleinschreibung, keine Leerzeichen)`,
          canAutoFix: true,
          affectedRows: emailErrors.map(e => e.row),
          suggestedAction: 'Normalisieren',
        });
      }
    }
    
    // Check for PLZ issues
    if (column.toLowerCase().includes('plz') || column.toLowerCase().includes('postleitzahl')) {
      const plzErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        if (typeof value !== 'string' && typeof value !== 'number') return false;
        const digits = String(value).replace(/\D/g, '');
        return digits.length === 4;
      });
      
      if (plzErrors.length > 0) {
        patterns.push({
          type: 'plz_format',
          column,
          count: plzErrors.length,
          description: `${plzErrors.length} PLZ können formatiert werden (4 Ziffern)`,
          canAutoFix: true,
          affectedRows: plzErrors.map(e => e.row),
          suggestedAction: 'Format: XXXX',
        });
      }
    }
    
    // Generic format errors that can't be auto-fixed
    if (!patterns.some(p => p.column === column)) {
      patterns.push({
        type: 'manual_review',
        column,
        count: groupErrors.length,
        description: `${groupErrors.length} Einträge in "${column}" erfordern manuelle Überprüfung`,
        canAutoFix: false,
        affectedRows,
      });
    }
  }
  
  return { patterns };
}

// Apply correction to data
function applyCorrection(
  data: ImportRow[],
  correctionType: string,
  targetRows: number[],
  column: string
): ImportRow[] {
  const updatedData = [...data];
  const targetSet = new Set(targetRows);
  
  for (let i = 0; i < updatedData.length; i++) {
    if (!targetSet.has(i)) continue;
    
    const row = { ...updatedData[i] };
    const value = row[column];
    
    if (value === undefined || value === null) continue;
    
    let newValue: string | null = null;
    
    switch (correctionType) {
      case 'ahv_format':
        newValue = formatAHV(String(value));
        break;
      case 'phone_format':
        newValue = formatPhone(String(value));
        break;
      case 'email_format':
        newValue = formatEmail(String(value));
        break;
      case 'plz_format':
        newValue = formatPLZ(String(value));
        break;
    }
    
    if (newValue !== null) {
      row[column] = newValue;
      updatedData[i] = row;
    }
  }
  
  return updatedData;
}

// Validate a single field
function validateField(
  value: unknown,
  column: ColumnDefinition,
  formatRules: FormatRule[]
): string | null {
  const stringValue = value === null || value === undefined ? '' : String(value);
  
  // Check required
  if (column.required && stringValue.trim() === '') {
    return `${column.name} ist erforderlich`;
  }
  
  if (stringValue.trim() === '') return null;
  
  // Check format rules
  for (const rule of formatRules) {
    if (!rule.is_active) continue;
    if (rule.applies_to_columns && !rule.applies_to_columns.includes(column.name)) continue;
    
    try {
      const regex = new RegExp(rule.pattern);
      if (!regex.test(stringValue)) {
        return rule.error_message;
      }
    } catch {
      // Invalid regex, skip
    }
  }
  
  return null;
}

// Full validation pass
function validateData(
  data: ImportRow[],
  columns: ColumnDefinition[],
  formatRules: FormatRule[],
  businessRules: BusinessRule[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const columnMap = new Map(columns.map(c => [c.name, c]));
  
  // Field validation
  for (let rowIndex = 0; rowIndex < data.length; rowIndex++) {
    const row = data[rowIndex];
    
    for (const [columnName, value] of Object.entries(row)) {
      const column = columnMap.get(columnName);
      if (!column) continue;
      
      const error = validateField(value, column, formatRules);
      if (error) {
        errors.push({
          row: rowIndex,
          column: columnName,
          value: value === null || value === undefined ? '' : String(value),
          message: error,
          type: 'format',
          severity: 'error',
        });
      }
    }
  }
  
  // Duplicate check
  const seen = new Map<string, number>();
  const idColumn = columns.find(c => c.name.toLowerCase().includes('id') || c.name.toLowerCase() === 'id');
  
  if (idColumn) {
    for (let i = 0; i < data.length; i++) {
      const value = data[i][idColumn.name];
      if (value === undefined || value === null || String(value).trim() === '') continue;
      
      const key = String(value);
      if (seen.has(key)) {
        errors.push({
          row: i,
          column: idColumn.name,
          value: key,
          message: `Duplikat gefunden (erste Zeile: ${seen.get(key)! + 1})`,
          type: 'duplicate',
          severity: 'warning',
        });
      } else {
        seen.set(key, i);
      }
    }
  }
  
  return errors;
}

// Message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload } = event.data;
  
  try {
    switch (type) {
      case 'validate': {
        const { data, columns, formatRules, businessRules } = payload as ValidatePayload;
        const errors = validateData(data, columns, formatRules, businessRules);
        self.postMessage({ type: 'validate-result', payload: { errors } });
        break;
      }
      
      case 'analyze': {
        const { errors, data } = payload as AnalyzePayload;
        const result = analyzeErrors(errors, data);
        self.postMessage({ type: 'analyze-result', payload: result });
        break;
      }
      
      case 'apply-correction': {
        const { data, correctionType, targetRows, newValue } = payload as ApplyCorrectionPayload & { column: string };
        const column = (payload as { column: string }).column;
        const updatedData = applyCorrection(data, correctionType, targetRows, column);
        self.postMessage({ type: 'correction-result', payload: { data: updatedData } });
        break;
      }
      
      default:
        self.postMessage({ type: 'error', payload: { message: `Unknown message type: ${type}` } });
    }
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      payload: { message: error instanceof Error ? error.message : 'Unknown error' } 
    });
  }
};
