import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { ParsedRow, ValidationError, ColumnDefinition, ColumnStatus } from '@/types/importTypes';

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  fileName: string;
}

// Parse CSV or Excel file
export async function parseFile(file: File): Promise<ParseResult> {
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSV(file);
  } else if (['xlsx', 'xls'].includes(extension || '')) {
    return parseExcel(file);
  } else {
    throw new Error('Nicht unterstütztes Dateiformat. Bitte CSV oder Excel-Datei hochladen.');
  }
}

async function parseCSV(file: File): Promise<ParseResult> {
  const text = await file.text();
  const workbook = XLSX.read(text, { type: 'string', raw: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { header: 1 });
  
  if (data.length === 0) {
    throw new Error('Die Datei ist leer.');
  }

  const firstRow = data[0] as unknown as string[];
  const headers = firstRow.map(h => String(h).trim());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < data.length; i++) {
    const rowData = data[i] as unknown as (string | number | null)[];
    if (rowData && rowData.some && rowData.some(cell => cell !== null && cell !== undefined && cell !== '')) {
      const row: ParsedRow = {};
      headers.forEach((header, idx) => {
        row[header] = rowData[idx] ?? null;
      });
      rows.push(row);
    }
  }

  return { headers, rows, fileName: file.name };
}

async function parseExcel(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { header: 1 });

  if (data.length === 0) {
    throw new Error('Die Datei ist leer.');
  }

  const firstRow = data[0] as unknown as string[];
  const headers = firstRow.map(h => String(h).trim());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < data.length; i++) {
    const rowData = data[i] as unknown as (string | number | null)[];
    if (rowData && rowData.some && rowData.some(cell => cell !== null && cell !== undefined && cell !== '')) {
      const row: ParsedRow = {};
      headers.forEach((header, idx) => {
        row[header] = rowData[idx] ?? null;
      });
      rows.push(row);
    }
  }

  return { headers, rows, fileName: file.name };
}

// Check column status (found, missing, extra)
export function checkColumnStatus(
  sourceHeaders: string[],
  expectedColumns: ColumnDefinition[]
): ColumnStatus[] {
  const statuses: ColumnStatus[] = [];
  const sourceHeadersSet = new Set(sourceHeaders);

  // Check expected columns
  expectedColumns.forEach(col => {
    const found = sourceHeadersSet.has(col.name);
    statuses.push({
      name: col.name,
      status: found ? 'found' : 'missing',
      required: col.required,
      category: col.category,
    });
  });

  // Check for extra columns
  const expectedNames = new Set(expectedColumns.map(c => c.name));
  sourceHeaders.forEach(header => {
    if (!expectedNames.has(header)) {
      statuses.push({
        name: header,
        status: 'extra',
        required: false,
      });
    }
  });

  return statuses;
}

// Fields that should be checked for duplicates (only student-specific unique fields)
// Note: Parent AHVs (P_ERZ1_AHV, P_ERZ2_AHV) are NOT checked because parents with multiple children appear multiple times
const DUPLICATE_CHECK_FIELDS = ['S_AHV', 'S_ID'];

// Validate data
export function validateData(
  rows: ParsedRow[],
  columnDefinitions: ColumnDefinition[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // First pass: collect values for duplicate detection
  const valueOccurrences: Record<string, Map<string, number[]>> = {};
  DUPLICATE_CHECK_FIELDS.forEach(field => {
    valueOccurrences[field] = new Map();
  });

  rows.forEach((row, rowIndex) => {
    DUPLICATE_CHECK_FIELDS.forEach(field => {
      const value = row[field];
      const strValue = String(value ?? '').trim();
      if (strValue && strValue !== '') {
        const existing = valueOccurrences[field].get(strValue) || [];
        existing.push(rowIndex + 1);
        valueOccurrences[field].set(strValue, existing);
      }
    });
  });

  // Find duplicates and add errors
  DUPLICATE_CHECK_FIELDS.forEach(field => {
    valueOccurrences[field].forEach((rowNumbers, value) => {
      if (rowNumbers.length > 1) {
        // Add error for each occurrence except the first
        rowNumbers.slice(1).forEach(rowNum => {
          errors.push({
            row: rowNum,
            column: field,
            value: value,
            message: `Duplikat: "${value}" kommt auch in Zeile ${rowNumbers[0]} vor`,
          });
        });
      }
    });
  });

  // Second pass: field-level validation
  rows.forEach((row, rowIndex) => {
    columnDefinitions.forEach(col => {
      const value = row[col.name];
      const strValue = String(value ?? '').trim();

      // Check required fields
      if (col.required && (value === null || value === undefined || strValue === '')) {
        errors.push({
          row: rowIndex + 1,
          column: col.name,
          value: '',
          message: `Pflichtfeld "${col.name}" ist leer`,
        });
        return;
      }

      // Skip validation if empty and not required
      if (strValue === '') return;

      // Type-specific validation
      switch (col.validationType) {
        case 'date':
          if (!isValidDate(strValue)) {
            errors.push({
              row: rowIndex + 1,
              column: col.name,
              value: strValue,
              message: 'Ungültiges Datumsformat',
            });
          }
          break;
        case 'ahv':
          if (!isValidAHV(strValue)) {
            errors.push({
              row: rowIndex + 1,
              column: col.name,
              value: strValue,
              message: 'Ungültiges AHV-Format (756.XXXX.XXXX.XX)',
            });
          }
          break;
        case 'email':
          if (!isValidEmail(strValue)) {
            errors.push({
              row: rowIndex + 1,
              column: col.name,
              value: strValue,
              message: 'Ungültige E-Mail-Adresse',
            });
          }
          break;
        case 'number':
          if (isNaN(Number(strValue))) {
            errors.push({
              row: rowIndex + 1,
              column: col.name,
              value: strValue,
              message: 'Ungültige Zahl',
            });
          }
          break;
        case 'plz':
          if (!isValidPLZ(strValue)) {
            errors.push({
              row: rowIndex + 1,
              column: col.name,
              value: strValue,
              message: 'Ungültige PLZ (4-5 Ziffern erwartet)',
            });
          }
          break;
        case 'gender':
          if (!isValidGender(strValue)) {
            errors.push({
              row: rowIndex + 1,
              column: col.name,
              value: strValue,
              message: 'Ungültiges Geschlecht (M, W oder D erwartet)',
            });
          }
          break;
        case 'phone':
          if (!isValidPhone(strValue)) {
            errors.push({
              row: rowIndex + 1,
              column: col.name,
              value: strValue,
              message: 'Ungültiges Telefonformat',
            });
          }
          break;
      }
    });
  });

  return errors;
}

function isValidDate(value: string): boolean {
  // Accept various date formats and Excel serial numbers
  const patterns = [
    /^\d{2}\.\d{2}\.\d{4}$/, // DD.MM.YYYY
    /^\d{4}-\d{2}-\d{2}$/,   // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
    /^\d+$/,                  // Excel serial number
  ];
  return patterns.some(p => p.test(value)) || !isNaN(Date.parse(value));
}

function isValidAHV(value: string): boolean {
  // Swiss AHV number format: 756.XXXX.XXXX.XX
  const pattern = /^756\.\d{4}\.\d{4}\.\d{2}$/;
  return pattern.test(value);
}

function isValidEmail(value: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(value);
}

function isValidPLZ(value: string): boolean {
  // Accept 4-5 digit postal codes (CH: 4 digits, DE/AT: 5 digits)
  const pattern = /^\d{4,5}$/;
  return pattern.test(value.replace(/\s/g, ''));
}

function isValidGender(value: string): boolean {
  // Accept M, W, D (case-insensitive) and common variations
  const normalized = value.toUpperCase().trim();
  const validValues = ['M', 'W', 'D', 'MÄNNLICH', 'WEIBLICH', 'DIVERS', 'MALE', 'FEMALE', 'DIVERSE'];
  return validValues.includes(normalized);
}

function isValidPhone(value: string): boolean {
  // Remove all whitespace, dashes, parentheses for validation
  const cleaned = value.replace(/[\s\-\(\)\.\/]/g, '');
  
  // International format patterns (E.164 and common variations)
  const patterns = [
    /^\+\d{7,15}$/,           // +41791234567 (E.164)
    /^00\d{7,15}$/,           // 0041791234567
    /^0\d{8,10}$/,            // 0791234567 (national format)
    /^\d{10,11}$/,            // 0791234567 without leading 0 check
  ];
  
  return patterns.some(p => p.test(cleaned));
}

// Apply corrections to rows
export function applyCorrectedValues(
  rows: ParsedRow[],
  errors: ValidationError[]
): ParsedRow[] {
  const correctedRows = rows.map(row => ({ ...row }));
  
  errors.forEach(error => {
    if (error.correctedValue !== undefined) {
      const rowIndex = error.row - 1;
      if (correctedRows[rowIndex]) {
        correctedRows[rowIndex][error.column] = error.correctedValue;
      }
    }
  });

  return correctedRows;
}

// Export to CSV - keeps original column names
export function exportToCSV(
  rows: ParsedRow[],
  headers: string[],
  importType: string,
  options: {
    onlyErrorFree?: boolean;
    errors?: ValidationError[];
    removeExtraColumns?: boolean;
    expectedColumns?: string[];
  } = {}
): void {
  const { onlyErrorFree = false, errors = [], removeExtraColumns = false, expectedColumns = [] } = options;

  // Filter rows if onlyErrorFree
  let exportRows = rows;
  if (onlyErrorFree && errors.length > 0) {
    const errorRows = new Set(errors.filter(e => !e.correctedValue).map(e => e.row));
    exportRows = rows.filter((_, idx) => !errorRows.has(idx + 1));
  }

  // Determine which headers to use
  let exportHeaders = headers;
  if (removeExtraColumns && expectedColumns.length > 0) {
    const expectedSet = new Set(expectedColumns);
    exportHeaders = headers.filter(h => expectedSet.has(h));
  }

  // Create data rows
  const data = exportRows.map(row => {
    return exportHeaders.map(header => {
      const value = row[header];
      return value !== null && value !== undefined ? String(value) : '';
    });
  });

  // Create workbook
  const ws = XLSX.utils.aoa_to_sheet([exportHeaders, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daten');

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${importType}_${date}_bereinigt.csv`;

  // Export with UTF-8 BOM for Excel compatibility
  const csvContent = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, fileName);
}

// Export to Excel - keeps original column names
export function exportToExcel(
  rows: ParsedRow[],
  headers: string[],
  importType: string,
  options: {
    onlyErrorFree?: boolean;
    errors?: ValidationError[];
    removeExtraColumns?: boolean;
    expectedColumns?: string[];
  } = {}
): void {
  const { onlyErrorFree = false, errors = [], removeExtraColumns = false, expectedColumns = [] } = options;

  // Filter rows if onlyErrorFree
  let exportRows = rows;
  if (onlyErrorFree && errors.length > 0) {
    const errorRows = new Set(errors.filter(e => !e.correctedValue).map(e => e.row));
    exportRows = rows.filter((_, idx) => !errorRows.has(idx + 1));
  }

  // Determine which headers to use
  let exportHeaders = headers;
  if (removeExtraColumns && expectedColumns.length > 0) {
    const expectedSet = new Set(expectedColumns);
    exportHeaders = headers.filter(h => expectedSet.has(h));
  }

  // Create data rows
  const data = exportRows.map(row => {
    return exportHeaders.map(header => {
      const value = row[header];
      return value !== null && value !== undefined ? String(value) : '';
    });
  });

  // Create workbook
  const ws = XLSX.utils.aoa_to_sheet([exportHeaders, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daten');

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${importType}_${date}_bereinigt.xlsx`;

  // Export
  XLSX.writeFile(wb, fileName);
}
