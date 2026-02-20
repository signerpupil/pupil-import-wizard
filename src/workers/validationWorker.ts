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
  iban: /^CH\d{2}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{1}$/i,
  date: /^\d{1,2}\.\d{1,2}\.\d{4}$/,
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
  return `+41 ${areaCode} ${normalizedDigits.slice(4, 7)} ${normalizedDigits.slice(7, 9)} ${normalizedDigits.slice(9, 11)}`;
}

// Format PLZ
function formatPLZ(value: string): string | null {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 4) {
    return digits;
  }
  return null;
}

// Format email - comprehensive cleanup
function formatEmail(value: string): string | null {
  let cleaned = value.toLowerCase().trim();
  // Remove extra spaces
  cleaned = cleaned.replace(/\s+/g, '');
  // Remove accents
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
  cleaned = cleaned.replace(/@outllok\./, '@outlook.');
  cleaned = cleaned.replace(/@outlok\./, '@outlook.');
  
  if (SWISS_PATTERNS.email.test(cleaned)) {
    return cleaned;
  }
  return null;
}

// Format gender
function formatGender(value: string): string | null {
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
function formatName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  
  // Check if it needs formatting (all caps, all lower, or mixed weird)
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

// Format street address - capitalize and fix abbreviations
function formatStreet(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  
  // Check if needs formatting
  const isAllCaps = trimmed === trimmed.toUpperCase() && trimmed !== trimmed.toLowerCase();
  const isAllLower = trimmed === trimmed.toLowerCase() && trimmed !== trimmed.toUpperCase();
  
  if (!isAllCaps && !isAllLower) return null;
  
  // Fix common abbreviations
  let formatted = trimmed.toLowerCase();
  formatted = formatted.replace(/^str\.?\s*/i, 'Strasse ');
  formatted = formatted.replace(/\bstr\.?$/i, 'strasse');
  formatted = formatted.replace(/\bweg\.?$/i, 'weg');
  formatted = formatted.replace(/\bpl\.?$/i, 'platz');
  
  // Capitalize each word
  return formatted
    .split(/(\s+)/g)
    .map(part => {
      if (/^\s+$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join('');
}

// Format IBAN
function formatIBAN(value: string): string | null {
  const cleaned = value.replace(/\s/g, '').toUpperCase();
  if (cleaned.startsWith('CH') && cleaned.length === 21) {
    return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8, 12)} ${cleaned.slice(12, 16)} ${cleaned.slice(16, 20)} ${cleaned.slice(20)}`;
  }
  return null;
}

// Convert Excel serial date to Swiss format
function formatExcelDate(value: string): string | null {
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
function formatDateDE(value: string): string | null {
  const dashMatch = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) return `${dashMatch[1].padStart(2, '0')}.${dashMatch[2].padStart(2, '0')}.${dashMatch[3]}`;
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
  return null;
}

// Trim leading/trailing whitespace and normalize multiple spaces
function trimWhitespace(value: string): string | null {
  const trimmed = value.trim().replace(/\s{2,}/g, ' ');
  return trimmed !== value ? trimmed : null;
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
    const colLower = column.toLowerCase();
    
    // Check for AHV format issues
    if (colLower.includes('ahv')) {
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
        continue;
      }
    }
    
    // Check for phone format issues
    if (colLower.includes('tel') || colLower.includes('phone') || colLower.includes('mobile') || colLower.includes('fax')) {
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
        // Check if it can be fixed (has @ and ., even if malformed)
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
        continue;
      }
    }
    
    // Check for gender issues
    if (colLower.includes('geschlecht') || colLower.includes('gender') || colLower === 'sex') {
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
    
    // Check for Excel date serial numbers AND date format variants (DD-MM-YYYY, ISO)
    if (colLower.includes('datum') || colLower.includes('date') || colLower.includes('geburt')) {
      const excelDateErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        const strVal = String(value);
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
        continue;
      }

      // DD-MM-YYYY or YYYY-MM-DD variants
      const dateFormatErrors = groupErrors.filter(e => {
        const value = data[e.row]?.[e.column];
        if (typeof value !== 'string') return false;
        return formatDateDE(value) !== null;
      });

      if (dateFormatErrors.length > 0) {
        patterns.push({
          type: 'date_de_format',
          column,
          count: dateFormatErrors.length,
          description: `${dateFormatErrors.length} Datumsangaben im falschen Format (Bindestriche/ISO) → DD.MM.YYYY`,
          canAutoFix: true,
          affectedRows: dateFormatErrors.map(e => e.row),
          suggestedAction: 'Format: DD.MM.YYYY',
        });
        continue;
      }
    }

    // Check for whitespace issues in text columns
    if (colLower.includes('name') || colLower.includes('strasse') || colLower.includes('ort') || colLower.includes('vorname')) {
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
      case 'gender_format':
        newValue = formatGender(String(value));
        break;
      case 'name_format':
        newValue = formatName(String(value));
        break;
      case 'street_format':
        newValue = formatStreet(String(value));
        break;
      case 'iban_format':
        newValue = formatIBAN(String(value));
        break;
      case 'date_format':
        newValue = formatExcelDate(String(value));
        break;
      case 'date_de_format':
        newValue = formatDateDE(String(value));
        break;
      case 'whitespace_trim':
        newValue = trimWhitespace(String(value));
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
