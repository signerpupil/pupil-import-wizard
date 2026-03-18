// Web Worker für Datenvalidierung und -verarbeitung
// Läuft im Hintergrund ohne UI-Blockierung

import type { ValidationError, ImportRow, ColumnDefinition, FormatRule, BusinessRule } from '../types/importTypes';
import {
  formatAHV, formatSwissPhone, formatSwissPLZ, formatEmail, formatGender,
  formatName, formatStreet, formatOrt, formatIBAN, convertExcelDate, formatDateDE,
  trimWhitespace, SWISS_PATTERNS,
} from '../lib/formatters';

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
    const colLower = column.toLowerCase();
    
    // Check for AHV format issues
    if (colLower.includes('ahv')) {
      const ahvErrors = groupErrors.filter(e => {
        const value = e.value;
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
        continue;
      }
    }
    
    // Check for phone format issues
    if (colLower.includes('tel') || colLower.includes('phone') || colLower.includes('mobil') || colLower.includes('fax')) {
      const phoneErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        if (typeof value !== 'string') return false;
        const digits = value.replace(/\D/g, '');
        return (digits.length >= 9 && digits.length <= 13);
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
        continue;
      }
    }
    
    // Check for email issues - enhanced detection
    if (colLower.includes('email') || colLower.includes('mail') || colLower.includes('e-mail')) {
      const emailErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        if (typeof value !== 'string') return false;
        return value.includes('@') || value.includes('.com') || value.includes('.ch');
      });
      
      if (emailErrors.length > 0) {
        patterns.push({
          type: 'email_format',
          column,
          count: emailErrors.length,
          description: `${emailErrors.length} E-Mail-Adressen können bereinigt werden (Tippfehler, Leerzeichen, Umlaute)`,
          canAutoFix: true,
          affectedRows: emailErrors.map(e => e.row),
          suggestedAction: 'Normalisieren & Tippfehler korrigieren',
        });
        continue;
      }
    }
    
    // Check for PLZ issues
    if (colLower.includes('plz') || colLower.includes('postleitzahl') || colLower === 'zip') {
      const plzErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        if (typeof value !== 'string' && typeof value !== 'number') return false;
        const digits = String(value).replace(/\D/g, '');
        return digits.length === 4 || digits.length === 5;
      });
      
      if (plzErrors.length > 0) {
        patterns.push({
          type: 'plz_format',
          column,
          count: plzErrors.length,
          description: `${plzErrors.length} PLZ können formatiert werden (4-5 Ziffern)`,
          canAutoFix: true,
          affectedRows: plzErrors.map(e => e.row),
          suggestedAction: 'Format: XXXX',
        });
        continue;
      }
    }
    
    // Check for gender issues
    if (colLower.includes('geschlecht') || colLower.includes('geschl') || colLower.includes('gender') || colLower === 'sex') {
      const genderErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        if (typeof value !== 'string') return false;
        return formatGender(value) !== null;
      });
      
      if (genderErrors.length > 0) {
        patterns.push({
          type: 'gender_format',
          column,
          count: genderErrors.length,
          description: `${genderErrors.length} Geschlechtsangaben können normalisiert werden (M/W/D)`,
          canAutoFix: true,
          affectedRows: genderErrors.map(e => e.row),
          suggestedAction: 'Normalisieren zu M/W/D',
        });
        continue;
      }
    }
    
    // Check for name capitalization issues
    if (colLower.includes('name') || colLower.includes('vorname') || colLower.includes('nachname')) {
      const nameErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        if (typeof value !== 'string') return false;
        return formatName(value) !== null;
      });
      
      if (nameErrors.length > 0) {
        patterns.push({
          type: 'name_format',
          column,
          count: nameErrors.length,
          description: `${nameErrors.length} Namen können korrekt kapitalisiert werden`,
          canAutoFix: true,
          affectedRows: nameErrors.map(e => e.row),
          suggestedAction: 'Grossschreibung korrigieren',
        });
        continue;
      }
    }
    
    // Check for street/address issues
    if (colLower.includes('strasse') || colLower.includes('street') || colLower.includes('adresse') || colLower.includes('address')) {
      const streetErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        if (typeof value !== 'string') return false;
        return formatStreet(value) !== null;
      });
      
      if (streetErrors.length > 0) {
        patterns.push({
          type: 'street_format',
          column,
          count: streetErrors.length,
          description: `${streetErrors.length} Adressen können korrekt formatiert werden`,
          canAutoFix: true,
          affectedRows: streetErrors.map(e => e.row),
          suggestedAction: 'Strassen-Format korrigieren',
        });
        continue;
      }
    }

    // Check for Ort/location issues
    if (colLower === 'ort' || colLower.endsWith('_ort')) {
      const ortErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        if (typeof value !== 'string') return false;
        return formatOrt(value) !== null;
      });

      if (ortErrors.length > 0) {
        patterns.push({
          type: 'ort_format',
          column,
          count: ortErrors.length,
          description: `${ortErrors.length} Ortsangaben können normalisiert werden (Gross-/Kleinschreibung)`,
          canAutoFix: true,
          affectedRows: ortErrors.map(e => e.row),
          suggestedAction: 'Ort normalisieren',
        });
        continue;
      }
    }
    
    // Check for IBAN issues
    if (colLower.includes('iban') || colLower.includes('konto')) {
      const ibanErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        if (typeof value !== 'string') return false;
        return formatIBAN(value) !== null;
      });
      
      if (ibanErrors.length > 0) {
        patterns.push({
          type: 'iban_format',
          column,
          count: ibanErrors.length,
          description: `${ibanErrors.length} IBAN können formatiert werden`,
          canAutoFix: true,
          affectedRows: ibanErrors.map(e => e.row),
          suggestedAction: 'Format: CHXX XXXX XXXX XXXX XXXX X',
        });
        continue;
      }
    }
    
    // Check for Excel date serial numbers AND date format variants
    if (colLower.includes('datum') || colLower.includes('date') || colLower.includes('geburt')) {
      const excelDateErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        const strVal = String(value).trim();
        // Only treat as Excel serial if purely numeric (no dots, dashes, slashes)
        if (/[.\-\/]/.test(strVal)) return false;
        const num = parseInt(strVal);
        return !isNaN(num) && num > 1000 && num < 100000;
      });
      
      if (excelDateErrors.length > 0) {
        patterns.push({
          type: 'date_format',
          column,
          count: excelDateErrors.length,
          description: `${excelDateErrors.length} Excel-Seriennummern können in Datum konvertiert werden`,
          canAutoFix: true,
          affectedRows: excelDateErrors.map(e => e.row),
          suggestedAction: 'Format: DD.MM.YYYY',
        });
      }

      // DD-MM-YYYY, YYYY-MM-DD, DD/MM/YYYY, DD.MM.YY variants
      const excelRowSet = new Set(excelDateErrors.map(e => e.row));
      const dateFormatErrors = groupErrors.filter(e => {
        if (excelRowSet.has(e.row)) return false;
        const value = data[e.row]?.[e.column];
        if (typeof value !== 'string') return false;
        return formatDateDE(value) !== null;
      });

      if (dateFormatErrors.length > 0) {
        patterns.push({
          type: 'date_de_format',
          column,
          count: dateFormatErrors.length,
          description: `${dateFormatErrors.length} Datumsangaben im falschen Format → DD.MM.YYYY`,
          canAutoFix: true,
          affectedRows: dateFormatErrors.map(e => e.row),
          suggestedAction: 'Format: DD.MM.YYYY',
        });
      }

      if (excelDateErrors.length > 0 || dateFormatErrors.length > 0) {
        continue;
      }
    }

    // Check for whitespace issues in text columns
    if (colLower.includes('name') || colLower.includes('strasse') || colLower.includes('ort') || 
        colLower.includes('vorname') || colLower.includes('heimatort') || colLower.includes('konfession') ||
        colLower.includes('schulhaus')) {
      const wsErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        if (typeof value !== 'string') return false;
        return trimWhitespace(value) !== null;
      });

      if (wsErrors.length > 0) {
        patterns.push({
          type: 'whitespace_trim',
          column,
          count: wsErrors.length,
          description: `${wsErrors.length} Einträge in "${column}" haben führende/nachfolgende Leerzeichen oder Doppelleerzeichen`,
          canAutoFix: true,
          affectedRows: wsErrors.map(e => e.row),
          suggestedAction: 'Leerzeichen bereinigen',
        });
        continue;
      }
    }
    
    // Check for ID conflicts (different persons with same ID)
    if (type === 'id_conflict') {
      patterns.push({
        type: 'id_conflict',
        column,
        count: groupErrors.length,
        description: `${groupErrors.length} ID-Konflikt(e) in "${column}" - Verschiedene Personen mit gleicher ID`,
        canAutoFix: false,
        affectedRows,
        suggestedAction: 'IDs müssen manuell korrigiert werden',
      });
      continue;
    }

    // Check for duplicates
    if (type === 'duplicate') {
      patterns.push({
        type: 'duplicate',
        column,
        count: groupErrors.length,
        description: `${groupErrors.length} Duplikate in "${column}" - Manuelle Prüfung erforderlich`,
        canAutoFix: false,
        affectedRows,
        suggestedAction: 'Manuell prüfen und entscheiden',
      });
      continue;
    }
    
    // Generic format errors that can't be auto-fixed
    if (!patterns.some(p => p.column === column && p.type !== 'manual_review')) {
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
  
  // Use the shared getFixFunction from formatters
  const fixFnMap: Record<string, (value: string) => string | null> = {
    'ahv_format': formatAHV,
    'phone_format': formatSwissPhone,
    'email_format': formatEmail,
    'plz_format': formatSwissPLZ,
    'gender_format': formatGender,
    'name_format': formatName,
    'street_format': formatStreet,
    'ort_format': formatOrt,
    'iban_format': formatIBAN,
    'date_format': convertExcelDate,
    'date_de_format': formatDateDE,
    'whitespace_trim': trimWhitespace,
  };
  
  const fixFn = fixFnMap[correctionType];
  
  for (let i = 0; i < updatedData.length; i++) {
    if (!targetSet.has(i)) continue;
    
    const row = { ...updatedData[i] };
    const value = row[column];
    
    if (value === undefined || value === null) continue;
    
    const newValue = fixFn ? fixFn(String(value)) : null;
    
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
