import ExcelJS from 'exceljs';
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
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    throw new Error('Die Datei ist leer.');
  }

  // Detect delimiter (semicolon or comma)
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  
  // Parse CSV with proper handling of quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowData = parseCSVLine(lines[i]);
    if (rowData.some(cell => cell !== null && cell !== undefined && cell !== '')) {
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
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    throw new Error('Die Datei ist leer.');
  }

  const headers: string[] = [];
  const rows: ParsedRow[] = [];
  
  // Get headers from first row
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim();
  });

  // Filter out empty trailing headers
  while (headers.length > 0 && headers[headers.length - 1] === '') {
    headers.pop();
  }

  // Get data rows
  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
    const row = worksheet.getRow(rowIndex);
    const rowData: (string | number | null)[] = [];
    let hasData = false;
    
    for (let colIndex = 1; colIndex <= headers.length; colIndex++) {
      const cell = row.getCell(colIndex);
      let value: string | number | null = null;
      
      if (cell.value !== null && cell.value !== undefined) {
        // Handle different cell types
        if (cell.type === ExcelJS.ValueType.Date && cell.value instanceof Date) {
          // Format date as DD.MM.YYYY
          const date = cell.value;
          value = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
        } else if (typeof cell.value === 'object' && 'result' in cell.value) {
          // Formula cell - use the result
          value = cell.value.result as string | number;
        } else if (typeof cell.value === 'object' && 'richText' in cell.value) {
          // Rich text - concatenate text parts
          value = (cell.value.richText as Array<{text: string}>).map(rt => rt.text).join('');
        } else {
          value = typeof cell.value === 'number' ? cell.value : String(cell.value);
        }
        hasData = true;
      }
      rowData.push(value);
    }
    
    if (hasData) {
      const parsedRow: ParsedRow = {};
      headers.forEach((header, idx) => {
        parsedRow[header] = rowData[idx] ?? null;
      });
      rows.push(parsedRow);
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

// Fields that should be checked for duplicates
const DUPLICATE_CHECK_FIELDS = ['S_AHV', 'S_ID', 'L_KL1_AHV'];

// Configuration for parent ID consistency checks (Eltern-ID Konsistenzprüfung)
const PARENT_CONSISTENCY_CHECKS = [
  {
    idField: 'P_ERZ1_ID',
    ahvField: 'P_ERZ1_AHV',
    nameField: 'P_ERZ1_Name',
    vornameField: 'P_ERZ1_Vorname',
    strasseField: 'P_ERZ1_Strasse',
    label: 'Erziehungsberechtigte/r 1'
  },
  {
    idField: 'P_ERZ2_ID',
    ahvField: 'P_ERZ2_AHV',
    nameField: 'P_ERZ2_Name',
    vornameField: 'P_ERZ2_Vorname',
    strasseField: 'P_ERZ2_Strasse',
    label: 'Erziehungsberechtigte/r 2'
  }
];

// Normalize string by removing diacritical marks for comparison
function normalizeForComparison(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Count diacritical marks in a string (more = "richer")
function countDiacritics(value: string): number {
  const nfd = value.normalize('NFD');
  const stripped = nfd.replace(/[\u0300-\u036f]/g, '');
  return nfd.length - stripped.length;
}

// Name fields to check for diacritic inconsistencies
const DIACRITIC_NAME_FIELDS = [
  'S_Name', 'S_Vorname',
  'P_ERZ1_Name', 'P_ERZ1_Vorname',
  'P_ERZ2_Name', 'P_ERZ2_Vorname',
  'L_KL1_Name', 'L_KL1_Vorname',
];

// Check for names that match when normalized but differ by diacritics,
// and auto-correct to the version with more diacritical marks
function checkDiacriticNameInconsistencies(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of DIACRITIC_NAME_FIELDS) {
    // Group values by their normalized form
    const normalizedGroups = new Map<string, { original: string; rows: number[] }[]>();

    for (let i = 0; i < rows.length; i++) {
      const raw = String(rows[i][field] ?? '').trim();
      if (!raw) continue;
      const normalized = normalizeForComparison(raw);
      
      const group = normalizedGroups.get(normalized);
      if (group) {
        // Check if this exact original form already exists
        const existing = group.find(g => g.original === raw);
        if (existing) {
          existing.rows.push(i);
        } else {
          group.push({ original: raw, rows: [i] });
        }
      } else {
        normalizedGroups.set(normalized, [{ original: raw, rows: [i] }]);
      }
    }

    // For groups with multiple different original forms, pick the richest
    normalizedGroups.forEach(variants => {
      if (variants.length <= 1) return; // All identical

      // Find the variant with the most diacritics
      let best = variants[0];
      for (const v of variants) {
        if (countDiacritics(v.original) > countDiacritics(best.original)) {
          best = v;
        }
      }

      // Create corrections for all rows that don't have the best version
      for (const variant of variants) {
        if (variant.original === best.original) continue;
        for (const rowIndex of variant.rows) {
          errors.push({
            row: rowIndex + 1,
            column: field,
            value: variant.original,
            message: `Diakritische Korrektur: "${variant.original}" → "${best.original}"`,
            correctedValue: best.original,
            severity: 'warning',
          });
        }
      }
    });
  }

  return errors;
}

// Optimized: Check parent ID consistency - same parent should have same ID across all rows
// Uses a UNIFIED pool across ERZ1 and ERZ2 so cross-slot inconsistencies are detected
function checkParentIdConsistency(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const errorSet = new Set<string>(); // Avoid duplicate error messages

  // Single unified pool across all ERZ slots
  const parentMapByAhv = new Map<string, { id: string; firstRow: number; identifier: string; slotLabel: string }>();
  const parentMapByNameStrasse = new Map<string, { id: string; firstRow: number; identifier: string; slotLabel: string }>();
  const parentMapByNameOnly = new Map<string, { id: string; firstRow: number; identifier: string; slotLabel: string }>();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    for (const check of PARENT_CONSISTENCY_CHECKS) {
      const id = String(row[check.idField] ?? '').trim();
      const ahv = String(row[check.ahvField] ?? '').trim();
      const name = String(row[check.nameField] ?? '').trim();
      const vorname = String(row[check.vornameField] ?? '').trim();
      const strasse = String(row[check.strasseField] ?? '').trim();

      if (!id) continue;
      if (!ahv && (!name || !vorname)) continue;

      const addError = (
        map: Map<string, { id: string; firstRow: number; identifier: string; slotLabel: string }>,
        key: string,
        displayIdentifier: string
      ) => {
        const existing = map.get(key);
        
        if (existing) {
          if (existing.id !== id) {
            const errorKey = `${rowIndex + 1}:${check.idField}:${displayIdentifier}`;
            if (!errorSet.has(errorKey)) {
              errorSet.add(errorKey);
              errors.push({
                row: rowIndex + 1,
                column: check.idField,
                value: id,
                message: `Inkonsistente ID: Elternteil (${displayIdentifier}) hat in Zeile ${existing.firstRow} (${existing.slotLabel}) die ID '${existing.id}', aber hier (${check.label}) die ID '${id}'`,
              });
            }
          }
        } else {
          map.set(key, { id, firstRow: rowIndex + 1, identifier: displayIdentifier, slotLabel: check.label });
        }
      };

      // Strategy 1: AHV (most reliable)
      if (ahv) {
        addError(parentMapByAhv, `AHV:${ahv}`, `AHV: ${ahv}`);
      }

      // Strategy 2: Name + Vorname + Strasse (with diacritic normalization)
      if (name && vorname && strasse) {
        const key = `NAME_STRASSE:${normalizeForComparison(name)}|${normalizeForComparison(vorname)}|${normalizeForComparison(strasse)}`;
        addError(parentMapByNameStrasse, key, `${vorname} ${name}, ${strasse}`);
      }

      // Strategy 3: Name + Vorname only (with diacritic normalization)
      if (name && vorname) {
        const key = `NAME:${normalizeForComparison(name)}|${normalizeForComparison(vorname)}`;
        addError(parentMapByNameOnly, key, `${vorname} ${name}`);
      }
    }
  }

  return errors;
}

// Validate data - Optimized for large datasets (4000+ rows)
export function validateData(
  rows: ParsedRow[],
  columnDefinitions: ColumnDefinition[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const rowCount = rows.length;

  // Build column lookup maps for O(1) access
  const columnDefMap = new Map<string, ColumnDefinition>();
  for (const col of columnDefinitions) {
    columnDefMap.set(col.name, col);
  }

  // First pass: collect values for duplicate detection using Maps
  const valueOccurrences = new Map<string, Map<string, number[]>>();
  for (const field of DUPLICATE_CHECK_FIELDS) {
    valueOccurrences.set(field, new Map());
  }

  // Single pass for both duplicate collection and field validation
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const row = rows[rowIndex];
    const rowNum = rowIndex + 1;

    // Collect duplicates for specified fields
    for (const field of DUPLICATE_CHECK_FIELDS) {
      const value = row[field];
      const strValue = String(value ?? '').trim();
      if (strValue !== '') {
        const fieldMap = valueOccurrences.get(field)!;
        const existing = fieldMap.get(strValue);
        if (existing) {
          existing.push(rowNum);
        } else {
          fieldMap.set(strValue, [rowNum]);
        }
      }
    }

    // Field-level validation
    for (const col of columnDefinitions) {
      const value = row[col.name];
      const strValue = String(value ?? '').trim();

      // Check required fields
      if (col.required && (value === null || value === undefined || strValue === '')) {
        errors.push({
          row: rowNum,
          column: col.name,
          value: '',
          message: `Pflichtfeld "${col.name}" ist leer`,
        });
        continue;
      }

      // Skip validation if empty and not required
      if (strValue === '') continue;

      // Type-specific validation
      const validationError = validateFieldType(col.validationType, strValue, rowNum, col.name);
      if (validationError) {
        errors.push(validationError);
      }
    }
  }

  // Process duplicates
  for (const field of DUPLICATE_CHECK_FIELDS) {
    const fieldMap = valueOccurrences.get(field)!;
    fieldMap.forEach((rowNumbers, value) => {
      if (rowNumbers.length > 1) {
        // Add error for each occurrence except the first
        for (let i = 1; i < rowNumbers.length; i++) {
          errors.push({
            row: rowNumbers[i],
            column: field,
            value: value,
            message: `Duplikat: "${value}" kommt auch in Zeile ${rowNumbers[0]} vor`,
          });
        }
      }
    });
  }

  // Check parent ID consistency
  const parentIdErrors = checkParentIdConsistency(rows);
  errors.push(...parentIdErrors);

  // Check diacritic name inconsistencies and auto-correct
  const diacriticErrors = checkDiacriticNameInconsistencies(rows);
  errors.push(...diacriticErrors);

  return errors;
}

// Optimized field type validation
function validateFieldType(
  validationType: string | undefined,
  value: string,
  rowNum: number,
  columnName: string
): ValidationError | null {
  switch (validationType) {
    case 'date':
      if (!isValidDate(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültiges Datumsformat' };
      }
      break;
    case 'ahv':
      if (!isValidAHV(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültiges AHV-Format (756.XXXX.XXXX.XX)' };
      }
      break;
    case 'email':
      if (!isValidEmail(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültige E-Mail-Adresse' };
      }
      break;
    case 'number':
      if (isNaN(Number(value))) {
        return { row: rowNum, column: columnName, value, message: 'Ungültige Zahl' };
      }
      break;
    case 'plz':
      if (!isValidPLZ(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültige PLZ (4-5 Ziffern erwartet)' };
      }
      break;
    case 'gender':
      if (!isValidGender(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültiges Geschlecht (M, W oder D erwartet)' };
      }
      break;
    case 'phone':
      if (!isValidPhone(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültiges Telefonformat' };
      }
      break;
  }
  return null;
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

  // Build CSV content with semicolon delimiter for Excel compatibility
  const escapeCSVValue = (val: string): string => {
    if (val.includes('"') || val.includes(';') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvLines: string[] = [];
  csvLines.push(exportHeaders.map(escapeCSVValue).join(';'));
  
  exportRows.forEach(row => {
    const values = exportHeaders.map(header => {
      const value = row[header];
      return escapeCSVValue(value !== null && value !== undefined ? String(value) : '');
    });
    csvLines.push(values.join(';'));
  });

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${importType}_${date}_bereinigt.csv`;

  // Export with UTF-8 BOM for Excel compatibility
  const csvContent = csvLines.join('\r\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, fileName);
}

// Export to Excel - keeps original column names
export async function exportToExcel(
  rows: ParsedRow[],
  headers: string[],
  importType: string,
  options: {
    onlyErrorFree?: boolean;
    errors?: ValidationError[];
    removeExtraColumns?: boolean;
    expectedColumns?: string[];
  } = {}
): Promise<void> {
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

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Daten');

  // Add header row
  worksheet.addRow(exportHeaders);

  // Add data rows
  exportRows.forEach(row => {
    const values = exportHeaders.map(header => {
      const value = row[header];
      return value !== null && value !== undefined ? String(value) : '';
    });
    worksheet.addRow(values);
  });

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${importType}_${date}_bereinigt.xlsx`;

  // Export
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, fileName);
}
